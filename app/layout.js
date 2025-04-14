import { Inter } from 'next/font/google'
import { Pacifico } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })
const pacifico = Pacifico({ 
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pacifico',
})

export const metadata = {
  title: 'Sharos Pin Catalog',
  description: 'Manage your Disney pin collection',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`bg-gray-900 ${pacifico.variable}`}>
      <head>
        <link rel="icon" href="/icon.png" />
      </head>
      <body className={`${inter.className} bg-gray-900 min-h-screen text-gray-100`}>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#1f2937',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#1f2937',
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
