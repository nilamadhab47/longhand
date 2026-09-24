import { PhoneAuthForm } from "@/components/PhoneAuthForm";

export default function SignUpPage() {
  return (
    <PhoneAuthForm
      mode="sign-up"
      title="Create an account"
      lead="Phone or email. One account either way."
    />
  );
}
