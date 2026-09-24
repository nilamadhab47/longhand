const INDIA_MOBILE = /^[6-9]\d{9}$/;
const E164 = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(
  input: string,
): { phone: string } | { error: string } {
  const raw = input.replace(/[\s\-()]/g, "").trim();
  if (!raw) {
    return { error: "Enter your phone number." };
  }

  if (raw.startsWith("+")) {
    if (!E164.test(raw)) {
      return { error: "Enter a valid phone number." };
    }
    if (raw.startsWith("+91")) {
      const local = raw.slice(3);
      if (!INDIA_MOBILE.test(local)) {
        return { error: "Enter a valid Indian mobile number." };
      }
    }
    return { phone: raw };
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return normalizeIndia(digits.slice(2));
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return normalizeIndia(digits.slice(1));
  }
  if (digits.length === 10) {
    return normalizeIndia(digits);
  }

  return { error: "Enter a 10-digit Indian mobile number." };
}

function normalizeIndia(ten: string): { phone: string } | { error: string } {
  if (!INDIA_MOBILE.test(ten)) {
    return { error: "Enter a valid Indian mobile number." };
  }
  return { phone: `+91${ten}` };
}

export function maskPhone(phone: string) {
  if (phone.startsWith("+91") && phone.length === 13) {
    return `+91 ${phone.slice(3, 5)}•• ••${phone.slice(-4)}`;
  }
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 3)} •••• ${phone.slice(-2)}`;
}

export function accountLabel(user: { phone?: string | null; email?: string | null }) {
  if (user.phone) return maskPhone(user.phone);
  if (user.email) return user.email;
  return "signed in";
}
