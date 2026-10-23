import { cn } from "@/lib/utils";


export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-2xl border border-silver/50 bg-white shadow-soft dark:border-white/10 dark:bg-charcoal", className)} {...p} />
);

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border border-silver/70 bg-white px-4 text-sm text-charcoal placeholder:text-graphite/50 transition hover:border-graphite focus:border-brand dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/40";

export function Badge({ tone = "gray", children }: { tone?: "gray" | "red" | "green" | "dark" | "amber"; children: React.ReactNode }) {
  const t = {
    gray: "bg-mist text-graphite dark:bg-white/10 dark:text-silver",
    red: "bg-brand/10 text-brand",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/15 text-amber-900 dark:text-amber-300",
    dark: "bg-charcoal text-white dark:bg-white dark:text-charcoal",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mist text-graphite dark:bg-white/10 dark:text-silver"><Icon className="h-7 w-7" /></span>
      <p className="mt-4 font-display text-lg font-bold text-charcoal dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
