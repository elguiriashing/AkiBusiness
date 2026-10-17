import type { MetadataRoute } from "next";
import { managementProduct, roleSwapEnabled } from "../lib/product-roles";
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  return {
    // Preserve the installed management application identity across releases.
    id: "/akibusiness",
    name: managementProduct.name,
    short_name: managementProduct.name,
    description: `Gestiona locales, alojamientos y flotas con ${managementProduct.name}.`,
    start_url: "/es/business",
    display: "standalone",
    background_color: "#0a1530",
    theme_color: "#1686ff",
    lang: "es",
    scope: "/",
    categories: ["business"],
    icons: roleSwapEnabled
      ? [{ src: "/brand/hq-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
      : ([192, 512] as const).flatMap((size) => [
          {
            src: `/pwa/business-${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "any" as const,
          },
          {
            src: `/pwa/business-maskable-${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "maskable" as const,
          },
        ]),
  };
}
