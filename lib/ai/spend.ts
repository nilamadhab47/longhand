import { prisma } from "@/lib/prisma";

export const MONTHLY_CAP_USD = 3;

const INPUT_USD_PER_TOKEN = 1 / 1_000_000;
const OUTPUT_USD_PER_TOKEN = 5 / 1_000_000;

export function monthKey(now = new Date()) {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

export function costUsd(inputTokens: number, outputTokens: number) {
  return inputTokens * INPUT_USD_PER_TOKEN + outputTokens * OUTPUT_USD_PER_TOKEN;
}

export async function readMonthSpend() {
  const row = await prisma.apiSpend.findUnique({
    where: { month: monthKey() },
  });
  return row?.usd ?? 0;
}

export async function canCallApi() {
  return (await readMonthSpend()) < MONTHLY_CAP_USD;
}

export async function recordSpend(inputTokens: number, outputTokens: number) {
  const usd = costUsd(inputTokens, outputTokens);
  const month = monthKey();
  await prisma.apiSpend.upsert({
    where: { month },
    create: { month, usd },
    update: { usd: { increment: usd } },
  });
  return usd;
}
