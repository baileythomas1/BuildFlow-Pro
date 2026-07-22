"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Space_Grotesk, IBM_Plex_Mono, Inter } from "next/font/google";
import { useAuth } from "@/components/AuthProvider";
import { FormField } from "@/components/FormField";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

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
    <main className="flex flex-1 items-center justify-center bg-[#F4F7FA] px-4 py-16">
      <div className={`${inter.className} flex w-[380px] flex-col items-center gap-6 rounded-lg border border-[#DCE4EC] bg-white p-[41px]`}>
        <h1 className={`${spaceGrotesk.className} text-center text-xl text-navy`}>BuildFlow Pro</h1>

        <p className={`${ibmPlexMono.className} text-center text-[11px] uppercase tracking-[1.1px] text-[#5B6B7F]`}>
          Log in to your account
        </p>

        <div className="flex w-full items-center gap-2.5 pt-[22px]">
          <span className="h-px flex-1 bg-[#DCE4EC]" />
          <span className="h-px flex-1 bg-[#DCE4EC]" />
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            placeholder="you@company.com"
          />

          <FormField label="Password" type="password" value={password} onChange={setPassword} required />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center rounded bg-orange text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-[13px] text-[#5B6B7F]">
          {"Don't have an account? "}
          <Link href="/signup" className="font-semibold text-navy hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
