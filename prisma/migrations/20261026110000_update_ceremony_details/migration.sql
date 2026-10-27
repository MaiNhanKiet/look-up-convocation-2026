-- Preserve existing room assignments while aligning the column name with the UI.
ALTER TABLE "students" RENAME COLUMN "checkin_waiting_room" TO "checkin_room";

-- Remove the obsolete zone and add the new ceremony detail fields.
ALTER TABLE "students"
  DROP COLUMN "checkin_zone",
  ADD COLUMN "checkin_time" TEXT,
  ADD COLUMN "contact_group" TEXT;
