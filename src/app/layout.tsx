import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MedBuddy AI - Medication Reminder',
  description: 'Voice-first medication reminder app for elderly patients',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
