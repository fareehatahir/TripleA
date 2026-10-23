"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <section className="container grid min-h-[60vh] place-items-center py-24 text-center">
      <div>
        <p className="display-italic text-7xl text-brand">Oops</p>
        <h1 className="mt-4 text-3xl font-bold">Something went wrong on our side</h1>
        <p className="mx-auto mt-3 max-w-md">Please try again. If it keeps happening, message us on WhatsApp and we will help you directly.</p>
        <div className="mt-8 flex justify-center gap-3"><Button onClick={reset}>Try again</Button><Button asChild variant="ghost"><Link href="/">Back to home</Link></Button></div>
        {error.digest && <p className="mt-6 text-xs">Reference: {error.digest}</p>}
      </div>
    </section>
  );
}
