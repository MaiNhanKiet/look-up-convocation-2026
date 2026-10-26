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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "FPTU Convocation Day 2026",
  description:
    "Tra cứu thông tin tham dự lễ tốt nghiệp FPTU Convocation Day 2026 bằng mã số sinh viên.",
  openGraph: {
    title: "FPTU Convocation Day 2026",
    description:
      "Tra cứu thông tin tham dự lễ tốt nghiệp bằng mã số sinh viên.",
    locale: "vi_VN",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F5EF",
  width: "device-width",
  initialScale: 1,
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
