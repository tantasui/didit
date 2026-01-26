'use client'

// import { Nunito_Sans, Roboto } from 'next/font/google'
import './globals.css'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@mysten/dapp-kit/dist/index.css'

// const nunito = Nunito_Sans({ 
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-nunito',
// })

// const roboto = Roboto({
//   weight: ['100', '300', '400', '500', '700', '900'],
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-roboto',
// })

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
})

const queryClient = new QueryClient()

import { Navbar } from '@/components/navbar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <QueryClientProvider client={queryClient}>
          <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
            <WalletProvider>
              <Navbar />
              {children}
            </WalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
