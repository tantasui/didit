"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Copy, Twitter, Share2 } from "lucide-react"

interface ShareBountyModalProps {
  isOpen: boolean
  onClose: () => void
  bountyTitle: string
  bountyId: string
}

export function ShareBountyModal({ isOpen, onClose, bountyTitle, bountyId }: ShareBountyModalProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://didit.app/bounty/${bountyId}`
  const shareText = `Check out this challenge on DiDit: ${bountyTitle} ⚡️`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, "_blank")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900 to-blue-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Challenge
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Spread the word and get more people to join the fun!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          {/* Twitter Share */}
          <Button 
            onClick={handleTwitterShare}
            className="w-full bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white font-bold h-12 text-lg"
          >
            <Twitter className="mr-2 h-5 w-5" />
            Share on Twitter
          </Button>

          {/* Copy Link */}
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <div className="flex items-center justify-between rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white/70">
                <span className="truncate">{shareUrl}</span>
              </div>
            </div>
            <Button type="button" size="icon" onClick={handleCopy} className="bg-white/10 hover:bg-white/20 text-white">
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
