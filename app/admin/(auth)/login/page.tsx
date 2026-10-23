import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const searchParams = await props.searchParams;
  if (await getUser()) redirect("/admin");
  const cb = searchParams.callbackUrl?.startsWith("/admin") ? searchParams.callbackUrl : "/admin";
  return (
    <>
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm">Sign in to manage Triple A International.</p>
      <LoginForm callbackUrl={cb} />
    </>
  );
}
