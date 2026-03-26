-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "PayrollDeductionType" AS ENUM ('LEAVE', 'ADVANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollPaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollAuditAction" AS ENUM ('GENERATED', 'PAYMENT_RECORDED');

-- CreateTable
CREATE TABLE "TeacherSalary" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSalary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "teacherSalaryId" TEXT,
    "payrollMonth" TEXT NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" "PayrollPaymentMethod",
    "paymentReference" TEXT,
    "remarks" TEXT,
    "teacherNameSnapshot" TEXT,
    "regNoSnapshot" TEXT,
    "designationSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollDeduction" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "payrollRecordId" TEXT,
    "payrollMonth" TEXT NOT NULL,
    "deductionType" "PayrollDeductionType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAuditLog" (
    "id" TEXT NOT NULL,
    "payrollRecordId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" "PayrollAuditAction" NOT NULL,
    "amount" DECIMAL(12,2),
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherSalary_teacherId_effectiveFrom_effectiveTo_idx" ON "TeacherSalary"("teacherId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "TeacherSalary_teacherId_isActive_idx" ON "TeacherSalary"("teacherId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSalary_teacherId_effectiveFrom_key" ON "TeacherSalary"("teacherId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PayrollRecord_payrollMonth_status_idx" ON "PayrollRecord"("payrollMonth", "status");

-- CreateIndex
CREATE INDEX "PayrollRecord_teacherId_payrollMonth_idx" ON "PayrollRecord"("teacherId", "payrollMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_teacherId_payrollMonth_key" ON "PayrollRecord"("teacherId", "payrollMonth");

-- CreateIndex
CREATE INDEX "PayrollDeduction_teacherId_payrollMonth_idx" ON "PayrollDeduction"("teacherId", "payrollMonth");

-- CreateIndex
CREATE INDEX "PayrollDeduction_payrollRecordId_idx" ON "PayrollDeduction"("payrollRecordId");

-- CreateIndex
CREATE INDEX "PayrollAuditLog_payrollRecordId_createdAt_idx" ON "PayrollAuditLog"("payrollRecordId", "createdAt");

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_teacherSalaryId_fkey" FOREIGN KEY ("teacherSalaryId") REFERENCES "TeacherSalary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDeduction" ADD CONSTRAINT "PayrollDeduction_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "PayrollRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAuditLog" ADD CONSTRAINT "PayrollAuditLog_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "PayrollRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
