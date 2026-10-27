import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Graduation Ceremony 2026",
    short_name: "Graduation 2026",
    description: "Tra cứu thông tin tham dự lễ tốt nghiệp FPTU HCMC",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FE4C03",
    theme_color: "#FE4C03",
    lang: "vi",
    icons: [
      {
        src: "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
