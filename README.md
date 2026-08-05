# GMC Web System

Project scaffold for the Good Moral Certificate web system, including the public request intake flow.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma

## What is included in this phase

- Project scaffold
- Prisma data model and initial migration
- Seed script with sample staff users, students, GMC requests, audit logs, and certificates
- Storage, email, and numbering abstractions for later phases
- A minimal health check route at `/api/health`
- Public GMC request form at `/`
- Submission API at `/api/gmc-requests`

## Local setup

1. Install Node.js 24 or newer.
2. Create a PostgreSQL database and set `DATABASE_URL` in `.env`.
3. Copy `.env.example` to `.env` and adjust the connection string.
4. Optionally change `GMC_REQUEST_FEE_PHP` if the submission fee changes.
5. Install dependencies:

```bash
npm install
```

6. Generate the Prisma client:

```bash
npm run prisma:generate
```

7. Apply the initial migration:

```bash
npm run db:migrate
```

8. Seed the database:

```bash
npm run db:seed
```

9. Start the development server:

```bash
npm run dev
```

## Notes

- Uploaded payment proofs and generated PDFs are written through the storage interface to `public/uploads` for now.
- Request reference numbers use `GMC-YYYY-MM-XXXXXX`.
- Certificate numbers use `YYYY-MM-XXXXXX` and are allocated with a database-safe monthly counter.
- Phase 1 now covers the student request form only. Staff screens begin in Phase 2.
