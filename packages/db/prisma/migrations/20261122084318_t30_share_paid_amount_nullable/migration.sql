/*
  Warnings:

  - You are about to drop the column `paid_amount` on the `member_share_applications` table. All the data in the column will be lost.
  - You are about to drop the column `payment_due` on the `member_share_applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "member_share_applications" DROP COLUMN "paid_amount",
DROP COLUMN "payment_due",
ADD COLUMN     "share_paid_amount" DECIMAL(18,2);
