import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Poppins } from 'next/font/google'

import './globals.css'
import SocketProvider from '@/components/SocketProvider'


export const metadata: Metadata = {
  title: 'Rentify Web',
  description: 'Find your perfect rental property in Naga City with Rentify Web. Browse apartments, houses, and villas with ease.',
  generator: 'Rentify Web',
  icons: {
    icon: '/RentNova.png',
    shortcut: '/RentNova.png',
    apple: '/RentNova.png'
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
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  )
}