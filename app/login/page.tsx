"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { FormField } from "@/components/FormField";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-off-white px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-slate/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy">Log in</h1>
        <p className="mt-1 text-sm text-slate/70">Welcome back to BuildFlow Pro.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <FormField label="Email" type="email" value={email} onChange={setEmail} required />
          <FormField label="Password" type="password" value={password} onChange={setPassword} required />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-orange px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate/70">
          Need a company account?{" "}
          <Link href="/signup" className="font-medium text-sky hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
