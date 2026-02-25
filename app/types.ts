/**
 * Session report row — matches Google Sheet columns from the Apps Script COLS.
 * Used for type-safe API and UI.
 */
export interface SessionReportRow {
  reportRunDate: string;
  runAttempt: string;
  appointmentKey: string;
  providerName: string;
  patientName: string;
  dateOfSession: string;
  patientInitials: string;
  patientState: string;
  timecardCptFormat: string;
  timecardApptType: string;
  missingNotesAuditStatus: string;
  missingNotesUrl: string;
  providerNoShowAttestation: string;
  noShowLateCancellationAction: string;
  patientNameDup: string;
  dob: string;
  cptCode1: string;
  cptCode2: string;
  icd10Codes: string;
  apptType: string;
  startTime: string;
  therapyTime: string;
  duration: string;
  finalRowFlag: string;
  insurance: string;
  whereToBill: string;
  autoWhereToBill: string;
  billed: string;
  dnsReason: string;
  noteLink: string;
  note: string;
}

/** Column headers in sheet order (same as Apps Script COLS) */
export const SHEET_COLUMNS = [
  "Report Run Date",
  "Run Attempt",
  "AppointmentKey",
  "Provider Name",
  "Patient Name",
  "Date of Session",
  "Patient Initials",
  "Patient State",
  "TimeCard CPT Format",
  "TimeCard Appt Type",
  "Missing Notes Audit Status",
  "Missing Notes URL",
  "Provider No-Show Attestation*",
  "No Show/Late Cancellation Action",
  "Patient Name (Dup)",
  "DOB",
  "CPT Code (1)",
  "CPT Code (2)",
  "ICD-10 Codes",
  "Appt Type",
  "Start Time",
  "Therapy Time",
  "Duration",
  "Final Row Flag",
  "Insurance",
  "Where to Bill",
  "Auto Where to Bill",
  "Billed?",
  "DNS Reason",
  "Note Link",
  "Note",
] as const;

export function sheetRowToSessionReport(row: string[]): SessionReportRow {
  const get = (i: number) => (row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : "");
  return {
    reportRunDate: get(0),
    runAttempt: get(1),
    appointmentKey: get(2),
    providerName: get(3),
    patientName: get(4),
    dateOfSession: get(5),
    patientInitials: get(6),
    patientState: get(7),
    timecardCptFormat: get(8),
    timecardApptType: get(9),
    missingNotesAuditStatus: get(10),
    missingNotesUrl: get(11),
    providerNoShowAttestation: get(12),
    noShowLateCancellationAction: get(13),
    patientNameDup: get(14),
    dob: get(15),
    cptCode1: get(16),
    cptCode2: get(17),
    icd10Codes: get(18),
    apptType: get(19),
    startTime: get(20),
    therapyTime: get(21),
    duration: get(22),
    finalRowFlag: get(23),
    insurance: get(24),
    whereToBill: get(25),
    autoWhereToBill: get(26),
    billed: get(27),
    dnsReason: get(28),
    noteLink: get(29),
    note: get(30),
  };
}
