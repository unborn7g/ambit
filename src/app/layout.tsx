import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ambit: know what's covered",
  description:
    "Paste your contract and your client's message. Ambit sorts every request into covered, extra work or unclear, prices the extras in code, and writes your reply.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
