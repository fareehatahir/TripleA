import { site as defaults } from "@/lib/site";

/** The editable details (Admin > Content > Site & contact). Falls back to the built-in defaults. */
export type MailSite = { name: string; email: string; url: string; whatsapp: string; hours: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Inq = { reference: string; name: string; company?: string | null; country: string; phone: string; email: string; port?: string | null; message?: string | null; items: { title: string; sku: string; qty: number; note?: string | null }[] };

const shell = (site: MailSite, title: string, inner: string) => `<!doctype html><html><body style="margin:0;background:#F4F5F7;font-family:Arial,Helvetica,sans-serif;color:#3A3D42">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1F2124;padding:20px 28px;color:#fff;font-size:20px;font-weight:bold">Triple<span style="color:#C8102E">A</span> <span style="font-size:11px;letter-spacing:3px;font-weight:normal;color:#C9CDD2">INTERNATIONAL</span></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:20px;color:#1F2124">${esc(title)}</h1>${inner}</td></tr>
<tr><td style="padding:16px 28px;background:#F4F5F7;font-size:12px;color:#6b7076">${esc(site.name)} · ${esc(site.email)} · ${esc(site.url.replace(/^https?:\/\//, ""))}</td></tr>
</table></td></tr></table></body></html>`;

const itemsHtml = (items: Inq["items"]) =>
  items.length
    ? `<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:12px 0">${items
        .map((i) => `<tr style="border-bottom:1px solid #e5e7ea"><td><strong>${esc(i.title)}</strong><br><span style="color:#6b7076">SKU ${esc(i.sku)}${i.note ? ` · ${esc(i.note)}` : ""}</span></td><td align="right" style="white-space:nowrap">× ${i.qty}</td></tr>`)
        .join("")}</table>`
    : `<p style="color:#6b7076">No specific items were selected (general inquiry).</p>`;

const itemsText = (items: Inq["items"]) => (items.length ? items.map((i) => `  - ${i.title} (SKU ${i.sku}) x ${i.qty}${i.note ? ` — ${i.note}` : ""}`).join("\n") : "  (general inquiry, no items)");

export function adminInquiryEmail(q: Inq, adminUrl: string, site: MailSite = defaults) {
  return {
    subject: `New inquiry ${q.reference} from ${q.name} (${q.country})`,
    text: `New inquiry ${q.reference}\n\nName: ${q.name}\nCompany: ${q.company || "-"}\nCountry: ${q.country}\nPhone/WhatsApp: ${q.phone}\nEmail: ${q.email}\nDestination port: ${q.port || "-"}\n\nItems:\n${itemsText(q.items)}\n\nMessage:\n${q.message || "-"}\n\nOpen in admin: ${adminUrl}`,
    html: shell(
      site,
      `New inquiry ${q.reference}`,
      `<p style="margin:0 0 12px"><strong>${esc(q.name)}</strong>${q.company ? `, ${esc(q.company)}` : ""} · ${esc(q.country)}</p>
       <p style="margin:0 0 12px;font-size:14px">📞 ${esc(q.phone)}<br>✉️ <a href="mailto:${esc(q.email)}">${esc(q.email)}</a>${q.port ? `<br>🚢 Port: ${esc(q.port)}` : ""}</p>
       ${itemsHtml(q.items)}
       ${q.message ? `<p style="font-size:14px;white-space:pre-wrap;background:#F4F5F7;padding:12px;border-radius:8px">${esc(q.message)}</p>` : ""}
       <p style="margin-top:20px"><a href="${esc(adminUrl)}" style="background:#C8102E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Open in admin</a></p>`
    ),
  };
}

export function buyerInquiryEmail(q: Inq, site: MailSite = defaults) {
  return {
    subject: `We received your inquiry ${q.reference}`,
    text: `Hello ${q.name},\n\nThank you for contacting ${site.name}. We received your inquiry ${q.reference} and will reply within one business day (${site.hours}).\n\nYour items:\n${itemsText(q.items)}\n\nYou can also reach us on WhatsApp: +${site.whatsapp}\n\n${site.name}`,
    html: shell(
      site,
      "Thank you, we received your inquiry",
      `<p style="font-size:14px">Hello ${esc(q.name)}, your reference is <strong>${esc(q.reference)}</strong>. We will reply within one business day.</p>${itemsHtml(q.items)}
       <p style="font-size:14px">Need a faster answer? Message us on WhatsApp: <strong>+${esc(site.whatsapp)}</strong></p>`
    ),
  };
}

export function replyEmail(name: string, body: string, reference: string, site: MailSite = defaults) {
  return {
    text: `${body}\n\n— ${site.name}\nRef: ${reference}`,
    html: shell(site, `Re: your inquiry ${reference}`, `<p style="font-size:14px;white-space:pre-wrap">${esc(body)}</p><p style="font-size:12px;color:#6b7076">Hello ${esc(name)}, reply to this email or message us on WhatsApp +${esc(site.whatsapp)}.</p>`),
  };
}
