"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { FormField } from "@/components/FormField";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(companyName, name, email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-off-white px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-slate/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy">Create your company</h1>
        <p className="mt-1 text-sm text-slate/70">Set up BuildFlow Pro for your team.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <FormField label="Company name" value={companyName} onChange={setCompanyName} required />
          <FormField label="Your name" value={name} onChange={setName} required />
          <FormField label="Email" type="email" value={email} onChange={setEmail} required />
          <FormField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
            minLength={8}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-orange px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate/70">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-sky hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
