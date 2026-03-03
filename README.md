# CVE Search

A fast, modern web interface for searching and exploring CVE (Common Vulnerabilities and Exposures) records. Built with Next.js and powered by the [CIRCL vulnerability-lookup API](https://vulnerability.circl.lu/).

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

<!-- Add a screenshot: ![CVE Search Screenshot](screenshot.png) -->

## Features

- **Full-text search** — Search CVEs by product name or CVE ID (e.g. `CVE-2024-1234`)
- **Advanced filters** — Filter by vendor, product, CWE, and date range
- **Vendor/product browsing** — Browse vulnerabilities by vendor and product
- **Detailed CVE views** — CVSS scores, EPSS exploit probability, CWE details, references, and linked vulnerabilities
- **Severity indicators** — Color-coded CVSS severity badges (Critical, High, Medium, Low)
- **Paginated results** — Navigate through large result sets
- **Dark theme** — Easy on the eyes for security researchers
- **Responsive design** — Works on desktop and mobile
- **Server-side API proxy** — Avoids CORS issues and caches upstream responses

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/cvesearch.git
cd cvesearch

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/proxy/route.ts    # API proxy to CIRCL backend
│   ├── cve/[id]/page.tsx     # CVE detail page
│   ├── layout.tsx            # Root layout with dark theme
│   ├── page.tsx              # Home page with search + filters
│   └── globals.css           # Global styles
├── components/
│   ├── Header.tsx            # Navigation header
│   ├── SearchBar.tsx         # Search input with CVE ID detection
│   ├── Filters.tsx           # Vendor/product/CWE/date filters
│   ├── CVEList.tsx           # CVE results list
│   ├── CVECard.tsx           # Individual CVE summary card
│   ├── SeverityBadge.tsx     # CVSS severity color badge
│   └── Pagination.tsx        # Page navigation
└── lib/
    ├── api.ts                # API client functions
    ├── types.ts              # TypeScript type definitions
    └── utils.ts              # Utility functions
```

## API

This app uses a server-side proxy (`/api/proxy`) to communicate with the [CIRCL vulnerability-lookup API](https://vulnerability.circl.lu/). The proxy avoids CORS issues and adds 60-second response caching.

### Endpoints Used

| CIRCL Endpoint | Purpose |
|---|---|
| `GET /api/vulnerability/` | List/search vulnerabilities with filters |
| `GET /api/vulnerability/{id}` | Get full CVE details |
| `GET /api/vulnerability/search/{vendor}/{product}` | Search by vendor and product |
| `GET /api/vulnerability/browse/` | List all vendors |
| `GET /api/vulnerability/browse/{vendor}` | List products for a vendor |
| `GET /api/epss/{cve_id}` | Get EPSS exploit probability score |
| `GET /api/cwe/{cwe_id}` | Get CWE weakness details |

All requests go through `/api/proxy?path=<encoded_path>` which forwards to `https://vulnerability.circl.lu/api`.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI:** [React 19](https://react.dev/)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Font:** [Geist](https://vercel.com/font)
- **Data Source:** [CIRCL vulnerability-lookup](https://vulnerability.circl.lu/)

## License

[MIT](./LICENSE)
