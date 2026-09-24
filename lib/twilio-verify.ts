function credentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) {
    throw new Error("Twilio Verify is not configured.");
  }
  return { accountSid, authToken, serviceSid };
}

function authHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function twilioForm(
  path: string,
  body: Record<string, string>,
): Promise<{ ok: boolean; status: number; payload: Record<string, unknown> }> {
  const { accountSid, authToken, serviceSid } = credentials();
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return { ok: response.ok, status: response.status, payload };
}

function twilioMessage(payload: Record<string, unknown>, fallback: string) {
  const message = payload.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export async function sendPhoneCode(phone: string) {
  const { ok, status, payload } = await twilioForm("Verifications", {
    To: phone,
    Channel: "sms",
  });
  if (ok) return;
  if (status === 429) {
    throw new Error("Wait a minute, then request another code.");
  }
  if (status === 400) {
    throw new Error("That number could not receive a code.");
  }
  throw new Error(twilioMessage(payload, "Could not send the code. Try again."));
}

export async function checkPhoneCode(phone: string, code: string) {
  const { ok, payload } = await twilioForm("VerificationCheck", {
    To: phone,
    Code: code,
  });
  if (ok && payload.status === "approved") return;
  throw new Error("That code is wrong or expired.");
}
