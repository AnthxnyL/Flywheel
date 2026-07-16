-- AlterTable Vehicle: add missing columns
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "year" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "licensePlate" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "initialMileage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Vehicle" ALTER COLUMN "driverId" DROP NOT NULL;

-- CreateEnum LogEntryType
DO $$ BEGIN
  CREATE TYPE "LogEntryType" AS ENUM ('MAINTENANCE', 'REPAIR', 'INSPECTION', 'MILEAGE', 'NOTE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable NotificationPreference
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "remindJ30" BOOLEAN NOT NULL DEFAULT true,
    "remindJ7" BOOLEAN NOT NULL DEFAULT true,
    "remindJ1" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateTable PushSubscription
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- CreateTable MileageRecord
CREATE TABLE IF NOT EXISTS "MileageRecord" (
    "id" TEXT NOT NULL,
    "mileage" INT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "vehicleId" TEXT NOT NULL,
    "recordedById" TEXT,
    CONSTRAINT "MileageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable VehicleLogEntry
CREATE TABLE IF NOT EXISTS "VehicleLogEntry" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "LogEntryType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mileageAtEvent" INTEGER,
    "cost" DOUBLE PRECISION,
    "documentUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable Invoice
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "label" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable MaintenancePlanItem
CREATE TABLE IF NOT EXISTS "MaintenancePlanItem" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "intervalKm" INTEGER,
    "intervalMonths" INTEGER,
    "lastDoneKm" INTEGER,
    "lastDoneDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenancePlanItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MileageRecord" ADD CONSTRAINT "MileageRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MileageRecord" ADD CONSTRAINT "MileageRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleLogEntry" ADD CONSTRAINT "VehicleLogEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleLogEntry" ADD CONSTRAINT "VehicleLogEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenancePlanItem" ADD CONSTRAINT "MaintenancePlanItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
