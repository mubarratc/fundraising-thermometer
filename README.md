# Fundraising Thermometer

## Overview
A real-time fundraising dashboard that integrates with the CharityStack Public API to display donation progress. Features a thermometer visualization, QR code for donations, and live donor feed.

## Tech Stack
- **Frontend**: React (TypeScript), Tailwind CSS, Shadcn UI, Framer Motion
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **External API**: CharityStack Public API (donations, webhooks)
- **Routing**: Wouter
- **Data Fetching**: TanStack React Query

## Project Structure
- `client/src/pages/home.tsx` — Main dashboard with thermometer, QR code, donation feed
- `client/src/pages/not-found.tsx` — 404 page
- `client/src/App.tsx` — Router setup
- `server/routes.ts` — API routes (config, donations, webhooks)
- `server/storage.ts` — Database storage interface
- `shared/schema.ts` — Drizzle schema (config table)

## Key Features
- Real-time donation tracking with 30-second polling
- Thermometer visualization showing progress toward goal
- QR code for easy donation access
- Recent supporters feed with donor names and amounts
- Settings dialog to configure form ID and goal amount
- Webhook support for real-time donation notifications

## Configuration
- `formId`: CharityStack donation form ID (stored in DB config)
- `goalAmount`: Fundraising goal in dollars (stored in DB config)
- CharityStack API key is hardcoded in `server/routes.ts`

## Running
- `npm run dev` starts both Express backend and Vite frontend on port 5000
