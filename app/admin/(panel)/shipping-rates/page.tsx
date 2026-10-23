import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { RecordManager } from "@/components/admin/record-manager";
import { ExtendRates } from "./extend-rates";
import { deleteRateAction, moveRateAction, saveRateAction } from "./actions";

export const metadata = { title: "Shipping rates" };

export default async function RatesPage() {
  const rates = await db.shippingRate.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  const expired = rates.filter((r) => r.validUntil < new Date()).length;
  return (
    <>
      <PageHeader title="Shipping rates" description="The freight table on the public Shipping page. Rows past their validity date are highlighted here and shown as “Ask for latest” to visitors." />
      {expired > 0 && <p role="status" className="mb-5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-900 dark:text-amber-200">{expired} rate{expired === 1 ? " has" : "s have"} expired. Update the date and price, or extend all of them below.</p>}
      <RecordManager
        noun="rate" expiredKey="validUntil" toolbar={<ExtendRates />}
        items={rates.map((r) => ({ id: r.id, departure: r.departure, country: r.country, port: r.port, containerType: r.containerType, freightUsd: r.freightUsd, validUntil: r.validUntil.toISOString() }))}
        columns={["country", "port", "containerType", "freightUsd", "validUntil"]}
        emptyText="Add your first freight rate: destination, port, price and the date it is valid until."
        defaults={{ departure: "Taiwan", country: "", port: "", containerType: "40HQ", freightUsd: "", validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }}
        fields={[
          { key: "departure", label: "Departure", type: "text" }, { key: "country", label: "Destination country", type: "text" }, { key: "port", label: "Destination port", type: "text" },
          { key: "containerType", label: "Container", type: "select", options: ["20GP", "40GP", "40HQ", "RoRo", "LCL"].map((v) => ({ value: v, label: v })) },
          { key: "freightUsd", label: "Freight (USD)", type: "number" }, { key: "validUntil", label: "Valid until", type: "date" },
        ]}
        onSave={saveRateAction} onDelete={deleteRateAction} onMove={moveRateAction}
      />
    </>
  );
}
