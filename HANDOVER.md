# GMC Web System — Project Handover & System Architecture Guide

> **Target Audience:** Any new developer, software engineer, or AI assistant taking over the GMC Web System. This document serves as the complete source of truth regarding architecture, design decisions, resolved pitfalls, open tasks, and operational guardrails.

---

## 1. What This System Does

### 1.1 Purpose & Problem Statement
The **Good Moral Certificate (GMC) Web System** is an institutional web application developed for **National University Fairview (NU Fairview)**. Prior to this system, students requesting a Good Moral Certificate had to queue in person at the Student Discipline Office (SDO), submit manual receipts, and wait days for physical paperwork.

The system automates and streamlines this process:
1. **Students** submit requests online, input their student details, specify their purpose, provide their cashier invoice/receipt number, and upload an image of their official receipt.
2. **Discipline Office Staff** review the submission through a 3-step guided wizard, verify payment, toggle disciplinary record status, and approve/generate the certificate.
3. **Certificates** are rendered and converted to high-fidelity PDF documents using official university formatting.
4. **Students** track their request status in real time using their Reference Number and email, and collect their signed, sealed physical certificate from the Discipline Office.

### 1.2 User Personas & Roles
* **Public / Student:** Unauthenticated public users who access `/` to submit a request and `/track-request` to query status.
* **Discipline Office Staff (`DISCIPLINE_OFFICE_STAFF`):** Authenticated staff members who review pending requests, check receipts, and release certificates.
* **Administrator (`ADMIN`):** Privileged staff who can additionally manage user accounts (`/staff/users`), change roles, activate/deactivate accounts, and manage system terms.

### 1.3 Request Lifecycle States
```mermaid
stateDiagram-v2
    [*] --> PENDING: Student Submits Request
    PENDING --> REJECTED: Staff Rejects (Wrong info / duplicate / invalid receipt)
    PENDING --> RETURNED: Staff Returns for student clarification
    PENDING --> APPROVED: Staff Validates Request (Step 1)
    APPROVED --> GENERATED: Certificate Generated & Previewed (Step 2)
    GENERATED --> RELEASED: Certificate Released for Pickup (Step 3)
    RELEASED --> [*]
```

---

## 2. Tech Stack & Architecture

### 2.1 Core Technologies
* **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions & API Route Handlers, React 19)
* **Language:** [TypeScript 5](https://www.typescriptlang.org/) (strict typing enforced via `pnpm typecheck`)
* **Database & ORM:** PostgreSQL hosted on [Neon](https://neon.tech/) (Serverless Postgres with connection pooling) queried via [Prisma ORM 6.19](https://www.prisma.io/)
* **File Storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) in production; local disk storage (`localStorageService`) in development
* **PDF Rendering:** [Puppeteer Core](https://pptr.dev/) with [@sparticuz/chromium](https://github.com/Sparticuz/chromium) on Vercel Serverless Functions
* **Authentication:** Custom cryptographically secure session cookies, SHA-256 token hashes in DB, `bcryptjs` for password hashing
* **Styling:** Tailwind CSS with custom NU brand colors (Bulldog Blue `#102040`, Gold `#F29F67` / `#E0B50F`, Slate dark `#1E1E2C`)
* **Package Manager:** `pnpm` (Node.js engine target `24.x`)

### 2.2 Critical Infrastructure Warning (Shared Database)
> [!CAUTION]
> **THERE IS NO SEPARATE STAGING DATABASE.**
> Local development (`.env`) and production (Vercel environment variables) **both point to the exact same Neon Postgres production instance**.
> Any destructive database command (e.g. `prisma migrate reset`, unconstrained `deleteMany()`, manual test seeds) directly modifies live data. Always double-check queries and avoid executing destructive scripts against the database.

### 2.3 Key File & Folder Map
```text
gmc-web-system/
├── prisma/
│   ├── schema.prisma              # Database schema definitions
│   ├── seed.ts                    # Database seeder
│   └── migrations/                # Tracked SQL migration history
├── src/
│   ├── app/
│   │   ├── (protected)/staff/     # Authenticated back-office dashboard
│   │   │   ├── layout.tsx         # Session validation & forced password change gate
│   │   │   ├── requests/          # Request queue & management workspace
│   │   │   ├── issued-certificates/ # Archive of released certificates
│   │   │   ├── users/             # Admin-only user management
│   │   │   └── change-password/   # Forced/self-service password update
│   │   ├── api/
│   │   │   ├── gmc-requests/      # Public intake API & check-invoice route
│   │   │   ├── private-files/     # Secure file download proxy (requires staff auth)
│   │   │   ├── cron/cleanup-retention/ # 30-day retention purge cron job
│   │   │   └── staff/             # Internal staff processing & session endpoints
│   │   ├── page.tsx               # Public request form page
│   │   ├── request-form-client.tsx # Client-side form with immediate magic-byte validation
│   │   └── track-request/         # Public request lookup page
│   ├── components/
│   │   ├── staff/                 # Staff workspace modals, tables, and toolbars
│   │   │   └── staff-request-process-modal.tsx # 3-step wizard (Validate -> Review -> Release)
│   │   └── public/                # Public header, footer, branding components
│   ├── lib/
│   │   ├── gmc-request/           # Intake validation, constants, and options
│   │   ├── storage/               # StorageService abstraction (Blob vs Local)
│   │   ├── staff-session.ts       # Session creation, SHA-256 hashing, verification
│   │   └── prisma.ts              # Global singleton Prisma client
│   ├── server/services/           # Core backend business logic services
│   │   ├── gmc-request-intake-service.ts  # Atomic submission handler
│   │   ├── gmc-request-process-service.ts # Wizard step mutations
│   │   └── certificate-pdf-service.ts     # PDF compilation & on-demand regeneration
│   └── templates/
│       └── gmc-certificate-template.ts    # Official NU Fairview certificate HTML/CSS
└── vercel.json                    # Cron job schedule definitions (cleanup-retention at 02:00 daily)
```

---

## 3. Data Model Summary

Defined in [`prisma/schema.prisma`](file:///c:/Users/cjaur/Downloads/gmc-web-system/prisma/schema.prisma):

```mermaid
erDiagram
    Student ||--o{ GmcRequest : "submits"
    GmcRequest ||--o| Certificate : "generates"
    GmcRequest ||--o{ AuditLogEntry : "audited by"
    StaffUser ||--o{ GmcRequest : "reviews"
    StaffUser ||--o{ AuditLogEntry : "acts as"
    StaffUser ||--o{ StaffSession : "holds"

    Student {
        string studentId PK
        string firstName
        string middleInitial
        string lastName
        string courseProgram
        string academicYear
        string email
    }

    GmcRequest {
        uuid id PK
        string requestReferenceNumber UK
        string studentId FK
        string officialReceiptNumber
        string paymentProofFileUrl
        enum status
        boolean hasViolationRecord
        datetime dateSubmitted
        datetime dateReleased
        uuid reviewedById FK
    }

    Certificate {
        uuid id PK
        uuid gmcRequestId FK,UK
        string certificateNumber UK
        string generatedPdfUrl
        string previewHtml
        string authorizedSignatory
        string officeDesignation
        datetime dateOfIssuance
    }

    StaffUser {
        uuid id PK
        string email UK
        string passwordHash
        boolean mustChangePassword
        boolean isActive
        enum role
    }

    AuditLogEntry {
        uuid id PK
        uuid gmcRequestId FK
        uuid actorId FK
        string action
        datetime timestamp
        string notes
    }

    NumberingCounter {
        uuid id PK
        enum kind
        string period
        int currentSequence
    }

    SystemSetting {
        string key PK
        string value
        datetime updatedAt
    }
```

### Key Data Model Nuances:
1. **`Student.email` uniqueness was removed:** Originally `email String @unique` was on `Student`. If a student re-submitted or a tester submitted multiple requests with different student IDs using the same email, Prisma raised `P2002 Unique constraint failed`. Removing `@unique` fixed this; `studentId` is the sole primary key.
2. **`Certificate.previewHtml` is permanent:** The exact HTML generated during review is permanently preserved in the database. Even when the PDF file is deleted from cloud storage after 30 days, the certificate can be recreated on the fly with 100% fidelity.
3. **Atomic Monthly Sequencing (`NumberingCounter`):** Uses an atomic PostgreSQL upsert (`INSERT ... ON CONFLICT ("kind", "period") DO UPDATE SET currentSequence = currentSequence + 1 RETURNING currentSequence`) to guarantee gapless reference (`GMC-YYYY-MM-XXXXXX`) and certificate (`YYYY-MM-XXXXXX`) numbers without race conditions.

---

## 4. Authentication & Access Control

### 4.1 How Authentication Works
* Login endpoint: `POST /api/staff/session`
* Accepts `email` and `password`. Looks up active `StaffUser` by lowercase email.
* Verifies password against `passwordHash` using `bcrypt.compare`.
* Generates a 32-byte cryptographically random token (`crypto.randomBytes(32)`).
* Computes `tokenHash = crypto.createHash("sha256").update(token).digest("hex")` and stores it in `StaffSession`.
* Returns `token` in an `HttpOnly`, `SameSite=Strict`, `Secure` cookie named `gmc_staff_session` (valid for 12 hours).

### 4.2 Forced Password Change Gate
* Any account created with `mustChangePassword: true` is intercepted in `src/app/(protected)/staff/layout.tsx`.
* If `mustChangePassword === true` and the requested pathname is not `/staff/change-password`, the layout immediately redirects to `/staff/change-password` and renders a restricted view without navigation links.
* Once the password is changed, `mustChangePassword` is flipped to `false`.

### 4.3 Role-Based Access Control (RBAC)
* Roles: `DISCIPLINE_OFFICE_STAFF` vs `ADMIN`.
* User management (`/staff/users` and `/api/staff/users`) requires `role === "ADMIN"`. Non-admin staff are redirected to `/staff`.

### 4.4 Staff Account Status Check (As of September 2026)
| Name | Email | Role | `mustChangePassword` | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AMADEUS** | `cjaureo@nufv.edu` | `DISCIPLINE_OFFICE_STAFF` | `false` | ⚠️ **Active Dev Account** |
| Mishel T. Burigsay | `mtburigsay@nu-fairview.edu.ph` | `ADMIN` | `true` | Active Institutional Admin |
| Sheila Marie R. Relles | `smrrelles@nu-fairview.edu.ph` | `ADMIN` | `true` | Active Institutional Admin |
| Lawrence Sadac Paloma | `lspaloma@nu-fairview.edu.ph` | `ADMIN` | `false` | Active Institutional Admin |

> [!WARNING]
> The **`AMADEUS`** developer account (`cjaureo@nufv.edu`) is currently active. Before handing over the system for production pilot use, deactivate or delete this account via `/staff/users` to ensure only verified staff have access.

---

## 5. Key Workflows Already Built

### 5.1 Public Request Submission Flow
1. Student fills out the form at `/`.
2. **Academic Year & Term:** Automatically pulled from the `SystemSetting` table in Neon Postgres (defaults: `2026-2027`, `Term 1`).
3. **Receipt Validation:**
   - Text input validated against `INVOICE_NUMBER_PATTERN = /^INV01-\d{9,12}$/i`.
   - On field blur and submit, performs an asynchronous duplicate check against `/api/gmc-requests/check-invoice` using case-insensitive matching (`mode: "insensitive"`).
4. **File Upload & Magic-Byte Validation:**
   - Restricted to `.jpg` / `.jpeg` files up to 5 MB.
   - **Immediate client-side check:** On selecting a file, `handlePaymentProofChange` reads the first 8 bytes. If magic bytes are not `0xFF 0xD8 0xFF`, the file input is cleared immediately and shows an error: *"Only JPG/JPEG files are accepted. Please remove this file and upload a JPEG photo of your receipt."*
   - **Authoritative server check:** `validatePaymentProofFile` repeats magic byte verification on the server.
5. **Atomic Intake Transaction:**
   - File uploaded to storage -> database transaction runs (`tx.student.upsert`, `tx.gmcRequest.create`, `tx.auditLogEntry.create`).
   - If the database write fails, the catch block automatically deletes the uploaded file from storage (`storageService.delete(uploadedProof.key)`), preventing orphaned storage blobs.

### 5.2 Staff 3-Step Guided Review Wizard
Located in [`src/components/staff/staff-request-process-modal.tsx`](file:///c:/Users/cjaur/Downloads/gmc-web-system/src/components/staff/staff-request-process-modal.tsx):

* **Step 1: Validate Request**
  - Displays student details, course program, and Official Receipt Number.
  - **Payment Proof Viewer:** Renders a 120×80px thumbnail with skeleton loading. Clicking opens a high-z-index (`z-[200]`) lightbox overlay.
  - **Payment Proof Missing Distinction:**
    - *Case A (Predates Cutoff `< 2026-09-04T00:00:00+08:00`):* Completely hidden / silent (for legacy/transitional requests).
    - *Case B (Missing after Cutoff):* Shows an amber warning: *"No payment proof file found for this request — verify before proceeding."*
    - *Case C (Fetch failure / 404):* Thumbnail shows "Unavailable" with an amber note: *"Payment proof file could not be loaded — verify receipt manually."*
  - **Violation Record Toggle:** Explicit mandatory choice:
    - **No Violation:** Certificate states: *"is of good moral character and has no derogatory records, nor has he been subjected to any disciplinary action while a student at university."*
    - **Has Violation:** Certificate states: *"has a derogatory record and/or has been subjected to disciplinary action while a student at university."*
* **Step 2: Review Certificate**
  - Generates and embeds the live HTML preview of the certificate with authorized signatory (`Sheila Marie R. Relles`) and office designation (`Discipline Office Head`).
* **Step 3: Release**
  - Prompts confirmation, marks status `RELEASED`, sets `dateReleased = now()`, and creates a release audit entry.

### 5.3 On-Demand PDF Regeneration
* Route: `/api/private-files?url=...`
* If a requested certificate PDF has been purged from Vercel Blob storage, the endpoint catches `BlobNotFoundError` and calls `regenerateCertificatePdfOnDemand()`.
* The service recompiles the PDF directly from the immutable `Certificate.previewHtml` stored in the database, uploads the newly rendered PDF, updates `generatedPdfUrl`, logs `CERTIFICATE_PDF_REGENERATED_ON_DEMAND`, and streams the file to the staff user.

### 5.4 30-Day Retention Cleanup Cron
* Route: `/api/cron/cleanup-retention` (scheduled daily at 02:00 via `vercel.json`).
* Secured with `Bearer ${CRON_SECRET}`.
* Requests released or rejected > 30 days ago:
  - Deletes receipt images from Blob and sets `GmcRequest.paymentProofFileUrl = null`.
  - Deletes cached certificate PDFs from Blob (leaving `Certificate.previewHtml` intact for on-demand regeneration).

---

## 6. Known Open Items (Do Not Omit)

1. **Invoice Number Pattern Confirmation:**
   - Current pattern: `/^INV01-\d{9,12}$/i` (e.g. `INV01-12345678901`).
   - *Status:* This format was implemented based on sample documentation. Staff should compare this against 5–10 real physical receipts from the cashier to verify the prefix (`INV01-`) and length constraints.
2. **Email Delivery is in Stub Mode:**
   - Outbound transactional emails are handled by `ConsoleEmailService`, which only prints to stdout/logs. No actual SMTP or Microsoft Graph emails are sent.
   - All certificates are distributed via **in-person pickup** at the Discipline Office. Students check their progress at `/track-request`.
   - *Microsoft Graph integration was designed but blocked pending institutional Microsoft 365 Azure AD admin approval.*
3. **Neon Database Credential Rotation:**
   - Earlier in the project setup, a database connection URL was pasted in development logs.
   - *Action needed:* Generate a new connection password in the Neon Console and update `DATABASE_URL` and `DIRECT_URL` in Vercel before the public launch.
4. **Institutional Ownership Handover:**
   - The GitHub repo (`azure-cj/gmc-web-nufv`), Vercel deployment, and Neon database are currently under developer accounts.
   - *Action needed:* Transfer project repositories and subscriptions to official NU Fairview IT / SDO credentials.
5. **Schema Migration Tracking:**
   - The recent schema changes (`paymentProofFileUrl` made optional, and `Student.email` `@unique` removed) were applied directly using `prisma db push`.
   - *Action needed:* If strict `prisma migrate deploy` is required in the future, run `prisma migrate dev --name reconcile_schema` in a local dev environment to generate the SQL migration file.

---

## 7. History of Significant Bugs Fixed (Do Not Reintroduce)

| Bug | Root Cause | Fix Applied / Rule Going Forward |
| :--- | :--- | :--- |
| **Serverless Chromium Crash on Vercel** | Bundlers (Turbopack/Webpack) tried to bundle `@sparticuz/chromium` `.tar` binaries into serverless functions, corrupting binary paths. | Configured `serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core']` in `next.config.mjs` and used `.vercel-chromium-bin/` asset copying scripts. **Do not remove `serverExternalPackages`.** |
| **Forced-Password-Change Redirect Loop** | Layout checked `mustChangePassword` and redirected to `/staff/change-password`, but the route itself also loaded the layout, causing an infinite loop. | Inspected `x-pathname` header in `src/app/(protected)/staff/layout.tsx`. If path is `/staff/change-password`, the redirect is bypassed and the minimal form renders. |
| **File Upload Crash & Orphaned Blobs** | Uploading files before database transaction succeeded resulted in storage files with no matching database records when transactions aborted. | Implemented atomic flow in `gmc-request-intake-service.ts`: storage upload is tracked and explicitly deleted in the `catch` block if database commit fails. |
| **`Student.email` P2002 Crash on Second Submission** | Model `Student` had `email String @unique`. Submitting two test requests with different student IDs but the same email crashed the database write with a unique constraint violation. | Removed `@unique` constraint from `Student.email`. Student primary key is strictly `studentId`. Request records capture their own `studentEmail`. |
| **Duplicate App Folder Deployment Confusion** | An outdated `/frontend` directory existed from early prototyping, causing deployment confusion on Vercel. | Deleted `/frontend` and established the root repository directory as the definitive Next.js application root. |

---

## 8. How to Run, Test, and Deploy

### 8.1 Prerequisites
* Node.js `24.x` (or LTS `>= 20.x`)
* `pnpm` (`v11.7.0` recommended)

### 8.2 Environment Variables (`.env`)
```bash
# Database (Neon Postgres)
DATABASE_URL="postgresql://neondb_owner:***@ep-calm-night-az3uruyq.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:***@ep-calm-night-az3uruyq.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# File Storage (Vercel Blob in Prod, Local in Dev)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_***"

# Cron Security
CRON_SECRET="your_secret_cron_key"

# Vercel Environment (automatically set by Vercel in production)
# VERCEL="1"
```

### 8.3 Essential Development Commands
```powershell
# 1. Install dependencies and prepare assets
pnpm install

# 2. Run local development server
pnpm dev

# 3. Typecheck codebase (must pass with 0 errors)
pnpm typecheck

# 4. Run linter
pnpm lint

# 5. Open Prisma Studio to inspect database records
pnpm db:studio

# 6. Apply schema changes safely
npx prisma db push
npx prisma generate
```

### 8.4 Deployment to Vercel
Deployment is automated via GitHub integration:
1. Ensure all TypeScript checks pass: `pnpm typecheck`.
2. Commit your changes: `git commit -m "..."`.
3. Push to `main`: `git push origin main`.
4. Vercel automatically detects the push, runs `scripts/next-build.mjs`, bundles serverless functions, and promotes the deployment.
