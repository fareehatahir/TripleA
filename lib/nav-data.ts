import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/** Menu data from the database, cached 5 min and refreshed when taxonomy changes (revalidateTag("nav")). */
export const getNavData = unstable_cache(
  async () => {
    const [categories, makes] = await Promise.all([
      db.category.findMany({ orderBy: { order: "asc" }, select: { name: true, slug: true } }),
      db.make.findMany({ orderBy: { order: "asc" }, select: { name: true, slug: true } }),
    ]);
    return { categories, makes };
  },
  ["nav-data"],
  { revalidate: 300, tags: ["nav"] }
);
export type NavData = Awaited<ReturnType<typeof getNavData>>;
