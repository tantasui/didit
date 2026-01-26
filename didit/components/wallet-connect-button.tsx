"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatAddress, cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  useConnectWallet,
  useCurrentAccount,
  useDisconnectWallet,
  useWallets,
  useSuiClientQuery,
} from "@mysten/dapp-kit"
import { ChevronDown, LogOut, Copy, Wallet } from "lucide-react"
import * as React from "react"

interface ConnectButtonProps {
  className?: string
}

export const WalletConnectButton = ({ className }: ConnectButtonProps = {}) => {
  const {
    mutate: connect,
    isPending: isConnecting,
  } = useConnectWallet()

  const account = useCurrentAccount()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectWallet()
  const wallets = useWallets()
  const [open, setOpen] = React.useState(false)

  // Fetch SUI Balance
  const { data: balanceData, isLoading: isBalanceLoading } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address || "" },
    { enabled: !!account }
  )

  const lastUsedWallet = React.useMemo(
    () =>
      typeof window !== "undefined"
        ? (localStorage.getItem("lastUsedWallet") as string | null)
        : null,
    []
  )

  const sortedWallets = React.useMemo(() => {
    if (!lastUsedWallet) {
      return wallets
    }

    const lastWallet = wallets.find((w) => w.name === lastUsedWallet)
    if (!lastWallet) {
      return wallets
    }

    const otherWallets = wallets.filter((w) => w.name !== lastUsedWallet)

    return [lastWallet, ...otherWallets]
  }, [wallets, lastUsedWallet])

  const isDesktop = useMediaQuery("(min-width: 768px)")

  function handleConnect(wallet: ReturnType<typeof useWallets>[number]) {
    connect(
      { wallet },
      {
        onSuccess: () => {
          console.log(`Connected to ${wallet.name}!`)
          localStorage.setItem("lastUsedWallet", wallet.name)
          setOpen(false)
        },
      }
    )
  }

  function handleDisconnect() {
    disconnect()
  }

  const formatSui = (balance: string | undefined) => {
    if (!balance) return "0"
    return (Number(balance) / 1_000_000_000).toFixed(2)
  }

  if (account) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            className={cn(
              "flex items-center gap-2 font-bold rounded-full bg-brand-green text-black hover:opacity-90 hover:bg-brand-green transition-all", 
              className
            )}
          >
            <span className="hidden sm:inline">{formatAddress(account.address)}</span>
            <span className="sm:hidden">{account.address.slice(0, 4)}...</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64 bg-[#1c1c1c] border-white/10 text-white"
          align="end"
        >
          <DropdownMenuGroup>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center">
                <Wallet className="h-4 w-4 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">SUI Balance</p>
                <p className="text-sm font-bold text-white">
                  {isBalanceLoading
                    ? "Loading..."
                    : `${formatSui(balanceData?.totalBalance)} SUI`}
                </p>
              </div>
            </div>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="bg-white/10" />
          
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(account.address)
              // Could add toast here
            }}
            className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-white/10" />
          
          <DropdownMenuItem
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const ConnectButtonContent = (
    <Button 
      disabled={isConnecting} 
      className={cn(
        "bg-brand-green text-black font-bold rounded-full hover:opacity-90 hover:bg-brand-green transition-all",
        className
      )}
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {ConnectButtonContent}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-[#1c1c1c] border-white/10 text-white">
          <DialogHeader className="mb-5">
            <DialogTitle className="text-2xl font-black">Connect Wallet</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a wallet to connect to DiDit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {sortedWallets.map((wallet, index) => (
              <div key={wallet.name} className="relative">
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white hover:border-brand-orange text-white text-lg font-bold"
                  onClick={() => handleConnect(wallet)}
                  disabled={isConnecting}
                >
                  <img src={wallet.icon} alt={wallet.name} className="h-8 w-8 mr-3 rounded-lg" />
                  {wallet.name}
                </Button>
                {index === 0 && lastUsedWallet === wallet.name && (
                  <Badge
                    className="absolute -top-2 -right-2 bg-brand-orange text-black border-none"
                  >
                    Last Used
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {ConnectButtonContent}
      </DrawerTrigger>
      <DrawerContent className="bg-[#1c1c1c] border-white/10 text-white">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-2xl font-black">Connect Wallet</DrawerTitle>
          <DrawerDescription className="text-gray-400">
            Choose a wallet to connect to DiDit.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-3">
          {sortedWallets.map((wallet, index) => (
            <div key={wallet.name} className="relative">
              <Button
                variant="outline"
                className="w-full justify-start h-14 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white hover:border-brand-orange text-white text-lg font-bold"
                onClick={() => handleConnect(wallet)}
              >
                <img src={wallet.icon} alt={wallet.name} className="h-8 w-8 mr-3 rounded-lg" />
                {wallet.name}
              </Button>
              {index === 0 && lastUsedWallet === wallet.name && (
                <Badge
                  className="absolute -top-2 -right-2 bg-brand-orange text-black border-none"
                >
                  Last Used
                </Badge>
              )}
            </div>
          ))}
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}