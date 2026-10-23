import { Hammer } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";

export function ComingSoon({ title, stage, description }: { title: string; stage: number; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={Hammer} title={`Arrives in Stage ${stage}`} text="The navigation, permissions and database tables for this module are ready. The management screen is built in its planned stage." />
      </Card>
    </>
  );
}
