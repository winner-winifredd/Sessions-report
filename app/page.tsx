"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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

const DURATION_OPTIONS = ["5", "10", "15", "20", "30", "40", "45", "50", "60", "75", "90"];

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
  const [filterInsurance, setFilterInsurance] = useState<string>("");
  const [filterDnsReason, setFilterDnsReason] = useState<string>("");
  const [filterDuration, setFilterDuration] = useState<string>("");
  const [filterAutoWhereToBill, setFilterAutoWhereToBill] = useState<string>("");
  const [showFinalOnly, setShowFinalOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [theme, setTheme] = useState<Theme>("dark");
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets");
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
    if (filterInsurance) list = list.filter((r) => r.insurance === filterInsurance);
    if (filterWhereToBill) list = list.filter((r) => r.whereToBill === filterWhereToBill);
    if (filterAutoWhereToBill) list = list.filter((r) => r.autoWhereToBill === filterAutoWhereToBill);
    if (filterBilled) list = list.filter((r) => r.billed === filterBilled);
    if (filterDnsReason) list = list.filter((r) => r.dnsReason === filterDnsReason);
    if (filterDuration) list = list.filter((r) => r.duration === filterDuration);
    if (filterApptType) list = list.filter((r) => r.apptType === filterApptType);
    if (showFinalOnly) list = list.filter((r) => String(r.finalRowFlag).toLowerCase() === "true");
    return list;
  }, [rows, search, filterWhereToBill, filterBilled, filterApptType, showFinalOnly]);

  const needsReview = useMemo(
    () => filtered.filter((r) => r.missingNotesAuditStatus && r.missingNotesAuditStatus.length > 0),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

  const isDark = theme === "dark";

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

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  return (
    <div
      className={
        "min-h-screen " +
        (isDark ? "bg-[#0c1116] text-slate-200" : "bg-slate-50 text-slate-900")
      }
    >
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
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            icon={<FileSpreadsheet className="h-5 w-5 text-teal-400" />}
            label="Total rows"
            value={String(filtered.length)}
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
            label="Data source"
            value="Google Sheet"
            sub="Read-only · processing stays in Apps Script"
          />
        </div>

        {/* Filters */}
        <div
          className={
            "mb-6 flex flex-wrap items-center gap-3 rounded-xl border p-4 " +
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
          <select
            value={filterDuration}
            onChange={(e) => setFilterDuration(e.target.value)}
            className={
              "rounded-lg border px-3 py-2 text-sm focus:border-teal-500 focus:outline-none " +
              (isDark
                ? "border-slate-700 bg-slate-800/80 text-white"
                : "border-slate-300 bg-white text-slate-900")
            }
          >
            <option value="">Duration (min)</option>
            {DURATION_OPTIONS.map((o) => (
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
              <div className="flex gap-2">
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
                <table className="w-full min-w-[1600px] text-left text-xs sm:text-sm">
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
                            return (
                              <Td key={col.key}>
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
                                  <span className="text-emerald-400 text-[10px]">OK</span>
                                )}
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
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <span>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-slate-600">
          Data is read from your Google Sheet. Processing (OCR, extraction) runs only in Apps Script — never twice for the same file.
        </p>
      </main>
    </div>
  );
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
  return <th className="px-4 py-3 font-medium text-slate-400">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}
