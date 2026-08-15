"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

export default function SignInPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signIn,
    undefined,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={44} showWordmark={false} />
          <p className="font-serif text-[15.5px] leading-snug text-ink">longhand</p>
          <p className="font-serif text-[13px] italic leading-snug text-ink-2">
            Email and password. Nothing else.
          </p>
        </div>
        <form action={action} className="border-l-[2px] border-rule pl-4">
          <label className="mt-4 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              Email
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full border border-line bg-panel px-2 py-1.5 font-mono text-[13px] text-ink"
            />
          </label>
          <label className="mt-3 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              Password
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className="mt-1 w-full border border-line bg-panel px-2 py-1.5 font-mono text-[13px] text-ink"
            />
          </label>
          {state?.error ? (
            <p className="mt-3 font-serif text-[13px] italic text-rule" role="alert">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-4 border border-rule bg-rule px-3 py-1.5 font-sans text-[13px] font-medium text-paper disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <p className="mt-4 font-serif text-[13px] italic text-ink-2">
            New here?{" "}
            <Link href="/sign-up" className="text-rule underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
      </form>
      </div>
    </main>
  );
}
