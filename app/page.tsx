"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  RefreshCw,
  Filter,
  Search,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  User,
  Calendar,
  CreditCard,
  Building2,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import type { SessionReportRow } from "./types";

const ALL_COLUMNS: { key: keyof SessionReportRow; label: string }[] = [
  { key: "reportRunDate", label: "Report Run Date" },
  { key: "runAttempt", label: "Run Attempt" },
  { key: "appointmentKey", label: "AppointmentKey" },
  { key: "providerName", label: "Provider Name" },
  { key: "patientName", label: "Patient Name" },
  { key: "dateOfSession", label: "Date of Session" },
  { key: "patientInitials", label: "Patient Initials" },
  { key: "patientState", label: "Patient State" },
  { key: "timecardCptFormat", label: "TimeCard CPT Format" },
  { key: "timecardApptType", label: "TimeCard Appt Type" },
  { key: "missingNotesAuditStatus", label: "Missing Notes Audit Status" },
  { key: "missingNotesUrl", label: "Missing Notes URL" },
  { key: "providerNoShowAttestation", label: "Provider No-Show Attestation*" },
  { key: "noShowLateCancellationAction", label: "No Show/Late Cancellation Action" },
  { key: "patientNameDup", label: "Patient Name (Dup)" },
  { key: "dob", label: "DOB" },
  { key: "cptCode1", label: "CPT Code (1)" },
  { key: "cptCode2", label: "CPT Code (2)" },
  { key: "icd10Codes", label: "ICD-10 Codes" },
  { key: "apptType", label: "Appt Type" },
  { key: "startTime", label: "Start Time" },
  { key: "therapyTime", label: "Therapy Time" },
  { key: "duration", label: "Duration" },
  { key: "finalRowFlag", label: "Final Row Flag" },
  { key: "insurance", label: "Insurance" },
  { key: "whereToBill", label: "Where to Bill" },
  { key: "autoWhereToBill", label: "Auto Where to Bill" },
  { key: "billed", label: "Billed?" },
  { key: "dnsReason", label: "DNS Reason" },
  { key: "noteLink", label: "Note Link" },
  { key: "note", label: "Note" },
];

type Theme = "light" | "dark";

function RootLayout({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

// Dropdown options mirrored from Apps Script validations (ensureInsuranceAndBilledValidation_)
const INSURANCE_OPTIONS = [
  "Aetna",
  "Anthem",
  "Cigna",
  "Optum",
  "Point32",
  "MultiPlan",
  "Tricare",
  "Compsych",
  "Comstack",
  "Self Pay",
  "Other",
  "Grand Total",
];

const BILLED_OPTIONS = [
  "HH Billed 1",
  "LL Billed 2",
  "OO Unbilled",
  "SP Billed 3",
  "WW — No billing req'd",
  "DNS",
];

const DNS_OPTIONS = ["Missing Forms", "Inactive Insurance", "Unpaid Balances", "CC Declined"];

const WHERE_TO_BILL_OPTIONS = ["Headway", "Lytec (Intake Only)", "Lytec (Follow-ups Only)", "Self Pay"];

function insuranceBadgeClass(insurance: string, theme: Theme): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border";
  const isDark = theme === "dark";
  const norm = insurance.toLowerCase();
  if (norm.includes("aetna")) {
    return (
      base +
      (isDark
        ? " border-emerald-500/40 bg-emerald-900/40 text-emerald-200"
        : " border-emerald-400 bg-emerald-50 text-emerald-800")
    );
  }
  if (norm.includes("anthem") || norm.includes("point32")) {
    return (
      base +
      (isDark
        ? " border-sky-500/40 bg-sky-900/40 text-sky-200"
        : " border-sky-400 bg-sky-50 text-sky-800")
    );
  }
  if (norm.includes("cigna")) {
    return (
      base +
      (isDark
        ? " border-teal-500/40 bg-teal-900/40 text-teal-200"
        : " border-teal-400 bg-teal-50 text-teal-800")
    );
  }
  if (norm.includes("optum")) {
    return (
      base +
      (isDark
        ? " border-amber-500/40 bg-amber-900/40 text-amber-200"
        : " border-amber-400 bg-amber-50 text-amber-800")
    );
  }
  if (
    norm.includes("multiplan") ||
    norm.includes("tricare") ||
    norm.includes("compsych") ||
    norm.includes("comstack")
  ) {
    return (
      base +
      (isDark
        ? " border-fuchsia-500/40 bg-fuchsia-900/40 text-fuchsia-200"
        : " border-fuchsia-400 bg-fuchsia-50 text-fuchsia-800")
    );
  }
  if (norm.includes("self pay")) {
    return (
      base +
      (isDark
        ? " border-slate-400/60 bg-slate-900/40 text-slate-100"
        : " border-slate-300 bg-slate-50 text-slate-800")
    );
  }
  return (
    base +
    (isDark
      ? " border-slate-500/40 bg-slate-900/30 text-slate-200"
      : " border-slate-300 bg-slate-50 text-slate-800")
  );
}

function whereToBillBadgeClass(value: string, theme: Theme): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border";
  const isDark = theme === "dark";
  const norm = value.toLowerCase();
  if (norm.startsWith("lytec")) {
    return (
      base +
      (isDark
        ? " border-purple-400/60 bg-purple-900/50 text-purple-100"
        : " border-purple-400 bg-purple-50 text-purple-800")
    );
  }
  if (norm === "headway") {
    return (
      base +
      (isDark
        ? " border-teal-400/60 bg-teal-900/50 text-teal-100"
        : " border-teal-400 bg-teal-50 text-teal-800")
    );
  }
  if (norm === "self pay") {
    return (
      base +
      (isDark
        ? " border-slate-400/60 bg-slate-900/40 text-slate-100"
        : " border-slate-300 bg-slate-50 text-slate-800")
    );
  }
  return (
    base +
    (isDark
      ? " border-slate-500/40 bg-slate-900/30 text-slate-200"
      : " border-slate-300 bg-slate-50 text-slate-800")
  );
}

function billedBadgeClass(value: string, theme: Theme): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border";
  const isDark = theme === "dark";
  if (value.startsWith("HH") || value.startsWith("LL") || value.startsWith("SP")) {
    return (
      base +
      (isDark
        ? " border-emerald-500/60 bg-emerald-900/40 text-emerald-100"
        : " border-emerald-400 bg-emerald-50 text-emerald-800")
    );
  }
  if (value.startsWith("OO")) {
    return (
      base +
      (isDark
        ? " border-amber-500/60 bg-amber-900/40 text-amber-100"
        : " border-amber-400 bg-amber-50 text-amber-800")
    );
  }
  if (value.startsWith("WW")) {
    return (
      base +
      (isDark
        ? " border-slate-500/60 bg-slate-900/40 text-slate-100"
        : " border-slate-300 bg-slate-50 text-slate-800")
    );
  }
  if (value === "DNS") {
    return (
      base +
      (isDark
        ? " border-red-500/70 bg-red-950/60 text-red-100"
        : " border-red-400 bg-red-50 text-red-800")
    );
  }
  return (
    base +
    (isDark
      ? " border-slate-500/40 bg-slate-900/30 text-slate-200"
      : " border-slate-300 bg-slate-50 text-slate-800")
  );
}

function rowHighlightClass(row: SessionReportRow, theme: Theme): string {
  const insurance = (row.insurance || "").toLowerCase();
  const whereToBill = (row.whereToBill || "").toLowerCase();
  const isOutsideHeadway =
    whereToBill.startsWith("lytec") || whereToBill === "self pay" || whereToBill === "self-pay";

  if (!insurance && !isOutsideHeadway) return "";

  const isDark = theme === "dark";

  // Highlight key outside-Headway plans so they visually pop as "manual" / non-Headway.
  if (insurance.includes("aetna")) {
    return isDark ? " bg-violet-900/30" : " bg-violet-50";
  }
  if (insurance.includes("optum")) {
    return isDark ? " bg-sky-900/25" : " bg-sky-50";
  }
  if (insurance.includes("multiplan")) {
    return isDark ? " bg-emerald-900/25" : " bg-emerald-50";
  }
  if (insurance.includes("self pay") || insurance === "self-pay") {
    return isDark ? " bg-amber-900/25" : " bg-amber-50";
  }
  if (insurance.includes("multiple")) {
    return isDark ? " bg-sky-900/25" : " bg-sky-50";
  }

  // Fallback: if it's routed outside Headway but not one of the above plans,
  // give a gentle blue tint so it's still visually separated from Headway rows.
  if (isOutsideHeadway) {
    return isDark ? " bg-sky-900/20" : " bg-sky-50";
  }

  return "";
}

// ---- UI-owned business logic (migrated from Apps Script concepts) ----

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

// Minimal CPT validation table, based on the transcript.
// We only encode explicit rules we were given; all other codes
// just require non-zero timing.
const CPT_RULES: Record<string, { minTotalMinutes: number; minTherapyMinutes: number }> = {
  // 99214 + 90833 follow-up combo: at least 30 total, 16 therapy.
  "99214/90833": { minTotalMinutes: 30, minTherapyMinutes: 16 },
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
        message: `Time too low for ${key} (needs ≥${rule.minTotalMinutes} total, ≥${rule.minTherapyMinutes} therapy)`,
      };
    }
  }

  return {
    status: "ok",
    message: "Timing consistent with CPT",
  };
}

function isLevelFiveCode(row: SessionReportRow): boolean {
  const c1 = (row.cptCode1 || "").trim();
  const c2 = (row.cptCode2 || "").trim();
  return c1 === "99205" || c1 === "99215" || c2 === "99205" || c2 === "99215";
}

function computeAutoWhereToBill(insurance: string, apptType: string): string {
  const ins = (insurance || "").toLowerCase().trim();
  const appt = (apptType || "").toLowerCase().trim();
  const isIntake = appt.includes("intake") || appt.includes("new");
  const isFollowUp = appt.includes("follow") || appt.includes("existing");

  if (!ins) return "";

  // Anthem is always Headway.
  if (ins.includes("anthem")) return "Headway";

  // Aetna: intakes (and follow-ups) can be billed directly through Lytec.
  if (ins.includes("aetna")) {
    if (isIntake) return "Lytec (Intake Only)";
    if (isFollowUp) return "Lytec (Follow-ups Only)";
    return "Lytec (Follow-ups Only)";
  }

  // Optum / United: intakes must go through Headway, follow-ups can be direct.
  if (ins.includes("optum") || ins.includes("united")) {
    if (isIntake) return "Headway";
    if (isFollowUp) return "Lytec (Follow-ups Only)";
    return "Headway";
  }

  // Always-direct carriers through Lytec.
  if (
    ins.includes("multiplan") ||
    ins.includes("tricare") ||
    ins.includes("compsych") ||
    ins.includes("comside") ||
    ins.includes("comstack")
  ) {
    return "Lytec (Follow-ups Only)";
  }

  if (ins.includes("self pay") || ins === "self-pay") {
    return "Self Pay";
  }

  // Fallback: unknown carrier – no automatic routing.
  return "";
}

interface ProviderRateConfig {
  providerName: string;
  intakeRate: number;
  followupRate: number;
  noShowLateCancelRate: number;
  providerNoShowPenalty: number;
  incentiveBonusPerPeriod?: number;
}

// Placeholder — real values should be filled from actual provider rate sheets.
const PROVIDER_RATE_SHEETS: ProviderRateConfig[] = [];

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

function getProviderRateConfig(providerName: string): ProviderRateConfig | undefined {
  return PROVIDER_RATE_SHEETS.find(
    (cfg) => cfg.providerName.toLowerCase().trim() === providerName.toLowerCase().trim()
  );
}

function buildProviderTimeCardSummaries(rows: SessionReportRow[]): ProviderTimeCardSummary[] {
  const byProvider = new Map<string, ProviderTimeCardSummary>();

  for (const row of rows) {
    const provider = (row.providerName || "").trim();
    if (!provider) continue;

    // Only count final rows so we don't double-count re-runs.
    const isFinal = String(row.finalRowFlag || "").toLowerCase() === "true";
    if (!isFinal) continue;

    const apptRaw = (row.timecardApptType || row.apptType || "").toLowerCase().trim();
    const apptTypeRaw = (row.apptType || "").toLowerCase().trim();
    const isIntake = apptRaw.includes("intake") || apptRaw.includes("new");
    const isFollowup = apptRaw.includes("existing") || apptRaw.includes("follow");
    const isNoShow = apptTypeRaw === "no show";
    const isLateCancel = apptTypeRaw === "late cancel";

    const audit = computeUiCptAudit(row);
    const timecardFmt = (row.timecardCptFormat || "").toLowerCase();
    const hasMissingFmt =
      timecardFmt.includes("missing") || timecardFmt.includes("incomplete");
    const hasAuditIssue = !!(row.missingNotesAuditStatus || "").trim();
    const unsignedNoShow =
      (isNoShow || isLateCancel) && !(row.providerNoShowAttestation || "").trim();
    const isMissingOrIncomplete =
      hasMissingFmt || hasAuditIssue || unsignedNoShow || audit.status !== "ok";

    const nsAction = (row.noShowLateCancellationAction || "").toLowerCase();
    const isBillableNoShowLateCancel =
      (isNoShow || isLateCancel) && nsAction.includes("charge");

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
    if (isMissingOrIncomplete) summary.missingOrIncompleteCount += 1;
    if (providerNoShow) summary.providerNoShowPenaltyCount += 1;
  }

  Array.from(byProvider.values()).forEach((summary) => {
    const baseBillable =
      summary.intakeCount + summary.followupCount + summary.billableNoShowLateCancelCount;
    summary.totalBillableAppointments = Math.max(
      0,
      baseBillable - summary.missingOrIncompleteCount,
    );

    const rates = getProviderRateConfig(summary.providerName);
    if (rates) {
      const earnings =
        summary.intakeCount * rates.intakeRate +
        summary.followupCount * rates.followupRate +
        summary.billableNoShowLateCancelCount * rates.noShowLateCancelRate -
        summary.providerNoShowPenaltyCount * rates.providerNoShowPenalty +
        (rates.incentiveBonusPerPeriod || 0);
      summary.totalEarnings = earnings;
    }
  });

  return Array.from(byProvider.values()).sort((a, b) =>
    a.providerName.localeCompare(b.providerName),
  );
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

export default function Home() {
  const router = useRouter();
  const [rows, setRows] = useState<SessionReportRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterWhereToBill, setFilterWhereToBill] = useState<string>("");
  const [filterBilled, setFilterBilled] = useState<string>("");
  const [filterApptType, setFilterApptType] = useState<string>("");
  const [filterReportRunDate, setFilterReportRunDate] = useState<string>("");
  const [filterInsurance, setFilterInsurance] = useState<string>("");
  const [filterDnsReason, setFilterDnsReason] = useState<string>("");
  const [filterAutoWhereToBill, setFilterAutoWhereToBill] = useState<string>("");
  const [showFinalOnly, setShowFinalOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [payPeriodFilter, setPayPeriodFilter] = useState<string>("all");
  const [theme, setTheme] = useState<Theme>("dark");
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Best-effort: trigger Apps Script engine for this sheet/tab.
      //    The backend route uses the session to send sheetId/tabName.
      try {
        await fetch("/api/trigger-engine", { method: "POST" });
      } catch {
        // ignore trigger errors; we'll still try to read the sheet
      }

      // 2) Read latest rows from the sheet
      const res = await fetch("/api/sheets", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (res.status === 401) {
        // Not authenticated, send to login page
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.rows || []);
      setLastUpdated(data.lastUpdated || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Inactivity + auto-logout:
  // 5 minutes of no activity starts a 5 minute grace timer, then logs out.
  useEffect(() => {
    function resetTimers() {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        // 5 minutes of inactivity reached; start 5-minute grace period
        graceTimerRef.current = setTimeout(async () => {
          try {
            await fetch("/api/logout", { method: "POST" });
          } finally {
            router.push("/login");
          }
        }, 5 * 60 * 1000);
      }, 5 * 60 * 1000);
    }

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((ev) => window.addEventListener(ev, resetTimers));
    window.addEventListener("beforeunload", handleBeforeUnload);
    // start timers on mount
    resetTimers();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimers));
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, [router]);

  function handleBeforeUnload() {
    // Best-effort logout on tab close; fire-and-forget.
    try {
      navigator.sendBeacon("/api/logout");
    } catch {
      // ignore
    }
  }

  const apptTypeOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.apptType).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const reportRunDateOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.reportRunDate).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const payPeriodOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const key = getPaymentPeriodKey(r.dateOfSession);
      if (key) set.add(key);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.providerName?.toLowerCase().includes(q) ||
          r.patientName?.toLowerCase().includes(q) ||
          r.appointmentKey?.toLowerCase().includes(q) ||
          r.insurance?.toLowerCase().includes(q) ||
          r.note?.toLowerCase().includes(q)
      );
    }
    if (filterReportRunDate) list = list.filter((r) => r.reportRunDate === filterReportRunDate);
    if (filterInsurance) list = list.filter((r) => r.insurance === filterInsurance);
    if (filterWhereToBill) list = list.filter((r) => r.whereToBill === filterWhereToBill);
    if (filterAutoWhereToBill) list = list.filter((r) => r.autoWhereToBill === filterAutoWhereToBill);
    if (filterBilled) list = list.filter((r) => r.billed === filterBilled);
    if (filterDnsReason) list = list.filter((r) => r.dnsReason === filterDnsReason);
    if (filterApptType) list = list.filter((r) => r.apptType === filterApptType);
    if (showFinalOnly) list = list.filter((r) => String(r.finalRowFlag).toLowerCase() === "true");
    return list;
  }, [
    rows,
    search,
    filterReportRunDate,
    filterInsurance,
    filterWhereToBill,
    filterAutoWhereToBill,
    filterBilled,
    filterDnsReason,
    filterApptType,
    showFinalOnly,
  ]);

  const needsReview = useMemo(
    () => filtered.filter((r) => r.missingNotesAuditStatus && r.missingNotesAuditStatus.length > 0),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const isDark = theme === "dark";

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
    () => buildProviderTimeCardSummaries(rowsForTimeCards),
    [rowsForTimeCards],
  );

  const totalEarningsR1 = useMemo(
    () =>
      providerSummaries.reduce(
        (sum, p) => sum + (typeof p.totalEarnings === "number" ? p.totalEarnings : 0),
        0,
      ),
    [providerSummaries],
  );

  const multiRunCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          String(r.finalRowFlag || "").toLowerCase() === "true" &&
          (r.runAttempt || "").trim() &&
          (r.runAttempt || "").trim() !== "1",
      ).length,
    [rows],
  );

  const exportCsv = () => {
    if (!filtered.length) return;
    const header = ALL_COLUMNS.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
    const lines = filtered.map((row) =>
      ALL_COLUMNS.map((c) => {
        const v = (row[c.key] ?? "").toString();
        return `"${v.replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "session-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const recomputeAutoWhereToBill = (mode: "blank" | "all") => {
    setRows((prev) =>
      prev.map((row) => {
        const apptType = row.timecardApptType || row.apptType || "";
        const computed = computeAutoWhereToBill(row.insurance || "", apptType);
        if (!computed) return row;
        if (mode === "blank" && (row.autoWhereToBill || "").trim()) {
          return row;
        }
        return { ...row, autoWhereToBill: computed };
      }),
    );
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  const rootClassName =
    "min-h-screen " +
    (isDark ? "bg-[#0c1116] text-slate-200" : "bg-slate-50 text-slate-900");

  const canGoPrev = currentPage >= 2;
  const canGoNext = currentPage < totalPages;

  const main = (
    <RootLayout className={rootClassName}>
      {/* Header */}
      <header
        className={
          "sticky top-0 z-50 border-b backdrop-blur " +
          (isDark ? "border-slate-800/80 bg-[#0c1116]/95" : "border-slate-200 bg-white/95")
        }
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1
                className={
                  "text-lg font-semibold tracking-tight sm:text-xl " +
                  (isDark ? "text-white" : "text-slate-900")
                }
              >
                Session Reports & Billing Intelligence
              </h1>
              <p
                className={
                  "text-xs " + (isDark ? "text-slate-500" : "text-slate-600")
                }
              >
                Verified or quarantined — never uncertain
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className={
                "hidden sm:flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition " +
                (isDark
                  ? "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100")
              }
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
            <button
              onClick={toggleTheme}
              className={
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition " +
                (isDark
                  ? "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100")
              }
            >
              {isDark ? (
                <>
                  <Sun className="h-4 w-4 text-amber-300" />
                  <span className="hidden sm:inline">Light mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-slate-700" />
                  <span className="hidden sm:inline">Dark mode</span>
                </>
              )}
            </button>
            <button
              onClick={() => router.push("/timecards")}
              className={
                "hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex " +
                (isDark
                  ? "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100")
              }
            >
              <User className="h-4 w-4" />
              <span>Provider time cards</span>
            </button>
            <span
              className={
                "hidden text-xs sm:inline " +
                (isDark ? "text-slate-500" : "text-slate-600")
              }
            >
              Data from Google Sheet · no re-run
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className={
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 " +
                (isDark
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-900 text-slate-100 hover:bg-slate-800")
              }
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {error && (
          <div
            className={
              "mb-6 flex items-center gap-3 rounded-xl px-4 py-3 " +
              (isDark
                ? "border border-red-900/50 bg-red-950/30 text-red-300"
                : "border border-red-200 bg-red-50 text-red-700")
            }
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              icon={<FileSpreadsheet className="h-5 w-5 text-teal-400" />}
              label="Total rows"
              value={String(rows.length)}
              sub={lastUpdated ? `Sheet updated: ${new Date(lastUpdated).toLocaleString()}` : "—"}
            />
            <Card
              icon={<AlertCircle className="h-5 w-5 text-amber-400" />}
              label="Needs review"
              value={String(needsReview.length)}
              sub={needsReview.length ? "Missing notes / audit issues" : "None"}
            />
            <Card
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              label="Final rows"
              value={String(filtered.filter((r) => String(r.finalRowFlag).toLowerCase() === "true").length)}
              sub="Unique appointments (last run)"
            />
            <Card
              icon={<Building2 className="h-5 w-5 text-sky-400" />}
              label="Re-run files"
              value={String(multiRunCount)}
              sub="Final rows with runAttempt > 1"
            />
          </div>

          {/* Filters */}
          <div
            className={
              "mb-4 flex flex-wrap items-center gap-3 rounded-xl border p-4 " +
              (isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-white")
            }
          >
            <Filter className="h-4 w-4 text-slate-500" />
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search provider, patient, key, insurance..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={
                  "w-full rounded-lg border py-2 pl-9 pr-3 text-sm placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 " +
                  (isDark
                    ? "border-slate-700 bg-slate-800/80 text-white"
                    : "border-slate-300 bg-white text-slate-900")
                }
              />
            </div>
            <select
              value={filterReportRunDate}
              onChange={(e) => setFilterReportRunDate(e.target.value)}
              className={
                "rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none " +
                (isDark
                  ? "border-slate-700 bg-slate-800/80 text-white"
                  : "border-slate-300 bg-white text-slate-900")
              }
            >
              <option value="">Report date</option>
              {reportRunDateOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={filterInsurance}
              onChange={(e) => setFilterInsurance(e.target.value)}
              className={
                "rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none " +
                (isDark
                  ? "border-slate-700 bg-slate-800/80 text-white"
                  : "border-slate-300 bg-white text-slate-900")
              }
            >
              <option value="">Insurance</option>
              {INSURANCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={filterWhereToBill}
              onChange={(e) => setFilterWhereToBill(e.target.value)}
              className={
                "rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none " +
                (isDark
                  ? "border-slate-700 bg-slate-800/80 text-white"
                  : "border-slate-300 bg-white text-slate-900")
              }
            >
              <option value="">Where to bill</option>
              {WHERE_TO_BILL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o || "(blank)"}
                </option>
              ))}
            </select>
            <select
              value={filterAutoWhereToBill}
              onChange={(e) => setFilterAutoWhereToBill(e.target.value)}
              className={
                "rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none " +
                (isDark
                  ? "border-slate-700 bg-slate-800/80 text-white"
                  : "border-slate-300 bg-white text-slate-900")
              }
            >
              <option value="">Auto where to bill</option>
              {WHERE_TO_BILL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o || "(blank)"}
                </option>
              ))}
            </select>
            <select
              value={filterBilled}
              onChange={(e) => setFilterBilled(e.target.value)}
              className={
                "rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none " +
                (isDark
                  ? "border-slate-700 bg-slate-800/80 text-white"
                  : "border-slate-300 bg-white text-slate-900")
              }
            >
              <option value="">Billed?</option>
              {BILLED_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={filterApptType}
              onChange={(e) => setFilterApptType(e.target.value)}
              className={
                "rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none " +
                (isDark
                  ? "border-slate-700 bg-slate-800/80 text-white"
                  : "border-slate-300 bg-white text-slate-900")
              }
            >
              <option value="">Appt type</option>
              {apptTypeOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={filterDnsReason}
              onChange={(e) => setFilterDnsReason(e.target.value)}
              className={
                "rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none " +
                (isDark
                  ? "border-slate-700 bg-slate-800/80 text-white"
                  : "border-slate-300 bg-white text-slate-900")
              }
            >
              <option value="">DNS reason</option>
              {DNS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <label
              className={
                "flex cursor-pointer items-center gap-2 text-sm " +
                (isDark ? "text-slate-400" : "text-slate-600")
              }
            >
              <input
                type="checkbox"
                checked={showFinalOnly}
                onChange={(e) => setShowFinalOnly(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500"
              />
              Final row only
            </label>
          </div>

          {/* Table + exports + pagination */}
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/30 py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 py-16 text-center text-slate-500">
              No rows match. Try changing filters or refresh to load from the sheet.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={exportCsv}
                    className={
                      "rounded-lg border px-3 py-1.5 text-xs sm:text-sm hover:bg-slate-700 " +
                      (isDark
                        ? "border-slate-700 bg-slate-800/80 text-slate-200"
                        : "border-slate-300 bg-white text-slate-900")
                    }
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={exportPdf}
                    className={
                      "rounded-lg border px-3 py-1.5 text-xs sm:text-sm hover:bg-slate-700 " +
                      (isDark
                        ? "border-slate-700 bg-slate-800/80 text-slate-200"
                        : "border-slate-300 bg-white text-slate-900")
                    }
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => recomputeAutoWhereToBill("blank")}
                    className={
                      "rounded-lg border px-3 py-1.5 text-xs sm:text-sm " +
                      (isDark
                        ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                        : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100")
                    }
                  >
                    Auto Where to Bill (blank only)
                  </button>
                  <button
                    onClick={() => recomputeAutoWhereToBill("all")}
                    className={
                      "rounded-lg border px-3 py-1.5 text-xs sm:text-sm " +
                      (isDark
                        ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                        : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100")
                    }
                  >
                    Auto Where to Bill (overwrite all)
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(Number(e.target.value) || 25);
                    }}
                    className={
                      "rounded border px-2 py-1 text-xs " +
                      (isDark
                        ? "border-slate-700 bg-slate-900 text-slate-200"
                        : "border-slate-300 bg-white text-slate-900")
                    }
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className={
                  "overflow-hidden rounded-xl border " +
                  (isDark ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-white")
                }
              >
              <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-left text-[11px] sm:text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-800/60">
                        {ALL_COLUMNS.map((col) => (
                          <Th key={col.key}>{col.label}</Th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((r, i) => (
                        <tr
                          key={`${r.appointmentKey}-${r.runAttempt}-${startIndex + i}`}
                          className={
                            "table-row-hover border-b " +
                            (isDark ? "border-slate-800/80" : "border-slate-200") +
                            rowHighlightClass(r, theme)
                          }
                        >
                          {ALL_COLUMNS.map((col) => {
                          const value = r[col.key];

                          if (col.key === "noteLink" || col.key === "missingNotesUrl") {
                            const link = value?.toString().trim();
                            return (
                              <Td key={col.key}>
                                {link ? (
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-teal-500 hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3" />
                                    Link
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </Td>
                            );
                          }

                          if (col.key === "runAttempt") {
                            const text = value?.toString().trim() || "";
                            const isAnomaly = text && text !== "1";
                            return (
                              <Td key={col.key}>
                                {text ? (
                                  <span
                                    className={
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                      (isAnomaly
                                        ? isDark
                                          ? "bg-red-950/70 text-red-200"
                                          : "bg-red-50 text-red-800"
                                        : isDark
                                        ? "bg-slate-800/70 text-slate-100"
                                        : "bg-slate-100 text-slate-800")
                                    }
                                  >
                                    {text}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </Td>
                            );
                          }

                          if (col.key === "finalRowFlag") {
                            const isFinal = String(value).toLowerCase() === "true";
                            return (
                              <Td key={col.key}>
                                {isFinal ? (
                                  <span className="rounded bg-teal-900/60 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                                    Final
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-[10px]">—</span>
                                )}
                              </Td>
                            );
                          }

                          if (col.key === "insurance") {
                            const current = r.insurance || "";
                            return (
                              <Td key={col.key}>
                                <select
                                  value={current}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    setRows((prev) =>
                                      prev.map((row) =>
                                        row === r ? { ...row, insurance: next } : row
                                      )
                                    );
                                  }}
                                  className={
                                    "w-full rounded border px-2 py-1 text-[11px] sm:text-xs " +
                                    (isDark
                                      ? "border-slate-700 bg-slate-900 text-slate-100"
                                      : "border-slate-300 bg-white text-slate-900")
                                  }
                                >
                                  <option value="">(blank)</option>
                                  {INSURANCE_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </Td>
                            );
                          }

                          if (col.key === "whereToBill") {
                            const current = r.whereToBill || "";
                            return (
                              <Td key={col.key}>
                                <select
                                  value={current}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    setRows((prev) =>
                                      prev.map((row) =>
                                        row === r ? { ...row, whereToBill: next } : row
                                      )
                                    );
                                  }}
                                  className={
                                    "w-full rounded border px-2 py-1 text-[11px] sm:text-xs " +
                                    (isDark
                                      ? "border-slate-700 bg-slate-900 text-slate-100"
                                      : "border-slate-300 bg-white text-slate-900")
                                  }
                                >
                                  <option value="">(blank)</option>
                                  {WHERE_TO_BILL_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </Td>
                            );
                          }

                          if (col.key === "autoWhereToBill") {
                            const current = r.autoWhereToBill || "";
                            return (
                              <Td key={col.key}>
                                <select
                                  value={current}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    setRows((prev) =>
                                      prev.map((row) =>
                                        row === r ? { ...row, autoWhereToBill: next } : row
                                      )
                                    );
                                  }}
                                  className={
                                    "w-full rounded border px-2 py-1 text-[11px] sm:text-xs " +
                                    (isDark
                                      ? "border-slate-700 bg-slate-900 text-slate-100"
                                      : "border-slate-300 bg-white text-slate-900")
                                  }
                                >
                                  <option value="">(blank)</option>
                                  {WHERE_TO_BILL_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </Td>
                            );
                          }

                          if (col.key === "billed") {
                            const current = r.billed || "";
                            const blocked = rowHasUiBlockingIssue(r);
                            if (blocked) {
                              return (
                                <Td key={col.key}>
                                  <span
                                    className={
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                      (isDark
                                        ? "bg-red-950/70 text-red-200"
                                        : "bg-red-50 text-red-800")
                                    }
                                    title="Billing blocked: fix CPT/timing, audit issues, or no-show attestation."
                                  >
                                    Blocked — fix note/attestation/CPT
                                  </span>
                                </Td>
                              );
                            }
                            return (
                              <Td key={col.key}>
                                <select
                                  value={current}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    setRows((prev) =>
                                      prev.map((row) =>
                                        row === r ? { ...row, billed: next } : row
                                      )
                                    );
                                  }}
                                  className={
                                    "w-full rounded border px-2 py-1 text-[11px] sm:text-xs " +
                                    (isDark
                                      ? "border-slate-700 bg-slate-900 text-slate-100"
                                      : "border-slate-300 bg-white text-slate-900")
                                  }
                                >
                                  <option value="">(blank)</option>
                                  {BILLED_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </Td>
                            );
                          }

                          if (col.key === "dnsReason") {
                            const current = r.dnsReason || "";
                            return (
                              <Td key={col.key}>
                                <select
                                  value={current}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    setRows((prev) =>
                                      prev.map((row) =>
                                        row === r ? { ...row, dnsReason: next } : row
                                      )
                                    );
                                  }}
                                  className={
                                    "w-full rounded border px-2 py-1 text-[11px] sm:text-xs " +
                                    (isDark
                                      ? "border-slate-700 bg-slate-900 text-slate-100"
                                      : "border-slate-300 bg-white text-slate-900")
                                  }
                                >
                                  <option value="">(blank)</option>
                                  {DNS_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </Td>
                            );
                          }

                          if (col.key === "cptCode1" || col.key === "cptCode2") {
                            const code = value?.toString().trim() || "";
                            const isL5 = code === "99205" || code === "99215";
                            if (!code) {
                              return <Td key={col.key}>—</Td>;
                            }
                            return (
                              <Td key={col.key}>
                                <span
                                  className={
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                    (isL5
                                      ? isDark
                                        ? "bg-red-950/70 text-red-200"
                                        : "bg-red-50 text-red-800"
                                      : isDark
                                      ? "bg-slate-800/70 text-slate-100"
                                      : "bg-slate-100 text-slate-800")
                                  }
                                >
                                  {code}
                                </span>
                                {isL5 && (
                                  <span
                                    className={
                                      "mt-1 block text-[10px] " +
                                      (isDark ? "text-red-300" : "text-red-700")
                                    }
                                  >
                                    Level 5 — justification required
                                  </span>
                                )}
                              </Td>
                            );
                          }

                          if (col.key === "timecardCptFormat") {
                            const text = value?.toString().trim();
                            const isMissing =
                              text === "Missing/ Incomplete Notes" ||
                              text === "Missing/Incompletenotes";
                            return (
                              <Td key={col.key}>
                                {text ? (
                                  <span
                                    className={
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                                      (isMissing
                                        ? isDark
                                          ? "bg-red-950/70 text-red-200"
                                          : "bg-red-50 text-red-800"
                                        : isDark
                                        ? "bg-slate-800/70 text-slate-100"
                                        : "bg-slate-100 text-slate-800")
                                    }
                                  >
                                    {text}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </Td>
                            );
                          }

                          if (col.key === "missingNotesAuditStatus") {
                            const text = value?.toString().trim();
                            const hasIssue = !!text;
                            const audit = computeUiCptAudit(r);
                            const uiHasIssue = audit.status !== "ok";
                            return (
                              <Td key={col.key}>
                                <div className="flex flex-col gap-0.5">
                                  {hasIssue ? (
                                    <span
                                      className={
                                        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium " +
                                        (isDark
                                          ? "bg-amber-900/70 text-amber-100"
                                          : "bg-amber-50 text-amber-800")
                                      }
                                    >
                                      {text}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400 text-[10px]">OK (sheet)</span>
                                  )}
                                  <span
                                    className={
                                      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium " +
                                      (uiHasIssue
                                        ? isDark
                                          ? "bg-red-950/70 text-red-200"
                                          : "bg-red-50 text-red-800"
                                        : isDark
                                        ? "bg-emerald-950/60 text-emerald-200"
                                        : "bg-emerald-50 text-emerald-700")
                                    }
                                  >
                                    {uiHasIssue ? audit.message : "OK (UI CPT check)"}
                                  </span>
                                </div>
                              </Td>
                            );
                          }

                          if (col.key === "apptType") {
                            const text = value?.toString().trim();
                            const lower = text.toLowerCase();
                            const isNoShow = lower === "no show";
                            const isLateCancel = lower === "late cancel";
                            const badgeBase =
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ";
                            let cls = "";
                            if (isNoShow) {
                              cls = isDark
                                ? "bg-red-950/70 text-red-200"
                                : "bg-red-50 text-red-800";
                            } else if (isLateCancel) {
                              cls = isDark
                                ? "bg-orange-950/70 text-orange-200"
                                : "bg-orange-50 text-orange-800";
                            } else {
                              cls = isDark
                                ? "bg-slate-800/60 text-slate-100"
                                : "bg-slate-100 text-slate-800";
                            }
                            return (
                              <Td key={col.key}>
                                {text ? (
                                  <span className={badgeBase + cls}>{text}</span>
                                ) : (
                                  "—"
                                )}
                              </Td>
                            );
                          }

                          return <Td key={col.key}>{value || "—"}</Td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing {filtered.length === 0 ? 0 : startIndex + 1}–
                {Math.min(startIndex + pageSize, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={!canGoPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <span>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  disabled={!canGoNext}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {providerSummaries.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">
              Provider time cards (UI-derived)
            </h2>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                Aggregated from final rows
                {payPeriodFilter !== "all" ? ` · Period: ${payPeriodFilter}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                  Pay period
                </span>
                <select
                  value={payPeriodFilter}
                  onChange={(e) => setPayPeriodFilter(e.target.value)}
                  className={
                    "rounded border px-2 py-1 text-xs " +
                    (isDark
                      ? "border-slate-700 bg-slate-900 text-slate-200"
                      : "border-slate-300 bg-white text-slate-900")
                  }
                >
                  <option value="all">All</option>
                  {payPeriodOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              className={
                "overflow-hidden rounded-xl border " +
                (isDark ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-white")
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-[11px] sm:text-xs">
                  <thead>
                    <tr className={isDark ? "border-b border-slate-800 bg-slate-800/60" : "border-b border-slate-200 bg-slate-100"}>
                      <Th>Provider</Th>
                      <Th>Intakes</Th>
                      <Th>Follow-ups</Th>
                      <Th>Billable NS / LC</Th>
                      <Th>Missing / incomplete</Th>
                      <Th>Total billable appts</Th>
                      <Th>Provider no-show count</Th>
                      <Th>Total pay (Cell R1)</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerSummaries.map((p) => (
                      <tr
                        key={p.providerName}
                        className={
                          "border-b " +
                          (isDark ? "border-slate-800/80" : "border-slate-200")
                        }
                      >
                        <Td>{p.providerName}</Td>
                        <Td>{p.intakeCount}</Td>
                        <Td>{p.followupCount}</Td>
                        <Td>{p.billableNoShowLateCancelCount}</Td>
                        <Td>{p.missingOrIncompleteCount}</Td>
                        <Td>{p.totalBillableAppointments}</Td>
                        <Td>{p.providerNoShowPenaltyCount}</Td>
                        <Td>
                          {typeof p.totalEarnings === "number"
                            ? `$${p.totalEarnings.toFixed(2)}`
                            : "— (no rate sheet)"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                  {typeof totalEarningsR1 === "number" && totalEarningsR1 > 0 && (
                    <tfoot>
                      <tr
                        className={
                          isDark
                            ? "border-t border-slate-700 bg-slate-900/70"
                            : "border-t border-slate-200 bg-slate-50"
                        }
                      >
                        <Td>Total (all providers)</Td>
                        <Td colSpan={6}></Td>
                        <Td>{`$${totalEarningsR1.toFixed(2)}`}</Td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-slate-600">
          Data is read from your Google Sheet. Processing (OCR, extraction) runs only in Apps Script — never twice for the same file.
        </p>
      </main>
    </RootLayout>
  );

  return main;
}

function Card({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-2 font-medium text-slate-400 whitespace-nowrap">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-2 py-1.5 align-top">{children}</td>;
}

