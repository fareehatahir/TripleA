"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/forms";
import { forgotSchema } from "@/lib/validation";
import { requestResetAction } from "../actions";

type Values = z.input<typeof forgotSchema>;

export function ForgotForm() {
  const [state, setState] = useState<"idle" | "sent" | string>("idle");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(forgotSchema) });

  if (state === "sent")
    return (
      <div className="mt-8 rounded-2xl bg-emerald-500/10 p-5 text-sm text-emerald-800 dark:text-emerald-300" role="status">
        If an account exists for that email, a reset link is on its way. <Link href="/admin/login" className="font-semibold underline">Back to sign in</Link>
      </div>
    );

  return (
    <form
      className="mt-8 space-y-4"
      noValidate
      onSubmit={handleSubmit(async (v) => {
        const res = await requestResetAction(v);
        setState(res.ok ? "sent" : res.error);
      })}
    >
      <Field label="Email" type="email" error={errors.email?.message} {...register("email")} />
      {state !== "idle" && <p role="alert" className="text-sm font-medium text-brand">{state}</p>}
      <Button size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send reset link"}</Button>
      <p className="text-center text-sm"><Link href="/admin/login" className="font-semibold text-brand hover:underline">Back to sign in</Link></p>
    </form>
  );
}
