import type { Metadata, Viewport } from "next"
import { Inter, Source_Sans_3 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ChatWidget } from "@/components/chat-widget"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
})

export const metadata: Metadata = {
  title: "EasyCaseload - Simpler Caseload Management for Independent Professionals",
  description:
    "EasyCaseload is being built to help independent professionals organize, track, and manage their caseloads with clarity. Join the early access list.",
  generator: "v0.app",
  icons: {
    icon: {
      url: "/icon.svg",
      type: "image/svg+xml",
    },
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#2d3a4a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <ChatWidget />
        <Analytics />
      </body>
    </html>
  )
}
