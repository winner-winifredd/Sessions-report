"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarRange, DollarSign, FileSpreadsheet, User } from "lucide-react";
import type { SessionReportRow } from "@/app/types";

interface ProviderRateConfig {
  providerName: string;
  intakeRate: number;
  followupRate: number;
  noShowLateCancelRate: number;
  providerNoShowPenalty: number;
  incentiveBonusPerPeriod?: number;
}

interface ProviderTimeCardSummary {
  providerName: string;
  intakeCount: number;
  followupCount: number;
  billableNoShowLateCancelCount: number;
  missingOrIncompleteCount: number;
  totalBillableAppointments: number;
  providerNoShowPenaltyCount: number;
  totalEarnings?: number;
}

function getProviderRateConfig(
  providerName: string,
  rates: ProviderRateConfig[],
): ProviderRateConfig | undefined {
  return rates.find(
    (cfg) => cfg.providerName.toLowerCase().trim() === providerName.toLowerCase().trim(),
  );
}

type UiCptAuditStatus = "ok" | "missingTiming" | "missingCpt" | "incorrectForTime";

interface UiCptAuditResult {
  status: UiCptAuditStatus;
  message: string;
}

function parseMinutes(raw: string): number {
  if (!raw) return 0;
  const trimmed = raw.toString().trim();
  const match = trimmed.match(/(\d+)(?:(?:\s*min)|$)/i);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) || 0;
}

const CPT_RULES: Record<string, { minTotalMinutes: number; minTherapyMinutes: number }> = {
  // Known explicit rule from transcript:
  // 99214 + 90833 follow-up combo: at least 30 total, 16 therapy.
  "99214/90833": { minTotalMinutes: 30, minTherapyMinutes: 16 },
  // TODO: extend with your full CPT timing matrix, e.g.:
  // "99213": { minTotalMinutes: 15, minTherapyMinutes: 0 },
  // "90834": { minTotalMinutes: 45, minTherapyMinutes: 38 },
};

function computeUiCptAudit(row: SessionReportRow): UiCptAuditResult {
  const cpt1 = (row.cptCode1 || "").trim();
  const cpt2 = (row.cptCode2 || "").trim();
  const hasCpt = !!(cpt1 || cpt2);

  const totalMinutes = parseMinutes(row.duration || "");
  const therapyMinutes = parseMinutes(row.therapyTime || "");

  if (!hasCpt) {
    return {
      status: "missingCpt",
      message: "Missing CPT code",
    };
  }

  if (!totalMinutes || !therapyMinutes) {
    return {
      status: "missingTiming",
      message: "Missing total and/or therapy time",
    };
  }

  const key = `${cpt1}/${cpt2}`;
  const rule = CPT_RULES[key];
  if (rule) {
    if (totalMinutes < rule.minTotalMinutes || therapyMinutes < rule.minTherapyMinutes) {
      return {
        status: "incorrectForTime",
        message: `Time too low for ${key}`,
      };
    }
  }

  return {
    status: "ok",
    message: "Timing consistent with CPT",
  };
}

function rowHasUiBlockingIssue(row: SessionReportRow): boolean {
  const audit = computeUiCptAudit(row);
  const timecardFmt = (row.timecardCptFormat || "").toLowerCase();
  const hasMissingFmt = timecardFmt.includes("missing") || timecardFmt.includes("incomplete");
  const hasAuditIssue = !!(row.missingNotesAuditStatus || "").trim();
  const apptTypeRaw = (row.apptType || "").toLowerCase().trim();
  const isNoShow = apptTypeRaw === "no show";
  const isLateCancel = apptTypeRaw === "late cancel";
  const unsignedNoShow =
    (isNoShow || isLateCancel) && !(row.providerNoShowAttestation || "").trim();

  return hasMissingFmt || hasAuditIssue || unsignedNoShow || audit.status !== "ok";
}

function computeAppointmentKeyFromNames(
  dateOfSession: string,
  providerName: string,
  patientNameSource: string,
): string {
  const date = (dateOfSession || "").trim();
  const provider = (providerName || "").trim();
  let patient = (patientNameSource || "").trim();

  // Strip any bracketed middle content: "Gen [middle name] Marissa" -> "Gen  Marissa"
  patient = patient.replace(/\[[^[\]]*\]/g, " ").replace(/\s+/g, " ").trim();

  const parts = patient.split(" ").filter(Boolean);
  let lastName = "";
  let firstName = "";
  if (parts.length === 1) {
    lastName = parts[0];
  } else if (parts.length >= 2) {
    lastName = parts[0];
    firstName = parts[parts.length - 1];
  }

  return [date, provider, lastName && firstName ? `${lastName}_${firstName}` : lastName]
    .filter(Boolean)
    .join("_");
}

function deriveDurationFromStartEnd(row: SessionReportRow): number | null {
  const start = (row.startTime || "").trim();
  const end = (row.startTime || row.duration ? row.duration : row.startTime).trim();
  // If we don't have explicit start/end columns populated as real times, skip.
  const startStr = (row.startTime || "").trim();
  const endStr = (row.duration || "").trim();
  if (!startStr || !endStr) return null;
  const baseDate = "2000-01-01";
  const dStart = new Date(`${baseDate}T${startStr}`);
  const dEnd = new Date(`${baseDate}T${endStr}`);
  if (Number.isNaN(dStart.getTime()) || Number.isNaN(dEnd.getTime())) return null;
  const diffMs = dEnd.getTime() - dStart.getTime();
  if (diffMs <= 0) return null;
  return Math.round(diffMs / 60000);
}

function computeRowPay(row: SessionReportRow, rates: ProviderRateConfig | undefined): number {
  if (!rates) return 0;
  if (rowHasUiBlockingIssue(row)) return 0;

  const apptRaw = (row.timecardApptType || row.apptType || "").toLowerCase().trim();
  const apptTypeRaw = (row.apptType || "").toLowerCase().trim();
  const isIntake = apptRaw.includes("intake") || apptRaw.includes("new");
  const isFollowup = apptRaw.includes("existing") || apptRaw.includes("follow");
  const isNoShow = apptTypeRaw === "no show";
  const isLateCancel = apptTypeRaw === "late cancel";
  const nsAction = (row.noShowLateCancellationAction || "").toLowerCase();
  const isBillableNoShowLateCancel =
    (isNoShow || isLateCancel) && nsAction.includes("charge");
  const providerNoShow =
    apptTypeRaw === "provider no show" || apptTypeRaw === "provider no-show";

  let pay = 0;
  if (isIntake) pay += rates.intakeRate;
  if (isFollowup) pay += rates.followupRate;
  if (isBillableNoShowLateCancel) pay += rates.noShowLateCancelRate;
  if (providerNoShow) pay -= rates.providerNoShowPenalty;
  return pay;
}

function getPaymentPeriodKey(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const periodLabel = day <= 15 ? "1–15" : "16–EOM";
  return `${year}-${String(month).padStart(2, "0")} (${periodLabel})`;
}

function buildProviderTimeCardSummaries(
  rows: SessionReportRow[],
  rates: ProviderRateConfig[],
): ProviderTimeCardSummary[] {
  const byProvider = new Map<string, ProviderTimeCardSummary>();

  for (const row of rows) {
    const provider = (row.providerName || "").trim();
    if (!provider) continue;

    const isFinal = String(row.finalRowFlag || "").toLowerCase() === "true";
    if (!isFinal) continue;

    const apptRaw = (row.timecardApptType || row.apptType || "").toLowerCase().trim();
    const apptTypeRaw = (row.apptType || "").toLowerCase().trim();
    const isIntake = apptRaw.includes("intake") || apptRaw.includes("new");
    const isFollowup = apptRaw.includes("existing") || apptRaw.includes("follow");
    const isNoShow = apptTypeRaw === "no show";
    const isLateCancel = apptTypeRaw === "late cancel";

    const blocking = rowHasUiBlockingIssue(row);

    const nsAction = (row.noShowLateCancellationAction || "").toLowerCase();
    const isBillableNoShowLateCancel =
      (isNoShow || isLateCancel) && nsAction.includes("charge") && !blocking;

    const providerNoShow =
      apptTypeRaw === "provider no show" || apptTypeRaw === "provider no-show";

    let summary = byProvider.get(provider);
    if (!summary) {
      summary = {
        providerName: provider,
        intakeCount: 0,
        followupCount: 0,
        billableNoShowLateCancelCount: 0,
        missingOrIncompleteCount: 0,
        totalBillableAppointments: 0,
        providerNoShowPenaltyCount: 0,
        totalEarnings: undefined,
      };
      byProvider.set(provider, summary);
    }

    if (isIntake) summary.intakeCount += 1;
    if (isFollowup) summary.followupCount += 1;
    if (isBillableNoShowLateCancel) summary.billableNoShowLateCancelCount += 1;
    if (blocking) summary.missingOrIncompleteCount += 1;
    if (providerNoShow) summary.providerNoShowPenaltyCount += 1;
  }

  Array.from(byProvider.values()).forEach((summary) => {
    const baseBillable =
      summary.intakeCount + summary.followupCount + summary.billableNoShowLateCancelCount;
    summary.totalBillableAppointments = Math.max(
      0,
      baseBillable - summary.missingOrIncompleteCount,
    );

    const rateConfig = getProviderRateConfig(summary.providerName, rates);
    if (rateConfig) {
      const earnings =
        summary.intakeCount * rateConfig.intakeRate +
        summary.followupCount * rateConfig.followupRate +
        summary.billableNoShowLateCancelCount * rateConfig.noShowLateCancelRate -
        summary.providerNoShowPenaltyCount * rateConfig.providerNoShowPenalty +
        (rateConfig.incentiveBonusPerPeriod || 0);
      summary.totalEarnings = earnings;
    }
  });

  return Array.from(byProvider.values()).sort((a, b) =>
    a.providerName.localeCompare(b.providerName),
  );
}

interface SheetsApiResponse {
  rows: SessionReportRow[];
  firstDataRow: number;
  lastUpdated: string;
  error?: string;
}

export default function ProviderTimeCardsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SessionReportRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payPeriodFilter, setPayPeriodFilter] = useState<string>("all");
  const [providerSearch, setProviderSearch] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerRates, setProviderRates] = useState<ProviderRateConfig[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/sheets", {
          method: "GET",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data: SheetsApiResponse = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setRows(data.rows || []);
        setLastUpdated(data.lastUpdated || null);

        const ratesRes = await fetch("/api/sheets/rates", { cache: "no-store" });
        if (ratesRes.ok) {
          const ratesData = await ratesRes.json();
          setProviderRates(ratesData.rates || []);
        } else {
          setProviderRates([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setRows([]);
        setProviderRates([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const payPeriodOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const key = getPaymentPeriodKey(r.dateOfSession);
      if (key) set.add(key);
    });
    return Array.from(set).sort();
  }, [rows]);

  const rowsForTimeCards = useMemo(
    () =>
      payPeriodFilter === "all"
        ? rows
        : rows.filter(
            (r) => getPaymentPeriodKey(r.dateOfSession) === payPeriodFilter,
          ),
    [rows, payPeriodFilter],
  );

  const providerSummaries = useMemo(
    () => buildProviderTimeCardSummaries(rowsForTimeCards, providerRates),
    [rowsForTimeCards, providerRates],
  );

  const filteredProviders = useMemo(
    () =>
      providerSearch.trim()
        ? providerSummaries.filter((p) =>
            p.providerName.toLowerCase().includes(providerSearch.toLowerCase()),
          )
        : providerSummaries,
    [providerSummaries, providerSearch],
  );

  const totalEarningsR1 = useMemo(
    () =>
      filteredProviders.reduce(
        (sum, p) => sum + (typeof p.totalEarnings === "number" ? p.totalEarnings : 0),
        0,
      ),
    [filteredProviders],
  );

  const selectedProviderRows = useMemo(() => {
    if (!selectedProvider) return [];
    return rowsForTimeCards.filter(
      (r) =>
        (r.providerName || "").trim().toLowerCase() ===
          selectedProvider.trim().toLowerCase() &&
        String(r.finalRowFlag || "").toLowerCase() === "true",
    );
  }, [rowsForTimeCards, selectedProvider]);

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100">
      <header className="border-b border-slate-800 bg-[#05070b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                  Provider Time Cards
                </h1>
                <p className="text-xs text-slate-400">
                  Earnings, penalties, and billable counts by pay period.
                </p>
              </div>
            </div>
          </div>
          {lastUpdated && (
            <div className="hidden text-xs text-slate-400 sm:block">
              Last sheet sync: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">Pay period</span>
              <select
                value={payPeriodFilter}
                onChange={(e) => setPayPeriodFilter(e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
              >
                <option value="all">All</option>
                {payPeriodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
              <User className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={providerSearch}
                onChange={(e) => setProviderSearch(e.target.value)}
                placeholder="Filter providers..."
                className="w-40 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span>
              Total pay (Cell R1, filtered providers):{" "}
              {typeof totalEarningsR1 === "number" && totalEarningsR1 > 0
                ? `$${totalEarningsR1.toFixed(2)}`
                : "— (no rate sheets configured)"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 py-20 text-slate-400">
            Loading time cards…
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 py-20 text-center text-slate-400">
            No providers found for this filter.
          </div>
        ) : (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              {filteredProviders.map((p) => (
                <div
                  key={p.providerName}
                  className={
                    "cursor-pointer rounded-xl border p-4 transition " +
                    (selectedProvider &&
                    selectedProvider.trim().toLowerCase() ===
                      p.providerName.trim().toLowerCase()
                      ? "border-sky-400 bg-slate-900/70"
                      : "border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/60")
                  }
                  onClick={() => setSelectedProvider(p.providerName)}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-100">
                        {p.providerName}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Intakes {p.intakeCount} · Follow-ups {p.followupCount} ·
                        Billable NS/LC {p.billableNoShowLateCancelCount}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>Total billable appts</div>
                      <div className="text-lg font-semibold text-emerald-400">
                        {p.totalBillableAppointments}
                      </div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                    <div>
                      <dt className="text-slate-500">Missing / incomplete</dt>
                      <dd className="text-sm font-semibold text-amber-300">
                        {p.missingOrIncompleteCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Provider no-show count</dt>
                      <dd className="text-sm font-semibold text-red-300">
                        {p.providerNoShowPenaltyCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Billable no-shows / late cancels</dt>
                      <dd className="text-sm font-semibold text-sky-300">
                        {p.billableNoShowLateCancelCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Total pay (Cell R1)</dt>
                      <dd className="text-sm font-semibold text-emerald-300">
                        {typeof p.totalEarnings === "number"
                          ? `$${p.totalEarnings.toFixed(2)}`
                          : "— (no rate sheet)"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {selectedProvider && (
              <section className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-100">
                    Appointments for {selectedProvider}
                  </h2>
                  <button
                    onClick={() => setSelectedProvider(null)}
                    className="text-xs text-slate-400 underline-offset-2 hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40">
                  <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full min-w-[1100px] text-left text-[11px]">
                      <thead className="border-b border-slate-800 bg-slate-900/80">
                        <tr>
                          <th className="min-w-[90px] shrink-0 px-3 py-1 text-slate-300 whitespace-nowrap">Date</th>
                          <th className="min-w-[160px] shrink-0 px-3 py-1 text-slate-300 whitespace-nowrap">Appointment key</th>
                          <th className="min-w-[100px] shrink-0 px-3 py-1 text-slate-300 whitespace-nowrap">Patient</th>
                          <th className="min-w-[90px] shrink-0 px-3 py-1 text-slate-300 whitespace-nowrap">Appt type</th>
                          <th className="min-w-[80px] shrink-0 px-3 py-1 text-slate-300 whitespace-nowrap">CPT</th>
                          <th className="min-w-[100px] shrink-0 px-3 py-1 text-slate-300 whitespace-nowrap">Time (min)</th>
                          <th className="min-w-[140px] shrink-0 px-3 py-1 text-slate-300 whitespace-nowrap">Audit / status</th>
                          <th className="min-w-[80px] shrink-0 px-3 py-1 text-slate-300 whitespace-nowrap">Billed?</th>
                          <th className="min-w-[100px] shrink-0 px-3 py-1 text-right text-slate-300 whitespace-nowrap">
                            Per-appointment pay
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProviderRows.map((r) => {
                          const computedKey = computeAppointmentKeyFromNames(
                            r.dateOfSession,
                            r.providerName,
                            r.patientNameDup || r.patientName,
                          );
                          const audit = computeUiCptAudit(r);
                          const blocked = rowHasUiBlockingIssue(r);
                          const explicitDuration = parseMinutes(r.duration || "");
                          const derivedDuration = deriveDurationFromStartEnd(r);
                          const rates = getProviderRateConfig(r.providerName || "", providerRates);
                          const rowPay = computeRowPay(r, rates);

                          return (
                            <tr
                              key={`${r.appointmentKey}-${r.runAttempt}`}
                              className="border-b border-slate-800/80"
                            >
                              <td className="min-w-[90px] shrink-0 overflow-visible px-3 py-1 align-middle text-slate-200 whitespace-nowrap">
                                {r.dateOfSession || "—"}
                              </td>
                              <td className="min-w-[160px] shrink-0 overflow-visible px-3 py-1 align-middle text-slate-200 whitespace-nowrap">
                                <div className="text-[11px] text-slate-100">{r.appointmentKey || "—"}</div>
                                <div className="text-[10px] text-slate-500">Recomputed: {computedKey || "—"}</div>
                              </td>
                              <td className="min-w-[100px] shrink-0 overflow-visible px-3 py-1 align-middle text-slate-200 whitespace-nowrap">
                                <div>{r.patientInitials || r.patientName || "—"}</div>
                                <div className="text-[10px] text-slate-500">{r.patientState || ""}</div>
                              </td>
                              <td className="min-w-[90px] shrink-0 overflow-visible px-3 py-1 align-middle text-slate-200 whitespace-nowrap">
                                {r.apptType || "—"}
                              </td>
                              <td className="min-w-[80px] shrink-0 overflow-visible px-3 py-1 align-middle text-slate-200 whitespace-nowrap">
                                <div>{r.cptCode1 || "—"}</div>
                                <div className="text-[10px] text-slate-400">{r.cptCode2 || ""}</div>
                              </td>
                              <td className="min-w-[100px] shrink-0 overflow-visible px-3 py-1 align-middle text-slate-200 whitespace-nowrap">
                                <div className="text-[11px]">
                                  Duration:{" "}
                                  {explicitDuration ? `${explicitDuration} min` : "—"}
                                </div>
                                <div className="text-[11px]">
                                  Therapy:{" "}
                                  {parseMinutes(r.therapyTime || "")
                                    ? `${parseMinutes(r.therapyTime || "")} min`
                                    : "—"}
                                </div>
                                {derivedDuration !== null && (
                                  <div className="text-[10px] text-slate-400">
                                    From start/end: {derivedDuration} min
                                    {explicitDuration &&
                                      derivedDuration !== explicitDuration && " (mismatch)"}
                                  </div>
                                )}
                              </td>
                              <td className="min-w-[140px] shrink-0 overflow-visible px-3 py-1 align-middle whitespace-nowrap">
                                <div
                                  className={
                                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                    (audit.status === "ok"
                                      ? "bg-emerald-900/60 text-emerald-200"
                                      : "bg-red-950/70 text-red-200")
                                  }
                                >
                                  {audit.status === "ok"
                                    ? "OK (CPT vs time)"
                                    : audit.message}
                                </div>
                                {r.missingNotesAuditStatus && (
                                  <div className="mt-1 text-[10px] text-amber-300">
                                    Sheet: {r.missingNotesAuditStatus}
                                  </div>
                                )}
                              </td>
                              <td className="min-w-[80px] shrink-0 overflow-visible px-3 py-1 align-middle text-slate-200 whitespace-nowrap">
                                {blocked ? (
                                  <span className="text-[10px] text-red-300">
                                    Blocked — fix note/attestation/CPT
                                  </span>
                                ) : (
                                  r.billed || "—"
                                )}
                              </td>
                              <td className="min-w-[100px] shrink-0 overflow-visible px-3 py-1 align-middle text-right text-slate-200 whitespace-nowrap">
                                {rates
                                  ? `$${rowPay.toFixed(2)}`
                                  : "— (no rate sheet)"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Time card metrics are computed from the same session report sheet used on the main
          dashboard. Missing notes, CPT/timing mismatches, and unsigned no-shows reduce the
          billable count and block pay until resolved.
        </p>
      </main>
    </div>
  );
}

