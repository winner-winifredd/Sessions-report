import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

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

export async function POST(): Promise<NextResponse> {
  const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
  const webhookSecret = process.env.APPS_SCRIPT_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "APPS_SCRIPT_WEBHOOK_URL / APPS_SCRIPT_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const sessionCookie = cookies().get("session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifySessionToken(sessionCookie);
  if (!payload || !payload.sheetId || !payload.tabName) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  // Fire the webhook for this specific sheet/tab.
  // Apps Script itself handles locking + throttling.
  const body = new URLSearchParams({
    key: webhookSecret,
    sheetId: payload.sheetId,
    tabName: payload.tabName,
    mode: "new",
  });

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const text = await res.text();

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      body: text,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

