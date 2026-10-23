"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/forms";
import { passwordSchema } from "@/lib/validation";
import { resetPasswordAction } from "../../actions";

const schema = z.object({ password: passwordSchema, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type Values = z.input<typeof schema>;

export function ResetForm({ token }: { token: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  if (msg?.ok)
    return (
      <div className="mt-8 rounded-2xl bg-emerald-500/10 p-5 text-sm text-emerald-800 dark:text-emerald-300" role="status">
        Password updated. <Link href="/admin/login" className="font-semibold underline">Sign in</Link>
      </div>
    );

  return (
    <form
      className="mt-8 space-y-4"
      noValidate
      onSubmit={handleSubmit(async (v) => {
        const res = await resetPasswordAction(token, v.password);
        setMsg({ ok: res.ok, text: res.ok ? "" : res.error });
      })}
    >
      <Field label="New password" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
      <Field label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
      {msg && !msg.ok && <p role="alert" className="rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{msg.text}</p>}
      <Button size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Update password"}</Button>
    </form>
  );
}
