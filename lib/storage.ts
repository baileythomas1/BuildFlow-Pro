import { createClient } from "@supabase/supabase-js";

// Server-only: SUPABASE_SERVICE_KEY must never reach the client bundle.
// This module is only imported from route handlers.
const BUCKET = "project-files";
const SIGNED_URL_TTL_SECONDS = 60;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_KEY"));
}

let bucketEnsured = false;

// Idempotent: creates the bucket as private (public: false) the first time
// it's needed, so "never public buckets" is enforced in code rather than
// relying on someone having configured the dashboard correctly.
async function ensureBucketExists() {
  if (bucketEnsured) return;
  const supabase = getClient();
  const { data: existing } = await supabase.storage.getBucket(BUCKET);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw error;
    }
  }
  bucketEnsured = true;
}

export async function uploadFile(path: string, bytes: Buffer, contentType: string) {
  await ensureBucketExists();
  const supabase = getClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
}

export async function getSignedDownloadUrl(path: string): Promise<string> {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw error ?? new Error("Failed to create signed URL");
  return data.signedUrl;
}

export async function deleteFile(path: string) {
  const supabase = getClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
