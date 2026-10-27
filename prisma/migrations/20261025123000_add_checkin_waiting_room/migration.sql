-- AlterTable
ALTER TABLE "lookup_rate_limits" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "checkin_waiting_room" TEXT,
ALTER COLUMN "updated_at" DROP DEFAULT;
