import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { GlobalLoading } from "@/components/global-loading";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--font-fraunces" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = { title: "Restro Pro, Multi-branch", description: "Owner console for multi-branch restaurants." };
export const viewport = { themeColor: "#161310" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem("rp_theme");document.documentElement.setAttribute("data-theme",s==="light"?"light":"dark");}catch(e){}})();` }} />
      </head>
      <body className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} font-body`}>
        <GlobalLoading />
        {children}
      </body>
    </html>
  );
}
