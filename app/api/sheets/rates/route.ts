import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RATES_CACHE_TTL_MINUTES = Number(process.env.RATES_CACHE_TTL_MINUTES) || 60;
const RATES_CACHE_TTL_MS = RATES_CACHE_TTL_MINUTES * 60 * 1000;

/** Stale age after which we still serve from file but trigger background revalidate (ms). */
const STALE_WHILE_REVALIDATE_MS = 24 * 60 * 60 * 1000; // 24 hours

const PROVIDER_RATES_CACHE_TAB_NAME =
  (process.env.PROVIDER_RATES_CACHE_TAB_NAME || "").trim() || "Provider Rates Cache";

const memoryCache = new Map<
  string,
  { rates: ProviderRateConfig[]; expiresAt: number }
>();

/** Single-flight: one in-flight fetch per folderId to avoid burst of Sheets reads. */
const inFlightFetch = new Map<string, Promise<ProviderRateConfig[]>>();

function cacheKey(folderId: string): string {
  return crypto.createHash("sha256").update(folderId).digest("hex").slice(0, 16);
}

async function getCachedRatesJson(folderId: string): Promise<ProviderRateConfig[] | null> {
  const key = cacheKey(folderId);
  const dir = os.tmpdir();
  const filePath = path.join(dir, `rates-${key}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as { rates: ProviderRateConfig[]; cachedAt: number };
    if (Date.now() - data.cachedAt < RATES_CACHE_TTL_MS) return data.rates;
  } catch {
    // file missing or invalid
  }
  return null;
}

/** Returns cached rates from JSON file even if expired (for stale-while-revalidate). */
async function getCachedRatesJsonStale(
  folderId: string,
): Promise<{ rates: ProviderRateConfig[]; cachedAt: number } | null> {
  const key = cacheKey(folderId);
  const dir = os.tmpdir();
  const filePath = path.join(dir, `rates-${key}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as { rates: ProviderRateConfig[]; cachedAt: number };
    if (data.rates && Array.isArray(data.rates) && typeof data.cachedAt === "number")
      return { rates: data.rates, cachedAt: data.cachedAt };
  } catch {
    // file missing or invalid
  }
  return null;
}

async function setCachedRatesJson(folderId: string, rates: ProviderRateConfig[]): Promise<void> {
  const key = cacheKey(folderId);
  const dir = os.tmpdir();
  const filePath = path.join(dir, `rates-${key}.json`);
  try {
    await fs.writeFile(
      filePath,
      JSON.stringify({ rates, cachedAt: Date.now() }),
      "utf-8",
    );
  } catch {
    // ignore write errors (e.g. read-only fs)
  }
}

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
  driveFolderId?: string | null;
  issuedAt: number;
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!key.client_email || !key.private_key) throw new Error("Invalid service account");
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: [
      // Needs write access to persist the cache tab on refresh.
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
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

/** Parse a provider's `Provider Rate Sheet` tab (CPT/location layout). */
function parseProviderRateSheet(rawRows: string[][]): Partial<ProviderRateConfig> {
  const result: Partial<ProviderRateConfig> = {
    intakeRate: 0,
    followupRate: 0,
    noShowLateCancelRate: 0,
    providerNoShowPenalty: 0,
  };
  if (!rawRows || rawRows.length < 2) return result;

  // Rate columns (New York, Massachusetts, New Jersey, Connecticut)
  const rateCols = [2, 3, 4, 5]; // C, D, E, F
  const getFirstRate = (row: string[]): number => {
    for (const c of rateCols) {
      const val = parseMoney(row[c]);
      if (val > 0) return val;
    }
    return 0;
  };

  let intakeRate = 0;
  let followupRate = 0;
  let inIntakeSection = false;
  let inFollowupSection = false;

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;
    const firstCell = String(row[0] ?? "").toLowerCase();
    const secondCell = String(row[1] ?? "").toLowerCase();
    const combined = firstCell + " " + secondCell;

    if (combined.includes("intake") || combined.includes("new patient")) {
      inIntakeSection = true;
      inFollowupSection = false;
      continue;
    }
    if (
      combined.includes("followup") ||
      combined.includes("follow-up") ||
      combined.includes("existing patient")
    ) {
      inFollowupSection = true;
      inIntakeSection = false;
      continue;
    }

    if (inIntakeSection && intakeRate === 0) {
      const rate = getFirstRate(row);
      if (rate > 0) intakeRate = rate;
    }
    if (inFollowupSection && followupRate === 0) {
      const rate = getFirstRate(row);
      if (rate > 0) followupRate = rate;
    }

    // No‑show / late‑cancel rows (bottom summary or inline)
    if (combined.includes("no show")) {
      result.noShowLateCancelRate = getFirstRate(row) || result.noShowLateCancelRate;
    }
    if (combined.includes("penalty") || combined.includes("no-show penalty")) {
      result.providerNoShowPenalty = getFirstRate(row) || result.providerNoShowPenalty;
    }
  }

  result.intakeRate = intakeRate;
  result.followupRate = followupRate;
  return result;
}

/** Fetches rates from Drive/Sheets and updates memory + JSON cache. Single place for all Sheets reads. */
async function fetchRatesFromDriveAndUpdateCache(
  folderId: string,
): Promise<ProviderRateConfig[]> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  const listRes = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 1000,
  });

  const files = listRes.data.files || [];
  const ratesByProvider = new Map<string, ProviderRateConfig>();

  for (const file of files) {
    const name = (file.name || "").trim();
    if (!name) continue;

    const m = name.match(/^(.*?)(?:_| )Orenda Time Card[s]?$/i);
    if (!m) continue;

    const providerName = m[1].trim();
    if (!providerName || !file.id) continue;

    try {
      const range = "'Provider Rate Sheet'!A1:K200";
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: file.id,
        range,
      });
      const rawRows = (res.data.values || []) as string[][];
      if (!rawRows.length) continue;

      const parsed = parseProviderRateSheet(rawRows);
      const key = providerName.toLowerCase().trim();
      ratesByProvider.set(key, {
        providerName,
        intakeRate: parsed.intakeRate ?? 0,
        followupRate: parsed.followupRate ?? 0,
        noShowLateCancelRate: parsed.noShowLateCancelRate ?? 0,
        providerNoShowPenalty: parsed.providerNoShowPenalty ?? 0,
        incentiveBonusPerPeriod: parsed.incentiveBonusPerPeriod,
      });
    } catch {
      continue;
    }
  }

  const rates = Array.from(ratesByProvider.values());
  memoryCache.set(folderId, {
    rates,
    expiresAt: Date.now() + RATES_CACHE_TTL_MS,
  });
  await setCachedRatesJson(folderId, rates);
  return rates;
}

function parseMoney(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const s = String(val).replace(/[$,]/g, "").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

async function readRatesFromCacheTab(args: {
  sheetId: string;
}): Promise<ProviderRateConfig[] | null> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const range = `'${PROVIDER_RATES_CACHE_TAB_NAME}'!A1:F2000`;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: args.sheetId,
      range,
    });
    const values = (res.data.values || []) as unknown[][];
    if (values.length < 2) return null;

    const header = values[0].map((v) => String(v ?? "").trim());
    const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const colProvider = idx("providerName");
    const colIntake = idx("intakeRate");
    const colFollow = idx("followupRate");
    const colNsLc = idx("noShowLateCancelRate");
    const colPenalty = idx("providerNoShowPenalty");

    if (colProvider < 0) return null;

    const out: ProviderRateConfig[] = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r] || [];
      const providerName = String(row[colProvider] ?? "").trim();
      if (!providerName) continue;

      out.push({
        providerName,
        intakeRate: parseMoney(colIntake >= 0 ? row[colIntake] : 0),
        followupRate: parseMoney(colFollow >= 0 ? row[colFollow] : 0),
        noShowLateCancelRate: parseMoney(colNsLc >= 0 ? row[colNsLc] : 0),
        providerNoShowPenalty: parseMoney(colPenalty >= 0 ? row[colPenalty] : 0),
      });
    }

    return out.length ? out : null;
  } catch {
    return null;
  }
}

async function writeRatesToCacheTab(args: {
  sheetId: string;
  rates: ProviderRateConfig[];
}): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const updatedAt = new Date().toISOString();
  const values = [
    [
      "providerName",
      "intakeRate",
      "followupRate",
      "noShowLateCancelRate",
      "providerNoShowPenalty",
      "updatedAt",
    ],
    ...args.rates.map((r) => [
      r.providerName,
      r.intakeRate,
      r.followupRate,
      r.noShowLateCancelRate,
      r.providerNoShowPenalty,
      updatedAt,
    ]),
  ];

  const range = `'${PROVIDER_RATES_CACHE_TAB_NAME}'!A1:F${Math.max(2, values.length)}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: args.sheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

export async function GET(request: Request) {
  const sessionCookie = cookies().get("session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ rates: [], error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifySessionToken(sessionCookie);
  if (!payload?.sheetId || !payload.tabName) {
    return NextResponse.json({ rates: [], error: "Invalid session" }, { status: 401 });
  }

  const folderIdFromSession = (payload.driveFolderId || "").trim();
  const folderIdFromEnv = (process.env.GOOGLE_PROVIDER_TIME_CARDS_FOLDER_ID || "").trim();
  const folderId = folderIdFromSession || folderIdFromEnv;

  if (!folderId) {
    return NextResponse.json(
      { rates: [], error: "Drive folder ID not configured" },
      { status: 500 },
    );
  }

  const forceRefresh =
    new URL(request.url).searchParams.get("refresh") === "1" ||
    new URL(request.url).searchParams.get("force") === "1";

  const cacheSheetId =
    (process.env.CONFIG_SHEET_ID || "").trim() || payload.sheetId;

  if (!forceRefresh) {
    // Prefer the persisted "cache table" tab: single cheap Sheets read.
    const cachedTabRates = await readRatesFromCacheTab({ sheetId: cacheSheetId });
    if (cachedTabRates) {
      return NextResponse.json({ rates: cachedTabRates });
    }

    const mem = memoryCache.get(folderId);
    if (mem && mem.expiresAt > Date.now()) {
      return NextResponse.json({ rates: mem.rates });
    }
    const fileRates = await getCachedRatesJson(folderId);
    if (fileRates) {
      memoryCache.set(folderId, {
        rates: fileRates,
        expiresAt: Date.now() + RATES_CACHE_TTL_MS,
      });
      return NextResponse.json({ rates: fileRates });
    }

    // Stale-while-revalidate: serve expired file if still within 24h to avoid Sheets burst
    const stale = await getCachedRatesJsonStale(folderId);
    if (stale && Date.now() - stale.cachedAt < STALE_WHILE_REVALIDATE_MS) {
      memoryCache.set(folderId, {
        rates: stale.rates,
        expiresAt: Date.now() + RATES_CACHE_TTL_MS,
      });
      fetchRatesFromDriveAndUpdateCache(folderId).catch(() => {});
      return NextResponse.json({ rates: stale.rates });
    }
  }

  // Single-flight: concurrent requests for same folder share one Sheets fetch
  let promise = inFlightFetch.get(folderId);
  if (!promise) {
    promise = fetchRatesFromDriveAndUpdateCache(folderId);
    inFlightFetch.set(folderId, promise);
    promise.finally(() => inFlightFetch.delete(folderId));
  }

  try {
    const rates = await promise;
    // Persist latest rates to the cache tab so future loads are instant and not TTL-bound.
    writeRatesToCacheTab({ sheetId: cacheSheetId, rates }).catch(() => {});
    return NextResponse.json({ rates });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ rates: [], error: message }, { status: 500 });
  }
}
