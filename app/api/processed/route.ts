import { NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Optional: read "ProcessedLog" sheet to show what file IDs have already been processed.
 * Prevents double-run: processor (Apps Script) writes here; UI can display "Already processed" state.
 */
export interface ProcessedApiResponse {
  processedFileIds: string[];
  lastUpdated: string;
  error?: string;
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!key.client_email || !key.private_key) throw new Error("Invalid service account JSON");
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function GET(): Promise<NextResponse<ProcessedApiResponse>> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const processedTab = "ProcessedLog";

  if (!sheetId) {
    return NextResponse.json(
      { processedFileIds: [], lastUpdated: new Date().toISOString(), error: "GOOGLE_SHEET_ID not set" },
      { status: 500 }
    );
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${processedTab}'!A:A`,
    });
    const rows = (res.data.values || []) as string[][];
    const fileIds = rows
      .flat()
      .map((c) => String(c || "").trim())
      .filter((id) => id && id.length > 10 && !id.startsWith("File ID"));
    return NextResponse.json({
      processedFileIds: [...new Set(fileIds)],
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      processedFileIds: [],
      lastUpdated: new Date().toISOString(),
    });
  }
}
