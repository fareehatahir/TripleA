import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <p className="mt-2 text-sm">Enter your account email and we will send a reset link valid for one hour.</p>
      <ForgotForm />
    </>
  );
}
