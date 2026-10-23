import { z } from "zod";

export const importBody = z.object({
  rows: z.array(z.record(z.string(), z.string().max(20000))).max(5000),
  mapping: z.record(z.string(), z.string().max(200)),
  options: z.object({ updateExisting: z.boolean(), createMissingTaxonomy: z.boolean(), defaultStatus: z.enum(["DRAFT", "PUBLISHED"]) }),
});
