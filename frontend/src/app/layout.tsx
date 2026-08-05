import './globals.css'
import React from 'react'

export const metadata = {
  title: 'GMC Web System'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
