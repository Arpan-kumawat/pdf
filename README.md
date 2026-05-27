# PDF Measurement Extractor

Full-stack app that extracts machine measurement values from uploaded PDF reports and exports them to Excel.

## Features

- Upload **multiple PDF files** at once (drag & drop or browse)
- Extract per file:
  - **Roundness** (e.g. `Roundness (RONt) : 12.45 µm`)
  - **RMS1**, **RMS2**, **RMS3**
  - **Full Harmonic Amplitude table** (N+0, N+1, N+2, … as in the PDF)
- Preview table before download
- Download a single `.xlsx` with one row per PDF
- Missing values are left blank

## Tech Stack

| Layer | Stack |
|-------|--------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| PDF parsing | pdf-parse |
| Excel | xlsx (SheetJS) |

## Project Structure

```
pdf-measurement-extractor/
├── backend/
│   └── src/
│       ├── server.js
│       ├── routes/api.js
│       ├── parsers/measurementParser.js
│       ├── services/pdfService.js
│       └── exporters/excelExporter.js
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/client.js
        └── components/
```

## Setup

```bash
cd pdf-measurement-extractor
npm run install:all
```

## Run (Development)

**Terminal 1 — API (port 3001):**

```bash
npm run dev:backend
```

**Terminal 2 — UI (port 5173):**

```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173).

## Run (Production)

Build the frontend and run a single backend process that serves both API and UI:

```bash
cd pdf-measurement-extractor
npm run build
NODE_ENV=production npm start
```

On Windows PowerShell:

```powershell
cd pdf-measurement-extractor
npm run build
$env:NODE_ENV=\"production\"; npm start
```

Then open [http://localhost:3001](http://localhost:3001).

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/process` | `multipart/form-data` field `pdfs` — returns `{ results: [...] }` |
| `POST` | `/api/export` | JSON body `{ results: [...] }` — returns `.xlsx` file |
| `GET` | `/health` | Health check |

## Parser Test

```bash
npm run test:parser
```

## Usage Flow

1. Drop or select one or more PDF measurement reports.
2. Click **Process Files** — values are extracted and shown in the preview table.
3. Click **Download Excel** — saves `measurements.xlsx`.

## Regex Patterns

The parser normalizes whitespace and applies:

- Roundness: `Roundness ... : <value> µm`
- Harmonics: full table — header row `N+0 N+1 N+2 ...` plus value row (line-based parsing)
- RMS: `RMS1|RMS2|RMS3` with optional `µm/s` unit

If your PDF layout differs slightly, adjust patterns in `backend/src/parsers/measurementParser.js`.
