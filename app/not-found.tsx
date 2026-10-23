import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container grid min-h-[60vh] place-items-center py-24 text-center">
      <div>
        <p className="display-italic text-8xl text-brand">404</p>
        <h1 className="mt-4 text-3xl font-bold">This page took a different route</h1>
        <p className="mx-auto mt-3 max-w-md">The page you are looking for does not exist yet or has moved.</p>
        <Button asChild className="mt-8"><Link href="/">Back to home</Link></Button>
      </div>
    </section>
  );
}
