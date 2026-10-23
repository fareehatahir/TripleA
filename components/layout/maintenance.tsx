import { Wrench } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { whatsappLink } from "@/lib/site";

/** Shown to visitors while Maintenance mode is on (Admin > Settings). */
export function Maintenance({ message, phone, whatsapp }: { message: string; phone: string; whatsapp: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-6 py-16 text-center">
      <div className="max-w-lg">
        <Logo className="mx-auto w-44" />
        <span className="mx-auto mt-10 grid h-16 w-16 place-items-center rounded-2xl bg-charcoal text-white"><Wrench className="h-8 w-8" /></span>
        <h1 className="mt-6 text-3xl font-bold">Back soon</h1>
        <p className="mt-3 text-lg">{message}</p>
        <p className="mt-6 text-sm">Urgent? <a className="font-semibold text-brand hover:underline" href={whatsappLink(undefined, whatsapp)}>WhatsApp us</a> · {phone}</p>
      </div>
    </main>
  );
}
