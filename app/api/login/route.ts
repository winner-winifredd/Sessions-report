import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import crypto from "crypto";

interface LoginRequestBody {
  email: string;
  password: string;
}

interface ConfigRow {
  userEmail: string;
  password: string;
  sheetId: string;
  tabName: string;
  displayName?: string;
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

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function signSession(payload: object): string {
  const secret = getSessionSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

async function loadConfigRows(): Promise<ConfigRow[]> {
  const configSheetId = process.env.CONFIG_SHEET_ID;
  const configTab = process.env.CONFIG_SHEET_TAB || "config";

  if (!configSheetId) {
    throw new Error("CONFIG_SHEET_ID is not set");
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: configSheetId,
    range: `'${configTab}'!A2:E`,
  });

  const values = (res.data.values || []) as string[][];

  return values
    .map((row) => {
      const [userEmail = "", password = "", sheetId = "", tabName = "", displayName = ""] = row;
      return {
        userEmail: String(userEmail || "").trim(),
        password: String(password || "").trim(),
        sheetId: String(sheetId || "").trim(),
        tabName: String(tabName || "").trim(),
        displayName: String(displayName || "").trim() || undefined,
      } as ConfigRow;
    })
    .filter((r) => r.userEmail && r.sheetId && r.tabName);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<LoginRequestBody>;
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    const configs = await loadConfigRows();
    const match = configs.find(
      (c) => c.userEmail.toLowerCase() === email && c.password === password,
    );

    if (!match) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = signSession({
      email: match.userEmail,
      sheetId: match.sheetId,
      tabName: match.tabName,
      displayName: match.displayName || null,
      issuedAt: Date.now(),
    });

    const response = NextResponse.json({
      ok: true,
      sheetId: match.sheetId,
      tabName: match.tabName,
      displayName: match.displayName || null,
    });

    cookies().set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      // No maxAge -> session cookie, cleared when browser session ends
    });

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

