"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  sendPhoneCodeAction,
  signIn,
  signUp,
  verifyPhoneCodeAction,
  type AuthError,
  type AuthState,
} from "@/app/actions/auth";
import { maskPhone } from "@/lib/phone";
import { Logo } from "@/components/Logo";

function isSent(state: AuthState): state is { sent: true; phone: string } {
  return Boolean(state && "sent" in state && state.sent);
}

export function PhoneAuthForm({
  mode,
  title,
  lead,
}: {
  mode: "sign-in" | "sign-up";
  title: string;
  lead: string;
}) {
  const [sendState, sendAction, sending] = useActionState<AuthState, FormData>(
    sendPhoneCodeAction,
    undefined,
  );
  const [verifyState, verifyAction, verifying] = useActionState<
    AuthState,
    FormData
  >(verifyPhoneCodeAction, undefined);
  const emailAction = mode === "sign-up" ? signUp : signIn;
  const [emailState, emailFormAction, emailPending] = useActionState<
    AuthError | undefined,
    FormData
  >(emailAction, undefined);
  const [editingNumber, setEditingNumber] = useState(false);

  useEffect(() => {
    if (isSent(sendState)) {
      setEditingNumber(false);
    }
  }, [sendState]);

  const sentPhone =
    !editingNumber && isSent(sendState) ? sendState.phone : null;
  const sendError =
    sendState && "error" in sendState ? sendState.error : undefined;
  const verifyError =
    verifyState && "error" in verifyState ? verifyState.error : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size={44} showWordmark={false} />
          <p className="font-serif text-[15.5px] leading-snug text-ink">
            longhand
          </p>
          <p className="font-serif text-[13px] italic leading-snug text-ink-2">
            {lead}
          </p>
        </div>

        {sentPhone ? (
          <>
            <form
              action={verifyAction}
              className="border-l-[2px] border-rule pl-4"
            >
              <h1 className="font-sans text-[14px] font-medium text-ink">
                Enter the code
              </h1>
              <p className="mt-2 font-serif text-[13px] leading-snug text-ink-2">
                Sent to {maskPhone(sentPhone)}.
              </p>
              <input type="hidden" name="phone" value={sentPhone} />
              <label className="mt-4 block">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  Code
                </span>
                <input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={10}
                  className="mt-1 w-full border border-line bg-panel px-2 py-1.5 font-mono text-[13px] tracking-[0.2em] text-ink"
                />
              </label>
              {verifyError ? (
                <p
                  className="mt-3 font-serif text-[13px] italic text-rule"
                  role="alert"
                >
                  {verifyError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={verifying}
                className="mt-4 border border-rule bg-rule px-3 py-1.5 font-sans text-[13px] font-medium text-paper disabled:opacity-60"
              >
                {verifying ? "Checking…" : "Continue"}
              </button>
            </form>
            {sendError ? (
              <p
                className="mt-3 pl-4 font-serif text-[13px] italic text-rule"
                role="alert"
              >
                {sendError}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pl-4">
              <form action={sendAction}>
                <input type="hidden" name="phone" value={sentPhone} />
                <button
                  type="submit"
                  disabled={sending}
                  className="font-serif text-[13px] italic text-ink-2 underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Resend code"}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setEditingNumber(true)}
                className="font-serif text-[13px] italic text-ink-2 underline-offset-2 hover:underline"
              >
                Use a different number
              </button>
            </div>
          </>
        ) : (
          <>
            <form action={sendAction} className="border-l-[2px] border-rule pl-4">
              <h1 className="font-sans text-[14px] font-medium text-ink">
                {title}
              </h1>
              <label className="mt-4 block">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                  Phone
                </span>
                <div className="mt-1 flex border border-line bg-panel">
                  <span className="flex items-center border-r border-line px-2 font-mono text-[13px] text-ink-3">
                    +91
                  </span>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    placeholder="98765 43210"
                    className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-[13px] text-ink outline-none"
                  />
                </div>
              </label>
              {sendError ? (
                <p
                  className="mt-3 font-serif text-[13px] italic text-rule"
                  role="alert"
                >
                  {sendError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={sending}
                className="mt-4 border border-rule bg-rule px-3 py-1.5 font-sans text-[13px] font-medium text-paper disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send code"}
              </button>
            </form>

            <p className="my-5 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              or email
            </p>

            <form
              action={emailFormAction}
              className="border-l-[2px] border-line pl-4"
            >
              <label className="block">
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
                  autoComplete={
                    mode === "sign-up" ? "new-password" : "current-password"
                  }
                  required
                  minLength={8}
                  className="mt-1 w-full border border-line bg-panel px-2 py-1.5 font-mono text-[13px] text-ink"
                />
              </label>
              {emailState?.error ? (
                <p
                  className="mt-3 font-serif text-[13px] italic text-rule"
                  role="alert"
                >
                  {emailState.error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={emailPending}
                className="mt-4 border border-rule bg-rule px-3 py-1.5 font-sans text-[13px] font-medium text-paper disabled:opacity-60"
              >
                {mode === "sign-up"
                  ? emailPending
                    ? "Creating…"
                    : "Create account"
                  : emailPending
                    ? "Signing in…"
                    : "Sign in"}
              </button>
              <p className="mt-4 font-serif text-[13px] italic text-ink-2">
                {mode === "sign-up" ? (
                  <>
                    Already writing?{" "}
                    <Link
                      href="/sign-in"
                      className="text-rule underline-offset-2 hover:underline"
                    >
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <Link
                      href="/sign-up"
                      className="text-rule underline-offset-2 hover:underline"
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
