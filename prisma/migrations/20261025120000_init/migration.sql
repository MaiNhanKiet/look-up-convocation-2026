-- Self-hosted PostgreSQL for the graduation lookup.
-- led_image_path stores an object key for a later MinIO setup. It is not a public URL.

CREATE TABLE "students" (
  "id" BIGSERIAL NOT NULL,
  "student_code" VARCHAR(8) NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT,
  "seat_tcn" TEXT,
  "seat_ph2" TEXT,
  "checkin_zone" TEXT,
  "led_image_path" TEXT,
  "session_label" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "students_student_code_key" ON "students"("student_code");

ALTER TABLE "students"
  ADD CONSTRAINT "students_student_code_format_chk"
  CHECK ("student_code" ~ '^[HQDSC][EAS][0-9]{6}$');

ALTER TABLE "students"
  ADD CONSTRAINT "students_full_name_not_blank_chk"
  CHECK (btrim("full_name") <> '');

CREATE TABLE "lookup_rate_limits" (
  "key_hash" TEXT NOT NULL,
  "window_started_at" TIMESTAMPTZ(6) NOT NULL,
  "request_count" INTEGER NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lookup_rate_limits_pkey" PRIMARY KEY ("key_hash")
);
