"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Zap, ArrowLeft, Menu } from "lucide-react"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Navbar() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50 bg-[var(--color-dark-80)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {!isHome && (
              <Link href="/" className="text-white hover:text-brand-orange transition-colors">
                <ArrowLeft className="h-6 w-6" />
              </Link>
            )}
            <Link href="/" className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-brand-orange" />
              <span className="text-2xl font-black text-white tracking-tight">DiDit</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/bounties">
              <Button variant="ghost" className="text-white hover:text-brand-orange font-bold text-base px-4">
                Bounties
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" className="text-white hover:text-brand-orange font-bold text-base px-4">
                Profile
              </Button>
            </Link>
            <div className="scale-100 origin-right">
              <WalletConnectButton />
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center space-x-2">
            <div className="scale-75 origin-right">
              <WalletConnectButton />
            </div>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:text-brand-orange">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[var(--color-dark)] border-white/10 text-white w-[250px]">
                <div className="flex flex-col space-y-6 mt-8">
                  <Link href="/bounties" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-white hover:text-brand-orange font-bold text-lg">
                      Bounties
                    </Button>
                  </Link>
                  <Link href="/profile" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-white hover:text-brand-orange font-bold text-lg">
                      Profile
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}

