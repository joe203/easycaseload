import type { Metadata, Viewport } from "next"
import { Inter, Source_Sans_3 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ChatWidget } from "@/components/chat-widget"
import { Providers } from "./providers"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
})

export const metadata: Metadata = {
  title: "EasyCaseload - The AI Assistant for Itinerant Teachers",
  description:
    "EasyCaseload handles the paperwork so itinerant teachers can focus on their students. Log sessions, manage your caseload, and generate documentation by simply talking.",
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
        <Providers>
          {children}
          <ChatWidget />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
