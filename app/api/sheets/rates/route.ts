import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface ProviderRateConfig {
  providerName: string;
  intakeRate: number;
  followupRate: number;
  noShowLateCancelRate: number;
  providerNoShowPenalty: number;
  incentiveBonusPerPeriod?: number;
}

interface SessionCookiePayload {
  email: string;
  sheetId: string;
  tabName: string;
  displayName?: string | null;
  rateSheetTab?: string | null;
  issuedAt: number;
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!key.client_email || !key.private_key) throw new Error("Invalid service account");
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
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

function parseMoney(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const s = String(val).replace(/[$,]/g, "").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function findColumnIndex(headers: string[], ...patterns: string[]): number {
  const lower = headers.map((h) => String(h || "").toLowerCase());
  for (const pattern of patterns) {
    const p = pattern.toLowerCase();
    const i = lower.findIndex((h) => h.includes(p) || p.includes(h));
    if (i >= 0) return i;
  }
  return -1;
}

export async function GET() {
  const sessionCookie = cookies().get("session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ rates: [], error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifySessionToken(sessionCookie);
  if (!payload?.sheetId || !payload.tabName) {
    return NextResponse.json({ rates: [], error: "Invalid session" }, { status: 401 });
  }

  const rateSheetTab = (payload.rateSheetTab || "Rates").trim();
  if (!rateSheetTab) {
    return NextResponse.json({ rates: [] });
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const range = "'" + rateSheetTab.replace(/'/g, "''") + "'!A1:J500";
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: payload.sheetId,
      range,
    });

    const rawRows = (res.data.values || []) as string[][];
    if (rawRows.length < 2) {
      return NextResponse.json({ rates: [] });
    }

    const headerRow = rawRows[0].map((c) => String(c ?? "").trim());
    const iProvider = findColumnIndex(headerRow, "provider name", "provider", "provider name (dup)");
    const iIntake = findColumnIndex(headerRow, "intake rate", "intake");
    const iFollowup = findColumnIndex(headerRow, "followup rate", "follow-up rate", "followup");
    const iNoShow = findColumnIndex(
      headerRow,
      "no-show rate",
      "noshow late cancel",
      "no show late cancel rate",
      "late cancel rate"
    );
    const iPenalty = findColumnIndex(
      headerRow,
      "provider no-show penalty",
      "no-show penalty",
      "provider noshow penalty"
    );
    const iIncentive = findColumnIndex(headerRow, "incentive bonus", "incentive");

    if (iProvider < 0) {
      return NextResponse.json({
        rates: [],
        error: "Rate sheet must have a Provider Name or Provider column",
      });
    }

    const rates: ProviderRateConfig[] = [];
    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;
      const providerName = String(row[iProvider] ?? "").trim();
      if (!providerName) continue;

      rates.push({
        providerName,
        intakeRate: iIntake >= 0 ? parseMoney(row[iIntake]) : 0,
        followupRate: iFollowup >= 0 ? parseMoney(row[iFollowup]) : 0,
        noShowLateCancelRate: iNoShow >= 0 ? parseMoney(row[iNoShow]) : 0,
        providerNoShowPenalty: iPenalty >= 0 ? parseMoney(row[iPenalty]) : 0,
        incentiveBonusPerPeriod: iIncentive >= 0 ? parseMoney(row[iIncentive]) : undefined,
      });
    }

    return NextResponse.json({ rates });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ rates: [], error: message }, { status: 500 });
  }
}
