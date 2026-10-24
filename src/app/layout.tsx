import type { Metadata, Viewport } from "next";
import {
  Anton,
  Geist,
  Geist_Mono,
  Oswald,
  Rajdhani,
  Space_Grotesk,
  Teko,
} from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/layout/pwa-register";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display faces — the profile lets the user pick which one drives `--font-display`.
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const teko = Teko({
  variable: "--font-teko",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const fontVars = [grotesk, oswald, teko, rajdhani, anton]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: {
    default: "ValueBet AI",
    template: "%s · ValueBet AI",
  },
  description:
    "AI-drevet værktøj til at finde value-odds på tværs af bookmakere og tracke din betting-portfolio. Analyse og tracking — ikke et spilsted.",
  applicationName: "ValueBet AI",
  appleWebApp: { capable: true, title: "ValueBet", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/pwa-icon/192", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/pwa-icon/maskable-180", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090b11" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
  ],
};

// Applied before first paint so a saved light theme / accent / font doesn't flash.
const BOOT = `try{var d=document.documentElement,s=localStorage,t=s.getItem('vb-theme')||'dark';
d.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;
d.dataset.accent=s.getItem('vb-accent')||'emerald';
d.dataset.displayFont=s.getItem('vb-font')||'grotesk';
d.dataset.surface=s.getItem('vb-surface')||'midnight';
d.dataset.corners=s.getItem('vb-corners')||'round';
d.dataset.glow=s.getItem('vb-glow')||'subtle';
d.dataset.motion=s.getItem('vb-anim')==='false'?'off':'on';}catch(e){
document.documentElement.dataset.theme='dark';}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="da"
      data-theme="dark"
      data-accent="emerald"
      data-display-font="grotesk"
      data-surface="midnight"
      data-corners="round"
      data-glow="subtle"
      data-motion="on"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fontVars} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
