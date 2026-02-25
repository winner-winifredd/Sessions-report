# Session Reports & Billing Intelligence — Frontend

Host this on **Vercel** or **Netlify**. It **reads** data from your Google Sheet (the same one the Apps Script writes to). **No data is run twice**: processing stays in Google Apps Script; this UI only displays existing rows.

## Quick start

```bash
cd session-reports-ui
npm install
cp .env.example .env.local
# Edit .env.local with your GOOGLE_SHEET_ID, GOOGLE_SHEET_TAB, and GOOGLE_SERVICE_ACCOUNT_JSON
npm run dev
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SHEET_ID` | Yes | Spreadsheet ID (from the sheet URL). |
| `GOOGLE_SHEET_TAB` | No | Tab name (default: `Tests`). |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes | Full JSON key for a Google Cloud service account with **Viewer** access to the sheet. |

### Service account

1. Google Cloud Console → APIs & Services → Credentials → Create credentials → Service account.
2. Create a key (JSON) and download it.
3. Share your Google Sheet with the service account email (e.g. `xxx@xxx.iam.gserviceaccount.com`) with **Viewer** access.
4. Put the JSON in `.env.local` as a **single line** (escape newlines in the private key as `\n`), or paste the whole object.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: Import project → set root to `session-reports-ui` (or repo root and set root in project settings).
3. Add the same env vars in Vercel: **Settings → Environment variables**.
4. Deploy.

## Deploy to Netlify

1. In Netlify: **Site configuration → Build & deploy**: set **Base directory** to `session-reports-ui` (if the repo root is above this folder).
2. Build command: `npm run build`; publish directory is set automatically by the [Netlify Next.js runtime](https://docs.netlify.com/frameworks/next-js/).
3. Add env vars: **Site settings → Environment variables**.

## Don’t run the same data twice

- **Processing** (OCR, extraction, validation) runs only in **Google Apps Script** (your existing menu: “Process New Files”, etc.).
- The script tracks processed file IDs in **Script Properties** and optionally in a **ProcessedLog** sheet tab.
- This frontend **only reads** from the sheet. It never triggers processing and never runs the same file twice.
- To avoid double-run when using the script: use **“Process New Files”** (not “Process ALL Files”) so already-processed files are skipped.

Optional: add the `ProcessedLog` sheet and the script snippet in `docs/ProcessedLog-Script-Snippet.js` so every processed file ID is written to the sheet; then even if Script Properties are reset, you have a single source of truth for “already run”.
