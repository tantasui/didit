"use client"

import Link from "next/link"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full glass-card border-b border-white/5 px-6 lg:px-40 py-3">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="size-8 text-didit-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">didit</h2>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          <Link href="/profile" className="text-sm font-medium hover:text-didit-primary transition-colors text-white">
            profile
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium hover:text-didit-primary transition-colors text-white">
            leaderboard
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <WalletConnectButton className="bg-didit-primary text-didit-background-dark px-6 py-2.5 rounded-full text-sm font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(242,127,13,0.3)] hover:bg-didit-primary border-none h-auto" />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <div className="scale-75 origin-right">
              <WalletConnectButton className="bg-didit-primary text-didit-background-dark px-6 py-2.5 rounded-full text-sm font-bold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(242,127,13,0.3)] hover:bg-didit-primary border-none h-auto" />
            </div>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:text-didit-primary">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-didit-background-dark border-white/10 text-white w-[260px]">
                <div className="flex flex-col space-y-6 mt-10">
                  <Link href="/profile" onClick={() => setIsOpen(false)} className="text-lg font-bold hover:text-didit-primary transition-colors">
                    profile
                  </Link>
                  <Link href="/leaderboard" onClick={() => setIsOpen(false)} className="text-lg font-bold hover:text-didit-primary transition-colors">
                    leaderboard
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
