-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE');

-- CreateEnum
CREATE TYPE "FeeBalanceStatus" AS ENUM ('CLEAR', 'PENDING', 'OVERDUE');

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "monthlyFee" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dueDay" INTEGER NOT NULL DEFAULT 10,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "feeBalanceId" TEXT NOT NULL,
    "feeStructureId" TEXT,
    "billingMonth" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceBeforePayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAfterPayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "referenceNo" TEXT,
    "remarks" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "studentNameSnapshot" TEXT,
    "rollNoSnapshot" TEXT,
    "batchNameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeBalance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "feeStructureId" TEXT,
    "lastChargedMonth" TEXT,
    "totalCharged" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overdueAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "FeeBalanceStatus" NOT NULL DEFAULT 'CLEAR',
    "dueDate" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeStructure_batchId_effectiveFrom_effectiveTo_idx" ON "FeeStructure"("batchId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "FeeStructure_batchId_isActive_idx" ON "FeeStructure"("batchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructure_batchId_effectiveFrom_key" ON "FeeStructure"("batchId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_receiptNumber_key" ON "FeePayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "FeePayment_studentId_paymentDate_idx" ON "FeePayment"("studentId", "paymentDate");

-- CreateIndex
CREATE INDEX "FeePayment_billingMonth_idx" ON "FeePayment"("billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "FeeBalance_studentId_key" ON "FeeBalance"("studentId");

-- CreateIndex
CREATE INDEX "FeeBalance_batchId_status_idx" ON "FeeBalance"("batchId", "status");

-- CreateIndex
CREATE INDEX "FeeBalance_dueDate_status_idx" ON "FeeBalance"("dueDate", "status");

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeBalanceId_fkey" FOREIGN KEY ("feeBalanceId") REFERENCES "FeeBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeBalance" ADD CONSTRAINT "FeeBalance_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
