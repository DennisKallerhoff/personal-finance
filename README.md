# Haushaltsbuch

Personal finance consolidation app.

## Architecture

- **Backend**: Supabase Cloud
- **Frontend**: React + Vite (local dev, Cloudflare Pages for production)

## Setup

### Prerequisites
- Node.js 20+
- Supabase CLI (`npm install -g supabase`) — for migrations only

### Start Frontend
```bash
cd web
cp .env.local.example .env.local
# .env.local already has correct Supabase URL, add your publishable key
npm install
npm run dev
```

Open http://localhost:5173

### Create User
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → enter email + password

## Development

- Frontend: `cd web && npm run dev`
- Supabase Dashboard: https://supabase.com/dashboard/project/oqubliidjczuahwogscv
- Migrations: `supabase db push` (after creating migrations in supabase/migrations/)

## Deployment (Later)

Frontend deploys to Cloudflare Pages with same env vars.
Backend already on Supabase Cloud — no changes needed.
