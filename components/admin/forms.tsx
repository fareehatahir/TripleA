"use client";
import { forwardRef, useEffect, useId } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };
export const Field = forwardRef<HTMLInputElement, FieldProps>(({ label, error, hint, className, id, ...p }, ref) => {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-semibold text-charcoal dark:text-white">{label}</label>
      <input ref={ref} id={fid} aria-invalid={!!error} aria-describedby={error ? `${fid}-e` : undefined} className={cn(inputCls, error && "border-brand")} {...p} />
      {hint && !error && <p className="mt-1 text-xs">{hint}</p>}
      {error && <p id={`${fid}-e`} role="alert" className="mt-1 text-xs font-medium text-brand">{error}</p>}
    </div>
  );
});
Field.displayName = "Field";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-charcoal/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className="dark:text-silver w-full max-w-md rounded-2xl bg-white p-6 shadow-lift dark:bg-charcoal">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, title, text, confirmLabel = "Delete", busy, onConfirm, onClose,
}: { open: boolean; title: string; text: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm">{text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</Button>
      </div>
    </Modal>
  );
}
