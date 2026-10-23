"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/forms";
import { loginSchema } from "@/lib/validation";
import { loginAction } from "../actions";

type Values = z.input<typeof loginSchema>;

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [need2fa, setNeed2fa] = useState(false);
  const [code, setCode] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(loginSchema) });

  return (
    <form
      className="mt-8 space-y-4"
      noValidate
      onSubmit={handleSubmit(async (v) => {
        setError(null);
        const res = await loginAction({ ...v, code: need2fa ? code : undefined });
        if (!res.ok) {
          setNeed2fa(!!res.need2fa);
          return setError(res.need2fa && !code ? null : res.error);
        }
        router.replace(callbackUrl);
        router.refresh();
      })}
    >
      <Field label="Email" type="email" autoComplete="username" error={errors.email?.message} {...register("email")} />
      <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
      {need2fa && (
        <Field label="Authentication code" inputMode="numeric" autoComplete="one-time-code" autoFocus value={code} onChange={(e) => setCode(e.target.value)} hint="From your authenticator app, or one of your backup codes." />
      )}
      {error && <p role="alert" className="rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{error}</p>}
      <Button size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : need2fa ? "Verify and sign in" : "Sign in"}</Button>
      <p className="text-center text-sm"><Link href="/admin/forgot" className="font-semibold text-brand hover:underline">Forgot password?</Link></p>
    </form>
  );
}
