CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "SystemSetting" ("key", "value", "updatedAt") VALUES
    ('current_academic_year', '2026-2027', NOW()),
    ('current_term', 'Term 1', NOW())
ON CONFLICT ("key") DO NOTHING;
