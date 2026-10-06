import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/marketing/brand";

export function GET() {
  return Response.json(
    {
      name: BRAND_NAME,
      short_name: BRAND_NAME,
      description: BRAND_DESCRIPTION,
      start_url: "/home",
      display: "standalone",
      background_color: "#fbf6ee",
      theme_color: "#211e19",
      icons: [
        {
          src: "/assets/brand/strap-icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/assets/brand/strap-icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    {
      headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=0, must-revalidate" },
    },
  );
}
