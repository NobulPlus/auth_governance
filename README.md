# Authentication Governance Prototype

Starter web app scaffold for your CSC312 project:
- Access request workflow
- Approval routing
- Role and account lifecycle management
- Periodic access reviews
- Audit logging visibility

## Stack
- Next.js (App Router) + TypeScript
- PostgreSQL
- Prisma ORM
- NextAuth (credentials provider scaffold)

## Local Setup (No Docker Required)
1. Create a PostgreSQL database named `auth_governance`.
2. Update `.env` if your Postgres username/password/port differ.
3. Generate Prisma client:
```bash
npm run prisma:generate
```
4. Run migrations:
```bash
npm run prisma:migrate
```
5. Seed demo users:
```bash
npm run db:seed
```
6. Start the app:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Credentials
- Admin: `admin@group7.local` / `Admin123!`
- Staff: `staff@group7.local` / `Staff123!`

## App Modules (Scaffolded)
- `/` dashboard
- `/login`
- `/requests`
- `/reviews`
- `/users`
- `/audit`

## Should We Use Docker?
For your current setup, no. Since you already have PostgreSQL installed, local DB is faster for development.
Add Docker later for:
- teammate onboarding consistency
- CI/CD parity
- one-command local environment
