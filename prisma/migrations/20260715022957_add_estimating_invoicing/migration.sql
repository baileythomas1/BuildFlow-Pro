/*
  Warnings:

  - Added the required column `description` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "estimates" ALTER COLUMN "total" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "stripe_session_id" TEXT;

-- CreateTable
CREATE TABLE "change_orders" (
    "id" UUID NOT NULL,
    "estimate_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_order_line_items" (
    "id" UUID NOT NULL,
    "change_order_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "markup" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "change_orders_estimate_id_idx" ON "change_orders"("estimate_id");

-- CreateIndex
CREATE INDEX "change_order_line_items_change_order_id_idx" ON "change_order_line_items"("change_order_id");

-- AddForeignKey
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_order_line_items" ADD CONSTRAINT "change_order_line_items_change_order_id_fkey" FOREIGN KEY ("change_order_id") REFERENCES "change_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
