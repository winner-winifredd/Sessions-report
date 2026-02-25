import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import crypto from "crypto";
import { sheetRowToSessionReport, type SessionReportRow } from "@/app/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface SheetsApiResponse {
  rows: SessionReportRow[];
  firstDataRow: number;
  lastUpdated: string;
  error?: string;
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  }
  const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!key.client_email || !key.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must contain client_email and private_key");
  }
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

interface SessionCookiePayload {
  email: string;
  sheetId: string;
  tabName: string;
  displayName?: string | null;
  issuedAt: number;
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function verifySessionToken(token: string): SessionCookiePayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const secret = getSessionSecret();
    const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const json = Buffer.from(data, "base64url").toString("utf8");
    const payload = JSON.parse(json) as SessionCookiePayload;
    if (!payload.sheetId || !payload.tabName) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse<SheetsApiResponse>> {
  const sessionCookie = cookies().get("session")?.value;
  if (!sessionCookie) {
    return NextResponse.json(
      {
        rows: [],
        firstDataRow: 0,
        lastUpdated: new Date().toISOString(),
        error: "Not authenticated",
      },
      { status: 401 },
    );
  }

  const payload = verifySessionToken(sessionCookie);
  if (!payload || !payload.sheetId || !payload.tabName) {
    return NextResponse.json(
      {
        rows: [],
        firstDataRow: 0,
        lastUpdated: new Date().toISOString(),
        error: "Invalid session",
      },
      { status: 401 },
    );
  }

  const sheetId = payload.sheetId;
  const tabName = payload.tabName;

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const range = `'${tabName}'!A:AE`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rawRows = (res.data.values || []) as string[][];
    // Row 1 = meta, Row 2 = headers, Row 3+ = data (FIRST_DATA_ROW = 3)
    const firstDataRow = 3;
    const dataRows = rawRows.slice(firstDataRow - 1).filter((row) => row && row.some((c) => c !== undefined && String(c).trim() !== ""));

    const rows: SessionReportRow[] = dataRows.map((row) => {
      const padded = [...row];
      while (padded.length < 31) padded.push("");
      return sheetRowToSessionReport(padded);
    });

    return NextResponse.json({
      rows,
      firstDataRow,
      lastUpdated: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { rows: [], firstDataRow: 0, lastUpdated: new Date().toISOString(), error: message },
      { status: 500 }
    );
  }
}
