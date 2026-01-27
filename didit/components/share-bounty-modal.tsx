"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, Copy, Link as LinkIcon, X } from "lucide-react"

interface ShareBountyModalProps {
  isOpen: boolean
  onClose: () => void
  bountyTitle: string
  bountyId: string
}

export function ShareBountyModal({ isOpen, onClose, bountyTitle, bountyId }: ShareBountyModalProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `https://didit.app/bounty/${bountyId}`
    return `${window.location.origin}/bounty/${bountyId}`
  }, [bountyId])
  const shareText = useMemo(() => `Check out this challenge on didit: ${bountyTitle}`, [bountyTitle])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, "_blank")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md p-0 border-0 bg-transparent shadow-none text-white"
      >
        <div className="relative w-full">
          <div className="absolute -inset-0.5 bg-didit-primary opacity-20 blur-2xl rounded-2xl"></div>
          <div className="relative bg-white/5 backdrop-blur-xl border border-didit-primary/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-didit-primary/10 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-didit-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7 0-.24-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3S19.66 2 18 2s-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.2-.08.41-.08.63 0 1.52 1.23 2.75 2.75 2.75S20.5 23.52 20.5 22 19.27 19.25 17.75 19.25c-.63 0-1.21.21-1.67.56l-7.08-4.13c.05-.2.08-.41.08-.63 0-.24-.04-.47-.09-.7l7.12 4.16c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Share Challenge</h2>
                  <p className="text-sm text-white/60 mt-1">Spread the word and get more people to join the fun!</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors rounded-lg p-1"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <button
                type="button"
                onClick={handleTwitterShare}
                className="w-full bg-didit-primary hover:brightness-110 text-black font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(242,127,13,0.4)] hover:shadow-[0_0_25px_rgba(242,127,13,0.6)]"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
                <span className="uppercase tracking-wider text-sm">Share on X / Twitter</span>
              </button>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10"></div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">or copy link</span>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-4 w-4 text-white/40" />
                </div>
                <input
                  className="block w-full pl-10 pr-12 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white/80 focus:outline-none transition-all"
                  readOnly
                  type="text"
                  value={shareUrl}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute inset-y-1.5 right-1.5 px-3 flex items-center justify-center bg-white/10 hover:bg-didit-primary/20 hover:text-didit-primary rounded-lg transition-all active:scale-90"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="h-4 w-4 text-didit-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-didit-accent-green animate-pulse"></div>
                  <span className="text-[10px] uppercase font-bold text-white/60 tracking-tighter">Live Challenge</span>
                </div>
                <div className="text-[10px] uppercase font-bold text-white/60 tracking-tighter">
                  Bounty: <span className="text-didit-primary">{bountyId.slice(0, 10)}...</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-didit-primary/40 rounded-tr-xl pointer-events-none"></div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-didit-primary/40 rounded-bl-xl pointer-events-none"></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
