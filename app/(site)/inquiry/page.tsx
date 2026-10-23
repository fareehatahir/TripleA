import type { Metadata } from "next";
import { InquiryClient } from "./inquiry-client";

export const metadata: Metadata = {
  title: "Your Inquiry List",
  description: "Review the items you are interested in and send one combined inquiry to Triple A International.",
  robots: { index: false },
};

export default function InquiryPage() {
  return <InquiryClient />;
}
