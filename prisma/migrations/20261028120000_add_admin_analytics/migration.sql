-- Lookup analytics for the admin dashboard. No IP or client data is stored.
CREATE TABLE "lookup_events" (
    "id" BIGSERIAL NOT NULL,
    "student_code" VARCHAR(16),
    "outcome" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lookup_events_created_at_idx" ON "lookup_events"("created_at");
CREATE INDEX "lookup_events_student_code_idx" ON "lookup_events"("student_code");

-- Admin changes to student records.
CREATE TABLE "admin_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "student_code" VARCHAR(16),
    "detail" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");
