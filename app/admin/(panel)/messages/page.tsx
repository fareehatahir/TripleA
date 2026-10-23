import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { MessagesManager } from "./messages-manager";

export const metadata = { title: "Messages" };

export default async function MessagesPage(props: { searchParams: Promise<{ tab?: string; open?: string }> }) {
  const searchParams = await props.searchParams;
  const [messages, subscribers, unread] = await Promise.all([
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    db.contactMessage.count({ where: { isRead: false } }),
  ]);
  return (
    <>
      <PageHeader title="Messages" description={`Contact-form messages and newsletter sign-ups. ${unread} unread.`} />
      <MessagesManager
        tab={searchParams.tab === "subscribers" ? "subscribers" : "messages"} openId={searchParams.open}
        messages={messages.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, subject: m.subject, message: m.message, isRead: m.isRead, createdAt: m.createdAt.toISOString() }))}
        subscribers={subscribers.map((s) => ({ id: s.id, email: s.email, createdAt: s.createdAt.toISOString() }))}
      />
    </>
  );
}
