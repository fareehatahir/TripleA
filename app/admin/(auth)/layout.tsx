import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-charcoal p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-white/5" aria-hidden />
        <div className="absolute -bottom-20 left-0 h-2 w-full -rotate-3 bg-brand" aria-hidden />
        <Logo tone="dark" className="relative w-44" />
        <div className="relative max-w-md">
          <p className="display-italic text-4xl !text-white">Run the catalog.<br />Ship the stock.</p>
          <p className="mt-4 text-silver">Products, photos, freight rates and inquiries — managed in one place.</p>
        </div>
        <p className="relative text-xs text-silver/70">Triple A International · Admin</p>
      </div>
      <div className="grid place-items-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
