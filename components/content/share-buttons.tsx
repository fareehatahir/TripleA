"use client";
import { useState } from "react";
import { Check, Link2, MessageCircle } from "lucide-react";

type IconProps = { className?: string };
const Svg = ({ className, d }: IconProps & { d: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d={d} /></svg>
);
const Facebook = (p: IconProps) => <Svg {...p} d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z" />;
const Linkedin = (p: IconProps) => <Svg {...p} d="M6.9 8.8H3.8V20h3.1V8.8zM5.3 4a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM20.2 13.6c0-3-1.6-4.9-4.2-4.9-1.4 0-2.4.8-2.8 1.5V8.8h-3V20h3.1v-6.2c0-1.6.8-2.6 2-2.6 1.3 0 1.9.9 1.9 2.6V20h3v-6.4z" />;
const Twitter = (p: IconProps) => <Svg {...p} d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />;

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  const links = [
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: Facebook },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, Icon: Linkedin },
    { label: "Share on X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, Icon: Twitter },
    { label: "Share on WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, Icon: MessageCircle },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Share this article">
      <span className="mr-1 text-sm font-semibold text-charcoal">Share</span>
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-mist transition hover:bg-brand hover:text-white"><Icon className="h-4 w-4" /></a>
      ))}
      <button onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }} aria-label="Copy link" className="grid h-10 w-10 place-items-center rounded-full bg-mist transition hover:bg-brand hover:text-white">
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
      <span role="status" className="text-xs">{copied ? "Link copied" : ""}</span>
    </div>
  );
}
