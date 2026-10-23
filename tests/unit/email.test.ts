import { describe, expect, it } from "vitest";
import { adminInquiryEmail, buyerInquiryEmail, replyEmail } from "@/lib/email-templates";

const site = { name: "Acme Motors", email: "sales@acme.example", url: "https://acme.example", whatsapp: "886911222333", hours: "Daily 8-20" };
const inquiry = { reference: "TA-261023-ABC123", name: "Sam", company: null, country: "Kenya", phone: "+254 700", email: "sam@example.com", port: "Mombasa", message: "Hi", items: [{ title: "Engine", sku: "ENG-1", qty: 2, note: null }] };

describe("email templates", () => {
  it("use the editable site details, not hard-coded ones", () => {
    const buyer = buyerInquiryEmail(inquiry, site);
    expect(buyer.text).toContain("+886911222333");
    expect(buyer.text).toContain("Daily 8-20");
    expect(buyer.html).toContain("Acme Motors");
    expect(buyer.subject).toContain("TA-261023-ABC123");
    expect(replyEmail("Sam", "Hello", "TA-1", site).html).toContain("+886911222333");
  });

  it("escape everything a visitor typed (no HTML or script injection into the owner's inbox)", () => {
    const evil = { ...inquiry, name: '<script>alert("x")</script>', message: '"><img src=x onerror=alert(1)>', company: "A & B <b>", items: [{ title: "<i>Engine</i>", sku: "E<1>", qty: 1, note: "<a href=javascript:1>x</a>" }] };
    const html = adminInquiryEmail(evil, "https://acme.example/admin/inquiries/1", site).html;
    expect(html).not.toMatch(/<script|<img|<i>|<b>|<a href=javascript/i);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B");
  });

  it("lists items and quantities in the plain-text part too", () => {
    const admin = adminInquiryEmail(inquiry, "https://x/y", site);
    expect(admin.text).toContain("Engine (SKU ENG-1) x 2");
    expect(admin.text).toContain("https://x/y");
  });
});
