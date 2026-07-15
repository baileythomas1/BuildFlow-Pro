import { FileVisibility } from "@/lib/generated/prisma/client";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const VISIBILITIES = Object.values(FileVisibility);

export function isValidVisibility(value: unknown): value is FileVisibility {
  return typeof value === "string" && (VISIBILITIES as string[]).includes(value);
}
