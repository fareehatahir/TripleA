"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/forms";
import { extendAllRatesAction } from "./actions";

export function ExtendRates() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><CalendarPlus className="h-4 w-4" /> Extend all by 30 days</Button>
      <ConfirmDialog open={open} title="Extend every rate by 30 days?" text={err ?? "Every validity date moves forward 30 days (expired rates restart from today). Prices are not changed, so only do this when the shipping lines have confirmed the same rates."} confirmLabel="Extend" busy={pending}
        onClose={() => (setOpen(false), setErr(null))} onConfirm={() => start(async () => { const r = await extendAllRatesAction(30); if (r.ok) { setOpen(false); router.refresh(); } else setErr(r.error); })} />
    </>
  );
}
