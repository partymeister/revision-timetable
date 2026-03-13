# Demoparty Timetable Polling App

## Project overview

This is a Node.js/TypeScript service running in Docker that polls a Google Sheet containing a demoparty event timetable, converts it to JSON, and writes it to a shared volume consumed by two systems:

- A **static public website** (displays the timetable to internet visitors)
- An **on-prem party management system** (reads from the same shared volume)

It replaces a Google Apps Script that previously pushed JSON directly to the website via POST request. The new approach uses polling (every 5 minutes) plus an on-demand webhook that an Apps Script can call when an editor wants an immediate update.

## Architecture

```
Google Sheets
    │
    ├─ Sheets API (every 5 min) ──► Polling App (Node.js/Docker)
    │                                       │
    └─ Apps Script (on editor save) ──POST /webhook
                                            │
                                     writes timetable.json
                                            │
                              ┌─────────────┴─────────────┐
                        Shared volume               Shared volume
                              │                           │
                       Static website            Party system (on-prem)
```

## Project structure

```
polling-app/
  src/
    index.ts        # main loop + Express webhook server
    sheets.ts       # Google Sheets API client + auth
    transform.ts    # raw sheet data → timetable JSON
  Dockerfile
  package.json
  tsconfig.json
  .env.example
```

## Key implementation details

### Sheet structure

- One sheet (tab) per day of the party (e.g. "Friday", "Saturday", "Sunday")
- **Column A** — 15-minute timeslots as datetime values; first cell is an absolute datetime (e.g. `03.04.2026 12:00:00`), each subsequent cell increments by 15 minutes via `=<cell above>+TIME(0,15,0)`
- **Column B** — event start time, references a cell in column A (e.g. `=A22`)
- **Column C** — event category (dropdown: SEMINAR, EVENT, DEADLINE, etc.) with color coding
- **Column D** — event name
- **Column G** — list of compos (relevant for event category DEADLINE only)
- **Column H** — publish flag (boolean) - an event is to be included in the JSON only if `publish=TRUE`
- Further columns contain additional event metadata (no relevant currently)

A CSV export of a single day (sheet) lives at `/examples/Schedule_Example.csv` in this repo.

### Auth

- Uses a **GCP service account** with read-only access to the spreadsheet
- The service account JSON key is mounted into the container as a secret (never baked into the image)
- Sheet is shared with the service account email address (read-only)
- Scope: `https://www.googleapis.com/auth/spreadsheets.readonly`

### Polling + webhook

- Polls Google Sheets every 5 minutes via `setInterval`
- Exposes `POST /webhook` on port 3000 for on-demand updates triggered by Apps Script
- Webhook should be protected by a shared secret passed as a header (e.g. `X-Webhook-Secret`)
- Runs an initial poll immediately on startup

### Output

- Writes `timetable.json` to a path on the shared Docker volume (default: `/data/timetable.json`)
- Output path is configurable via `OUTPUT_PATH` env var

## Environment variables

| Variable | Description |
|---|---|
| `SHEET_ID` | Google Spreadsheet ID (from the URL) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON key file |
| `OUTPUT_PATH` | Path to write timetable.json (default: `/data/timetable.json`) |
| `WEBHOOK_SECRET` | Shared secret for authenticating webhook calls |
| `POLL_INTERVAL_MS` | Polling interval in ms (default: `300000`) |

## Tech stack

- **Runtime**: Node.js 22 (Alpine)
- **Language**: TypeScript
- **Key dependencies**: `googleapis`, `express`
- **Container**: Docker, shared volume for JSON output

## Output JSON schema

A real example lives at `/examples/reference.json` in this repo. The structure is:

```json
{
  "timetable": [
    {
      "day": "FRIDAY",
      "events": [
        {
          "start": "Fri, 03 Apr 2026 10:00:00 GMT",
          "backgroundColor": "#fad028",
          "category": "EVENT",
          "title": "Doors open"
        }
      ]
    }
  ]
}
```

### Field notes

- **`day`** — uppercase day name matching the sheet tab name
- **`start`** — RFC 2822 formatted datetime string in GMT, derived from Column A (the timeslot datetime)
- **`category`** — value from Column C dropdown (e.g. `EVENT`, `DEADLINE`, `SEMINAR`, `COMPO`, `CONCERT`)
- **`backgroundColor`** — hex colour associated with the category; currently hardcoded per category in the Apps Script, should be replicated in `transform.ts`
- **`title`** — value from Column D; for DEADLINE events, multiple competition names are newline-separated (`\n`) in a single title string (sourced from Column G)

### Known category → colour mapping

| Category | Colour |
|---|---|
| `EVENT` | `#fad028` (yellow) |
| `DEADLINE` | `#e5554a` (red) |
| `COMPO` | `#63a848` (green) |
| `SEMINAR` | `#88bbff` (blue) |
| `CONCERT` | `#b7e1cd` (mint) |

> This mapping lives in `transform.ts`. If new categories are added to the sheet, add them here too.

### Multiple events at the same start time

Multiple events can share the same start time (e.g. a DEADLINE and a COMPO both at 10:00). These appear as separate objects in the `events` array — one entry per event row in the sheet, order preserved.

## What NOT to do

- Do not push JSON to the static website via HTTP — write to the shared volume only
- Do not hardcode credentials or the Sheet ID — use environment variables
- Do not expose the webhook endpoint without secret validation
- Do not bake the service account key into the Docker image

## Related context

- The Google Sheet is edited by party organizers during the event — changes should propagate within 5 minutes passively, or immediately via the Apps Script webhook trigger
- The Apps Script remaining in the spreadsheet has one job only: call `POST /webhook` with the shared secret when an editor manually triggers an update
- The `transform.ts` module contains the core business logic (sheet rows → structured JSON); this is the most likely file to need changes as the sheet schema evolves
