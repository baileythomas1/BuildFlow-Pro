-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hourly_rate" DECIMAL(8,2);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_assignments_project_id_idx" ON "project_assignments"("project_id");

-- CreateIndex
CREATE INDEX "project_assignments_user_id_idx" ON "project_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_project_id_user_id_key" ON "project_assignments"("project_id", "user_id");

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
