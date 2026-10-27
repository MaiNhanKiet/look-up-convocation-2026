-- Add an optional external invitation URL for each graduate.
ALTER TABLE "students" ADD COLUMN "invitation_link" TEXT;
