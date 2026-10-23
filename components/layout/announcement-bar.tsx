import Link from "next/link";

export function AnnouncementBar({ banner }: { banner: { enabled: boolean; text: string; href: string } }) {
  if (!banner.enabled || !banner.text) return null;
  const inner = <span className="font-medium">{banner.text}{banner.href && <span aria-hidden> →</span>}</span>;
  return (
    <div className="bg-brand px-4 py-2 text-center text-sm text-white">
      {banner.href ? <Link href={banner.href} className="hover:underline">{inner}</Link> : inner}
    </div>
  );
}
