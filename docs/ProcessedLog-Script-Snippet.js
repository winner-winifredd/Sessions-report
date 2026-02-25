/**
 * OPTIONAL: Add this to your Google Apps Script project so we NEVER run the same file twice.
 *
 * 1. Create a sheet tab named exactly "ProcessedLog" in the SAME spreadsheet as your validation sheet
 *    (VALIDATION_SHEET_ID). Use that ID so all billers share one log.
 * 2. Put a header in row 1: "File ID" (column A).
 * 3. Paste the functions below into your script (e.g. at the bottom).
 * 4. In runForConfig_(), after you set processed[id] = { status: "ok", ts: Date.now() }, add:
 *      logProcessedFileId_(VALIDATION_SHEET_ID, id);
 * 5. (Optional) At the start of the file loop in runForConfig_(), skip if already in sheet:
 *      var sheetProcessed = getProcessedFileIdsFromSheet_(VALIDATION_SHEET_ID);
 *      if (sheetProcessed.has(id)) { skipped++; continue; }
 *
 * This way:
 * - Script Properties still control "Process New Files" (skip if processed[id].status === "ok").
 * - ProcessedLog sheet is a persistent record: if properties are ever reset, you can rebuild
 *   the "already processed" set from this sheet so we still don't re-run the same file.
 */

const PROCESSED_LOG_TAB = "ProcessedLog";

/**
 * Ensure the ProcessedLog sheet exists and has a header. Call once from onOpen or from runForConfig_.
 */
function ensureProcessedLogSheet_(spreadsheetId) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sh = ss.getSheetByName(PROCESSED_LOG_TAB);
  if (!sh) {
    sh = ss.insertSheet(PROCESSED_LOG_TAB);
    sh.getRange(1, 1).setValue("File ID");
    sh.getRange(1, 1).setFontWeight("bold");
  }
  return sh;
}

/**
 * Append a file ID to ProcessedLog so we have a permanent record of "already run".
 * Call this after successfully processing a file (e.g. right after processed[id] = { status: "ok", ts }).
 */
function logProcessedFileId_(spreadsheetId, fileId) {
  if (!fileId || !spreadsheetId) return;
  try {
    const sh = ensureProcessedLogSheet_(spreadsheetId);
    const lastRow = sh.getLastRow();
    sh.getRange(lastRow + 1, 1).setValue(fileId);
  } catch (e) {
    Logger.log("ProcessedLog append failed: " + (e && e.message ? e.message : e));
  }
}

/**
 * Build a Set of file IDs that are already in ProcessedLog (so we never re-run them).
 * You can use this INSTEAD of or IN ADDITION to Script Properties:
 * - In runForConfig_(), when building the list of files to process, skip any file whose id
 *   is in getProcessedFileIdsFromSheet_(cfg.sheetId).
 */
function getProcessedFileIdsFromSheet_(spreadsheetId) {
  const out = new Set();
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sh = ss.getSheetByName(PROCESSED_LOG_TAB);
    if (!sh) return out;
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return out;
    const values = sh.getRange(2, 1, lastRow, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      var id = String(values[i][0] || "").trim();
      if (id.length > 10) out.add(id);
    }
  } catch (e) {
    Logger.log("ProcessedLog read failed: " + (e && e.message ? e.message : e));
  }
  return out;
}
