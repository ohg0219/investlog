import type { Metadata } from 'next'
import CustomCursor from '@/components/ui/CustomCursor'
import {
  Instrument_Serif,
  DM_Mono,
  Bebas_Neue,
  Noto_Serif_KR,
} from 'next/font/google'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
})

const dmMono = DM_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
})

const notoSerifKR = Noto_Serif_KR({
  variable: '--font-kr',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'investlog',
  description: 'Your Investment, Logged.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body
        className={`${instrumentSerif.variable} ${dmMono.variable} ${bebasNeue.variable} ${notoSerifKR.variable} bg-ink text-paper antialiased`}
      >
        <CustomCursor />
        {children}
      </body>
    </html>
  )
}
