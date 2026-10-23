"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/forms";
import { deleteBlogPostAction } from "./actions";

export function DeletePostButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button aria-label={`Delete ${title}`} onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-brand hover:bg-brand/10"><Trash2 className="h-4 w-4" /></button>
      <ConfirmDialog open={open} title="Delete this post?" text={`“${title}” will be removed from the website. This cannot be undone.`} busy={pending} onClose={() => setOpen(false)} onConfirm={() => start(async () => { await deleteBlogPostAction(id); setOpen(false); router.refresh(); })} />
    </>
  );
}
