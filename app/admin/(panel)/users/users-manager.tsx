"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { KeyRound, Plus, ShieldOff, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, inputCls } from "@/components/admin/ui";
import { ConfirmDialog, Field, Modal } from "@/components/admin/forms";
import { createUserSchema } from "@/lib/validation";
import { createUserAction, deleteUserAction, resetPasswordForUserAction, resetUserTotpAction, setActiveAction, setRoleAction } from "./actions";

type U = { id: string; name: string; email: string; role: "SUPER_ADMIN" | "EDITOR"; active: boolean; lastLoginAt: string | null; totpEnabled: boolean };
type Values = z.input<typeof createUserSchema>;

export function UsersManager({ meId, users }: { meId: string; users: U[] }) {
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<U | null>(null);
  const [deleteFor, setDeleteFor] = useState<U | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : r.error ?? "Something went wrong");
      if (r.ok) after?.();
    });

  return (
    <>
      {msg && <p role="alert" className="mb-4 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{msg}</p>}
      <Card>
        <div className="flex items-center justify-between p-5">
          <p className="text-sm">{users.length} account{users.length === 1 ? "" : "s"}</p>
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add user</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-silver/40 text-xs uppercase tracking-wider dark:border-white/10">
              <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Last sign-in</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-silver/40 dark:divide-white/10">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-charcoal dark:text-white">{u.name} {u.id === meId && <span className="text-xs font-normal">(you)</span>}</p>
                    <p className="text-xs">{u.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      aria-label={`Role for ${u.email}`}
                      className={`${inputCls} h-9 w-36`}
                      value={u.role}
                      disabled={pending}
                      onChange={(e) => run(() => setRoleAction(u.id, e.target.value as U["role"]))}
                    >
                      <option value="SUPER_ADMIN">Super admin</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                  </td>
                  <td className="px-5 py-3"><div className="flex flex-wrap gap-1"><Badge tone={u.active ? "green" : "gray"}>{u.active ? "Active" : "Disabled"}</Badge>{u.totpEnabled && <Badge tone="dark">2FA</Badge>}</div></td>
                  <td className="px-5 py-3">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : "Never"}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {u.totpEnabled && u.id !== meId && <button title="Reset two-factor authentication" aria-label={`Reset 2FA for ${u.email}`} onClick={() => run(() => resetUserTotpAction(u.id))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/10"><ShieldOff className="h-4 w-4" /></button>}
                      <button title="Set new password" aria-label={`Set new password for ${u.email}`} onClick={() => setResetFor(u)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/10"><KeyRound className="h-4 w-4" /></button>
                      {u.id !== meId && (
                        <>
                          <button title={u.active ? "Disable" : "Enable"} aria-label={`${u.active ? "Disable" : "Enable"} ${u.email}`} onClick={() => run(() => setActiveAction(u.id, !u.active))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/10"><UserCog className="h-4 w-4" /></button>
                          <button title="Delete" aria-label={`Delete ${u.email}`} onClick={() => setDeleteFor(u)} className="grid h-9 w-9 place-items-center rounded-lg text-brand hover:bg-brand/10"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddUser open={adding} onClose={() => setAdding(false)} />
      <ResetPw user={resetFor} onClose={() => setResetFor(null)} />
      <ConfirmDialog
        open={!!deleteFor}
        title="Delete this user?"
        text={`${deleteFor?.email} will lose access immediately. Their past activity stays in the log.`}
        busy={pending}
        onClose={() => setDeleteFor(null)}
        onConfirm={() => deleteFor && run(() => deleteUserAction(deleteFor.id), () => setDeleteFor(null))}
      />
    </>
  );
}

function AddUser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(createUserSchema), defaultValues: { role: "EDITOR" } });
  return (
    <Modal open={open} onClose={onClose} title="Add user">
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(async (v) => {
          const r = await createUserAction(v);
          if (!r.ok) return setErr(r.error);
          setErr(null);
          reset();
          onClose();
        })}
      >
        <Field label="Full name" error={errors.name?.message} {...register("name")} />
        <Field label="Email" type="email" error={errors.email?.message} {...register("email")} />
        <div>
          <label htmlFor="role" className="mb-1.5 block text-sm font-semibold text-charcoal dark:text-white">Role</label>
          <select id="role" className={inputCls} {...register("role")}>
            <option value="EDITOR">Editor</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
        </div>
        <Field label="Temporary password" type="text" autoComplete="off" hint="At least 10 characters, with a letter and a number. Share it securely." error={errors.password?.message} {...register("password")} />
        {err && <p role="alert" className="text-sm font-medium text-brand">{err}</p>}
        <Button className="w-full" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create user"}</Button>
      </form>
    </Modal>
  );
}

function ResetPw({ user, onClose }: { user: U | null; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={!!user} onClose={() => { setPw(""); setErr(null); onClose(); }} title="Set a new password">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!user) return;
          setBusy(true);
          const r = await resetPasswordForUserAction(user.id, pw);
          setBusy(false);
          if (!r.ok) return setErr(r.error);
          setPw("");
          setErr(null);
          onClose();
        }}
      >
        <p className="text-sm">New password for <strong className="text-charcoal dark:text-white">{user?.email}</strong></p>
        <Field label="New password" type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} error={err ?? undefined} />
        <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
      </form>
    </Modal>
  );
}
