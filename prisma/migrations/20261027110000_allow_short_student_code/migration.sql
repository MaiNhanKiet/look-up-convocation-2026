ALTER TABLE "students"
  DROP CONSTRAINT IF EXISTS "students_student_code_format_chk";

ALTER TABLE "students"
  ADD CONSTRAINT "students_student_code_format_chk"
  CHECK ("student_code" ~ '^[HQDSC][EAS]([0-9]{6}|[5-9][0-9]{4})$');
