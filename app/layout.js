import { Inter } from 'next/font/google'
import { Pacifico } from 'next/font/google'
import { Dancing_Script } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })
const pacifico = Pacifico({ 
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pacifico',
})
const dancingScript = Dancing_Script({ subsets: ['latin'] })

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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen flex flex-col`}>
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
        <div className="flex-grow">
          {children}
        </div>
      </body>
    </html>
  )
}
