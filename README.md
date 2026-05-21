# GoComet British Auction RFQ System

A full-stack RFQ reverse-auction application built for the GoComet assignment. It implements the required British auction flow, automatic bid-window extensions, supplier ranking, activity audit logs, and a polished procurement dashboard.

## Highlights

- RFQ creation with auction window, forced close, trigger window, extension duration, lane, cargo, volume, pickup date, and budget.
- British auction bidding where only lower bids are accepted and ranked as L1, L2, L3 by price, timestamp, and bid ID.
- Automatic close-time extension using `new_close_time = min(current_close_time + Y, forced_close_time)`.
- Trigger modes: `BID_RECEIVED`, `ANY_RANK_CHANGE`, and `L1_CHANGE_ONLY`.
- Strict server-side validation for bid start, current close, forced close, and lower-bid rules.
- Activity log for bid submissions, close extensions, and status transitions.
- Procurement intelligence dashboard with risk flags, tracked savings, lane savings, supplier competition, and bid simulation.
- Zero-config SQLite backend, so reviewers do not need MySQL or any external database.

## Tech Stack

- Backend: Node.js, Express, better-sqlite3
- Frontend: React, Vite, React Router, lucide-react
- Database: SQLite file at `backend/db/auction.db`

## Run Locally

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Start backend:

```bash
cd backend
npm run dev
```

Start frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

The frontend expects the backend at `http://localhost:5000/api` by default. To use another backend port:

```bash
set VITE_API_BASE=http://localhost:5050/api
npm run dev
```

## API Surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/rfq/create` | Create RFQ auction |
| GET | `/api/rfq` | List RFQs with live analytics |
| GET | `/api/rfq/:id` | RFQ details, bids, events, analytics |
| POST | `/api/rfq/:id/bid` | Submit supplier bid |
| GET | `/api/rfq/:id/bids` | Get ranked bids |
| GET | `/api/rfq/:id/events` | Get activity log |
| GET | `/api/insights/dashboard` | Control-tower metrics |
| POST | `/api/insights/rfq/:id/simulate` | Preview bid rank and extension impact |

## Verification

Useful commands:

```bash
cd frontend
npm run lint
npm run build
```

The backend initializes its schema automatically on startup.
