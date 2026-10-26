-- Object keys stay in PostgreSQL. Signed URLs are issued per lookup and are not stored.

ALTER TABLE "students" RENAME COLUMN "led_image_path" TO "led_image_key";
