import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portfolio Tracker',
  description: 'Personal portfolio & watchlist dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-base text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  )
}
