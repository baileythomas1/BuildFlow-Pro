-- CreateTable
CREATE TABLE "status_comments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "status_comments_project_id_idx" ON "status_comments"("project_id");

-- AddForeignKey
ALTER TABLE "status_comments" ADD CONSTRAINT "status_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_comments" ADD CONSTRAINT "status_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
