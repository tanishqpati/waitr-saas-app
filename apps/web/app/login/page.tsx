"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.sendOtp(email);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await authApi.verifyOtp(email, otp);
      setToken(token);
      router.push("/kitchen");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Owner login</h1>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 font-medium disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{email}</p>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-center tracking-widest"
              placeholder="000000"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 font-medium disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Log in"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setError(null); }}
              className="w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
            >
              Use another email
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/" className="hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
