import type { Metadata } from 'next'
import './globals.css'
import Head from 'next/head'

export const metadata: Metadata = {
  title: 'ComprassApp',
  description: 'Created with PabloRomero',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" />
        <link rel="icon" type="image/png" href="/favicon-128x128.png" sizes="128x128" />
        <link rel="icon" type="image/png" href="/favicon-256x256.png" sizes="256x256" />
        <link rel="apple-touch-icon" href="/favicon-256x256.png" />
        <meta name="theme-color" content="#16a34a" />
      </Head>
      <body>{children}</body>
    </html>
  )
}