import { PageHeader } from "@/components/admin/ui";
import { getAppSettingFresh } from "@/lib/app-settings";
import { requireUser } from "@/lib/session";
import { SettingsForms } from "./settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser(["SUPER_ADMIN"]);
  const [general, notifications, e, maintenance] = await Promise.all([getAppSettingFresh("general"), getAppSettingFresh("notifications"), getAppSettingFresh("email"), getAppSettingFresh("maintenance")]);
  return (
    <>
      <PageHeader title="Settings" description="Site identity, who gets notified, how email is sent, and maintenance mode." />
      <SettingsForms
        general={general}
        notifications={notifications.emails}
        email={{ provider: e.provider, from: e.from, smtpHost: e.smtpHost, smtpPort: e.smtpPort, smtpUser: e.smtpUser, hasSmtpPass: !!e.smtpPassEnc, hasResendKey: !!e.resendKeyEnc, envSmtp: !!process.env.SMTP_HOST }}
        maintenance={maintenance}
      />
    </>
  );
}
