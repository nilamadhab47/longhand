import { PhoneAuthForm } from "@/components/PhoneAuthForm";

export default function SignInPage() {
  return (
    <PhoneAuthForm
      mode="sign-in"
      title="Sign in"
      lead="Phone or email. Your notes stay yours."
    />
  );
}
