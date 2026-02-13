-- AlterTable (table name must match init migration: "Restaurant")
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "onboarding_step" TEXT;
