"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, Check, Lock } from "lucide-react"

interface AwardWinnerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (positionIndex: number) => void
  submitter: string | null
  prizeSchedule: number[] // Amounts in SUI
  winners: Record<string, string> // Map of position index (as string) to winner address
  isAwarding: boolean
}

export function AwardWinnerModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  submitter, 
  prizeSchedule, 
  winners,
  isAwarding 
}: AwardWinnerModalProps) {
  
  if (!submitter) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900 to-blue-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Select Prize Position
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Choose which prize to award to <span className="font-mono text-white bg-white/10 px-1 rounded">{submitter.slice(0, 6)}...{submitter.slice(-4)}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 py-4">
          {prizeSchedule.map((amount, index) => {
            const isTaken = winners[index.toString()] !== undefined
            const winnerAddress = winners[index.toString()]
            
            // Calculate ordinal (1st, 2nd, 3rd...)
            const ordinal = (n: number) => {
              const s = ["th", "st", "nd", "rd"]
              const v = n % 100
              return n + (s[(v - 20) % 10] || s[v] || s[0])
            }

            return (
              <Button
                key={index}
                variant="outline"
                className={`h-auto py-4 justify-between border-white/20 ${
                   isTaken 
                     ? "bg-white/5 opacity-50 cursor-not-allowed" 
                     : "bg-white/10 hover:bg-white/20 hover:border-brand-orange"
                } text-white`}
                disabled={isTaken || isAwarding}
                onClick={() => !isTaken && onConfirm(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-black ${
                     index === 0 ? "bg-yellow-400" : index === 1 ? "bg-gray-300" : index === 2 ? "bg-amber-600" : "bg-white"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="text-left">
                    <div className="font-bold">{ordinal(index + 1)} Place</div>
                    <div className="text-sm text-white/70">{amount} SUI</div>
                  </div>
                </div>

                {isTaken ? (
                  <div className="flex items-center text-xs text-white/50 bg-black/30 px-2 py-1 rounded">
                    <Lock className="w-3 h-3 mr-1" />
                    Awarded to {winnerAddress.slice(0, 4)}...
                  </div>
                ) : (
                  <div className="flex items-center text-brand-green font-bold text-sm">
                    Select <Check className="w-4 h-4 ml-1" />
                  </div>
                )}
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
