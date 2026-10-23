// Describes how each content block is edited in Admin > Content. Keys mirror lib/content.ts schemas.
export type Leaf = { key: string; label: string; type: "text" | "textarea" | "number" | "bool" | "rich" | "image" | "url"; hint?: string; rows?: number };
export type GroupNode = { key: string; label: string; type: "group"; fields: Node[]; hint?: string };
export type ListNode = { key: string; label: string; type: "list"; itemLabel: string; fields: Leaf[]; max?: number; hint?: string };
export type StringsNode = { key: string; label: string; type: "strings"; hint?: string; max?: number };
export type Node = Leaf | GroupNode | ListNode | StringsNode;

export const blocks: Record<string, { title: string; description: string; viewHref: string; nodes: Node[] }> = {
  home: {
    title: "Home page",
    description: "Hero text and background photos, the four counters, how-it-works steps, why-choose-us and the call-to-action band.",
    viewHref: "/",
    nodes: [
      { key: "hero", label: "Hero", type: "group", fields: [
        { key: "eyebrow", label: "Small line above the headline", type: "text" },
        { key: "line1", label: "Headline, line 1", type: "text" },
        { key: "line2", label: "Headline, line 2", type: "text" },
        { key: "line3", label: "Headline, line 3 (shown in red)", type: "text" },
        { key: "subtext", label: "Sub-text", type: "textarea", rows: 3 },
        { key: "primaryCta", label: "Main button text", type: "text" },
        { key: "secondaryCta", label: "Second button text", type: "text" },
        { key: "badges", label: "Trust points under the buttons", type: "strings", max: 5 },
        { key: "slides", label: "Background photos (slow-zoom slideshow)", type: "list", itemLabel: "Photo", max: 6, hint: "Optional. Without photos a clean branded background is used.", fields: [{ key: "url", label: "Photo", type: "image" }, { key: "alt", label: "Describe the photo", type: "text" }] },
      ] },
      { key: "stats", label: "Counters", type: "list", itemLabel: "Counter", max: 6, fields: [{ key: "label", label: "Label", type: "text" }, { key: "value", label: "Number", type: "number" }, { key: "suffix", label: "After the number (e.g. +)", type: "text" }] },
      { key: "steps", label: "How it works", type: "list", itemLabel: "Step", max: 6, fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea", rows: 2 }] },
      { key: "why", label: "Why choose us", type: "list", itemLabel: "Reason", max: 8, fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea", rows: 2 }] },
      { key: "cta", label: "Call-to-action band", type: "group", fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea", rows: 2 }] },
    ],
  },
  about: {
    title: "About page",
    description: "Company story, mission, timeline, certifications, team and yard photos.",
    viewHref: "/about",
    nodes: [
      { key: "intro", label: "Company story", type: "rich" },
      { key: "mission", label: "Mission statement", type: "textarea", rows: 3 },
      { key: "timeline", label: "Timeline", type: "list", itemLabel: "Milestone", max: 12, fields: [{ key: "year", label: "Year", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea", rows: 2 }] },
      { key: "certifications", label: "Certifications & standards", type: "list", itemLabel: "Item", max: 12, fields: [{ key: "name", label: "Name", type: "text" }, { key: "detail", label: "Detail", type: "textarea", rows: 2 }] },
      { key: "team", label: "Team", type: "list", itemLabel: "Person", max: 12, fields: [{ key: "name", label: "Name", type: "text" }, { key: "role", label: "Role", type: "text" }, { key: "photo", label: "Photo", type: "image" }] },
      { key: "gallery", label: "Yard & warehouse photos", type: "list", itemLabel: "Photo", max: 12, fields: [{ key: "url", label: "Photo", type: "image" }, { key: "caption", label: "Caption", type: "text" }] },
    ],
  },
  services: {
    title: "Services page",
    description: "The services you offer and the engine-code explainer.",
    viewHref: "/services",
    nodes: [
      { key: "intro", label: "Intro line", type: "textarea", rows: 2 },
      { key: "items", label: "Services", type: "list", itemLabel: "Service", max: 8, fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea", rows: 3 }, { key: "points", label: "Bullet points (one per line)", type: "textarea", rows: 4 }] },
      { key: "codes", label: "Engine code explainer", type: "group", fields: [
        { key: "title", label: "Title", type: "text" }, { key: "intro", label: "Intro", type: "textarea", rows: 2 },
        { key: "rows", label: "Codes", type: "list", itemLabel: "Code", max: 40, fields: [{ key: "code", label: "Engine code", type: "text" }, { key: "meaning", label: "What it is", type: "text" }] },
        { key: "note", label: "Note under the table", type: "text" },
      ] },
    ],
  },
  shipping: {
    title: "Shipping page text",
    description: "Intro, process steps and the charges explained. The freight rate table and FAQs are managed separately.",
    viewHref: "/shipping",
    nodes: [
      { key: "intro", label: "Intro", type: "rich" },
      { key: "steps", label: "Process steps", type: "list", itemLabel: "Step", max: 6, fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea", rows: 2 }] },
      { key: "charges", label: "Charges explained", type: "list", itemLabel: "Charge", max: 12, fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Explanation", type: "textarea", rows: 2 }] },
      { key: "note", label: "Note under the rate table", type: "textarea", rows: 2 },
    ],
  },
  site: {
    title: "Site, contact & SEO",
    description: "Phone, WhatsApp, address, hours, social links, the footer text, an optional announcement banner and default SEO text.",
    viewHref: "/contact",
    nodes: [
      { key: "banner", label: "Announcement banner (top of every page)", type: "group", fields: [{ key: "enabled", label: "Show the banner", type: "bool" }, { key: "text", label: "Text", type: "text" }, { key: "href", label: "Link (optional)", type: "text", hint: "e.g. /catalog or https://…" }] },
      { key: "tagline", label: "Tagline", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "whatsapp", label: "WhatsApp number", type: "text", hint: "Digits only with country code, e.g. 886912345678. Used by every WhatsApp button." },
      { key: "email", label: "Public email address", type: "text" },
      { key: "address", label: "Address", type: "text" },
      { key: "hours", label: "Business hours", type: "text" },
      { key: "mapQuery", label: "Map location", type: "text", hint: "An address or place name Google Maps can find." },
      { key: "footerBlurb", label: "Footer description", type: "textarea", rows: 3 },
      { key: "social", label: "Social links", type: "list", itemLabel: "Link", max: 8, hint: "Only links starting with https:// are kept.", fields: [{ key: "label", label: "Name", type: "text" }, { key: "href", label: "URL", type: "url" }] },
      { key: "seoTitle", label: "Default SEO title", type: "text", hint: "Shown in Google results and browser tabs for the home page." },
      { key: "seoDescription", label: "Default SEO description", type: "textarea", rows: 3 },
    ],
  },
  legal: {
    title: "Privacy & terms",
    description: "The text of the Privacy notice and Terms of use pages. The defaults are a general template: have them reviewed for your business.",
    viewHref: "/privacy",
    nodes: [{ key: "privacy", label: "Privacy notice", type: "rich" }, { key: "terms", label: "Terms of use", type: "rich" }],
  },
};
