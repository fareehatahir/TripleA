import { getAppSetting } from "@/lib/app-settings";
import { site } from "@/lib/site";

/** Who receives new-inquiry and contact emails: Settings → INQUIRY_NOTIFY_TO env → the public email. */
export async function getNotifyEmails(): Promise<string[]> {
  const { emails } = await getAppSetting("notifications");
  if (emails.length) return emails;
  const env = process.env.INQUIRY_NOTIFY_TO?.split(",").map((s) => s.trim()).filter(Boolean);
  return env?.length ? env : [site.email];
}
