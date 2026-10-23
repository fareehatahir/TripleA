import { db } from "@/lib/db";
import { ProductForm } from "../product-form";
import { loadTaxonomy } from "../taxonomy-data";
import { getAppSettingFresh } from "@/lib/app-settings";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  const [taxonomy, general] = await Promise.all([loadTaxonomy(), getAppSettingFresh("general")]);
  return (
    <ProductForm
      id={null}
      taxonomy={taxonomy}
      initial={{ sku: await nextSku(), title: "", categoryId: "", condition: "USED", stock: 1, currency: general.defaultCurrency, showPrice: false, featured: false, status: "DRAFT", specs: [], images: [] }}
    />
  );
}

async function nextSku() {
  const n = await db.product.count();
  return `TA-${String(n + 1).padStart(4, "0")}`;
}
