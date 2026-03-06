import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const FIRST_DATA_ROW = 3; // row 1 = meta, row 2 = headers, row 3+ = data
const MISSING_NOTES_URL_COLUMN = "L"; // 12th column (0-based index 11)

interface SessionCookiePayload {
  email: string;
  sheetId: string;
  tabName: string;
  displayName?: string | null;
  issuedAt: number;
}

function getAuthWrite() {
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
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

export async function PATCH(request: Request): Promise<NextResponse> {
  const sessionCookie = cookies().get("session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifySessionToken(sessionCookie);
  if (!payload?.sheetId || !payload.tabName) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  let body: { rowIndex?: number; value?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const rowIndex = typeof body.rowIndex === "number" ? body.rowIndex : undefined;
  const value = typeof body.value === "string" ? body.value : String(body.value ?? "");

  if (rowIndex === undefined || rowIndex < 0) {
    return NextResponse.json({ ok: false, error: "rowIndex (number >= 0) is required" }, { status: 400 });
  }

  const sheetRow = FIRST_DATA_ROW + rowIndex;
  const range = `'${payload.tabName}'!${MISSING_NOTES_URL_COLUMN}${sheetRow}`;

  try {
    const auth = getAuthWrite();
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.update({
      spreadsheetId: payload.sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[value]],
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
