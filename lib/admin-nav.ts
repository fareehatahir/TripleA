import { Boxes, Camera, FileText, FileUp, Inbox, LayoutDashboard, Mail, Newspaper, Image as ImageIcon, Package, Settings, Ship, Users, History, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/session";

export type NavItem = { label: string; href: string; icon: LucideIcon; roles?: Role[]; stage?: number };
export type NavGroup = { title: string; items: NavItem[] };

export const adminNav: NavGroup[] = [
  { title: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }] },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Package, stage: 3 },
      { label: "Taxonomy", href: "/admin/taxonomy", icon: Boxes, stage: 3 },
      { label: "Import / Export", href: "/admin/import-export", icon: FileUp },
      { label: "Media library", href: "/admin/media", icon: ImageIcon, stage: 3 },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Inquiries", href: "/admin/inquiries", icon: Inbox, stage: 4 },
      { label: "Messages", href: "/admin/messages", icon: Mail, stage: 5 },
      { label: "Shipping rates", href: "/admin/shipping-rates", icon: Ship, stage: 5 },
    ],
  },
  {
    title: "Website",
    items: [
      { label: "Loading gallery", href: "/admin/loading-gallery", icon: Camera, stage: 5 },
      { label: "Content (CMS)", href: "/admin/content", icon: FileText, stage: 5 },
      { label: "Blog", href: "/admin/blog", icon: Newspaper, stage: 5 },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users & roles", href: "/admin/users", icon: Users, roles: ["SUPER_ADMIN"] },
      { label: "Activity log", href: "/admin/activity", icon: History, roles: ["SUPER_ADMIN"] },
      { label: "Settings", href: "/admin/settings", icon: Settings, roles: ["SUPER_ADMIN"] },
    ],
  },
];
