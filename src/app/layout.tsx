import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import localFont from "next/font/local";
import { PageScrollbar } from "@/components/layout/page-scrollbar";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const axiforma = localFont({
  src: [
    {
      path: "../../public/fonts/Axiforma-Book.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Axiforma-BookItalic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-axiforma",
  display: "swap",
  adjustFontFallback: "Arial",
});

const billy = localFont({
  src: "../../public/fonts/SVN-Billy-Bold.ttf",
  variable: "--font-billy",
  display: "swap",
  weight: "700",
  adjustFontFallback: "Arial",
});

const micra = localFont({
  src: "../../public/fonts/UTM-Micra.ttf",
  variable: "--font-micra",
  display: "swap",
  weight: "400",
  adjustFontFallback: "Arial",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const ogImage = {
  // JPEG is preferred by Facebook scrapers; keep a cache-busting query.
  url: "/images/og-convocation.jpg?v=20261027",
  secureUrl: "/images/og-convocation.jpg?v=20261027",
  type: "image/jpeg",
  width: 1200,
  height: 630,
  alt: "Graduation Ceremony 2026 — FPT University HCMC",
} as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Graduation Ceremony 2026",
  description: "Tra cứu thông tin tham dự lễ tốt nghiệp FPTU HCMC",
  applicationName: "Graduation Ceremony 2026",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    title: "Graduation 2026",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [
      {
        url: "/images/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "Graduation Ceremony 2026",
    description: "Tra cứu thông tin tham dự lễ tốt nghiệp FPTU HCMC.",
    url: "/",
    siteName: "Graduation Ceremony 2026",
    locale: "vi_VN",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Graduation Ceremony 2026",
    description: "Tra cứu thông tin tham dự lễ tốt nghiệp FPTU HCMC.",
    images: [ogImage.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F5EF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${axiforma.variable} ${billy.variable} ${micra.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">
        {children}
        <PageScrollbar />
      </body>
    </html>
  );
}
