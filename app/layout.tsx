import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Poppins } from 'next/font/google'

import './globals.css'
import ClientLayout from '@/components/client-layout'


export const metadata: Metadata = {
  title: 'RentaPo',
  description: 'Find your perfect rental property in Naga City with RentaPo. Browse apartments, houses, and villas with ease.',
  generator: 'RentaPo',
  icons: {
    icon: '/rentify-logo.png',
    shortcut: '/rentify-logo.png',
    apple: '/rentify-logo.png'
  }
}

const poppins = Poppins({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-poppins' })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className} ${GeistMono.variable}`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}