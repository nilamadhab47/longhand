"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { accountLabel, normalizePhone } from "@/lib/phone";
import { createSession, destroySession } from "@/lib/session";
import { checkPhoneCode, sendPhoneCode } from "@/lib/twilio-verify";

export type AuthError = { error: string };
export type AuthState = AuthError | { sent: true; phone: string } | undefined;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(
  _prev: AuthError | undefined,
  formData: FormData,
): Promise<AuthError | undefined> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    return { error: "Email or password is wrong." };
  }

  await createSession(user.id, accountLabel(user));
  redirect("/review");
}

export async function signUp(
  _prev: AuthError | undefined,
  formData: FormData,
): Promise<AuthError | undefined> {
  const { email, password } = readCredentials(formData);
  if (!email || !email.includes("@")) {
    return { error: "Use a real email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "That email already has an account. Sign in instead." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession(user.id, accountLabel(user));
  redirect("/review");
}

function readPhone(formData: FormData) {
  return normalizePhone(String(formData.get("phone") ?? ""));
}

export async function sendPhoneCodeAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = readPhone(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    await sendPhoneCode(parsed.phone);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send the code.";
    return { error: message };
  }

  return { sent: true, phone: parsed.phone };
}

export async function verifyPhoneCodeAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = readPhone(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!/^\d{4,10}$/.test(code)) {
    return { error: "Enter the code from the text message." };
  }

  try {
    await checkPhoneCode(parsed.phone, code);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That code is wrong or expired.";
    return { error: message };
  }

  const user = await prisma.user.upsert({
    where: { phone: parsed.phone },
    create: { phone: parsed.phone },
    update: {},
  });

  await createSession(user.id, accountLabel(user));
  redirect("/review");
}

export async function signOut() {
  await destroySession();
  redirect("/sign-in");
}
