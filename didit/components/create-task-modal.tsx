"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Dice6, Rocket, Plus, Trash2, Info } from "lucide-react"
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"

import { PACKAGE_ID, REGISTRY_ID, MODULE_NAME } from "@/app/config"

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const funTaskIdeas = [
  "Dance with kitchen utensils while making breakfast",
  "Create a superhero costume using only household items",
  "Have a conversation with your pet for 2 minutes straight",
  "Build the tallest tower using only socks",
  "Recreate a famous painting using food items",
  "Do your morning routine in reverse order",
  "Make a music video using only bathroom items",
  "Create a fashion show for your houseplants",
  "Have a tea party with stuffed animals",
  "Make a commercial for an imaginary product",
]

export function CreateTaskModal({ open, onOpenChange }: CreateTaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadlineType, setDeadlineType] = useState<"none" | "date" | "duration">("none")
  const [deadlineValue, setDeadlineValue] = useState("")
  const [prizes, setPrizes] = useState<string[]>([""]) // Start with one empty prize field
  const [category, setCategory] = useState("Tasks")
  const [settlementType, setSettlementType] = useState<"creator" | "community">("creator")
  
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  const categories = ["Memes", "Content", "Tasks"]

  const categoryInfo: Record<string, string> = {
    "Memes": "Viral images, funny edits, and internet culture content.",
    "Content": "Threads, articles, videos, and educational materials.",
    "Tasks": "Specific actions, testing, feedback, or other clear deliverables."
  }

  const generateRandomIdea = () => {
    const randomIdea = funTaskIdeas[Math.floor(Math.random() * funTaskIdeas.length)]
    setTitle(randomIdea.split(" ").slice(0, 4).join(" ") + " Bounty")
    setDescription(randomIdea + ". Be creative and have fun with it! Show us your unique take on this silly bounty.")
  }

  const handleAddPrize = () => {
    if (prizes.length < 5) {
      setPrizes([...prizes, ""])
    }
  }

  const handleRemovePrize = (index: number) => {
    const newPrizes = [...prizes]
    newPrizes.splice(index, 1)
    setPrizes(newPrizes)
  }

  const handlePrizeChange = (index: number, value: string) => {
    const newPrizes = [...prizes]
    newPrizes[index] = value
    setPrizes(newPrizes)
  }

  const handleSubmit = async () => {
    try {
      const tx = new Transaction()
      
      // Calculate total reward required
      // Prices are in SUI, convert to MIST (1 SUI = 1,000,000,000 MIST)
      const validPrizes = prizes.map(p => {
        const val = parseFloat(p)
        return isNaN(val) ? 0 : Math.floor(val * 1_000_000_000)
      }).filter(p => p > 0)

      if (validPrizes.length === 0) {
        alert("Please enter at least one valid prize amount.")
        return
      }

      const totalReward = validPrizes.reduce((a, b) => a + b, 0)
      
      // Calculate deadline timestamp in ms
      let deadlineMs = 0
      if (deadlineType === "date" && deadlineValue) {
        deadlineMs = new Date(deadlineValue).getTime()
      } else if (deadlineType === "duration" && deadlineValue) {
        // Assume duration is in days for simplicity, can be expanded
        const days = parseInt(deadlineValue)
        if (!isNaN(days) && days > 0) {
          deadlineMs = Date.now() + (days * 24 * 60 * 60 * 1000)
        }
      }

      // Split coins for funding
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(totalReward)])

      // Append metadata to description since contract doesn't support these fields yet
      const fullDescription = `${description}\n\n[Category: ${category}]\n[Settlement: ${settlementType === 'community' ? 'Community Voting' : 'Creator Settlement'}]`

      // Call create_bounty
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::create_bounty`,
        arguments: [
          tx.object(REGISTRY_ID), // bountyregistry
          tx.pure.string(crypto.randomUUID()), // offchain_bounty_id
          tx.pure.string(title), // title
          tx.pure.string(fullDescription), // description
          coin, // funding
          tx.pure.vector("u64", validPrizes), // prize_schedule
          tx.pure.u64(deadlineMs), // deadline_ms
        ],
      })

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Bounty created successfully:", result)
            setTitle("")
            setDescription("")
            setPrizes([""])
            onOpenChange(false)
          },
          onError: (error) => {
            console.error("Failed to create bounty:", error)
            alert("Failed to create bounty. See console for details.")
          }
        }
      )
    } catch (e) {
      console.error("Error building transaction:", e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border border-white/20 text-white max-w-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-dark-80)" }}
      >
        <DialogHeader className="text-center space-y-4">
          <DialogTitle className="text-4xl font-black text-white">Create Epic Bounty</DialogTitle>
          <DialogDescription className="text-white/80 text-lg">
            Turn your wildest idea into a crypto-rewarded bounty!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* AI Generate Button */}
          <div className="text-center">
            <Button
              onClick={generateRandomIdea}
              className="bg-brand-green hover:opacity-90 text-black font-bold text-lg px-8 py-4 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="h-5 w-5 mr-2" />✨ AI IDEA GENERATOR
              <Dice6 className="h-5 w-5 ml-2" />
            </Button>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-white text-lg font-bold mb-2 block">
                Bounty Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., Epic Kitchen Danceoff Bounty"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl h-14 text-lg backdrop-blur-lg"
              />
            </div>

            <div>
              <Label className="text-white text-lg font-bold mb-2 block">
                Category
              </Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <div key={cat} className="relative group flex items-center">
                    <button
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${
                        category === cat
                          ? "bg-brand-orange text-black shadow-[0_0_10px_rgba(242,127,13,0.4)]"
                          : "bg-white/5 border border-white/20 text-white hover:bg-white/10"
                      }`}
                    >
                      {cat}
                      <div className="group/info relative">
                        <Info className={`h-4 w-4 ${category === cat ? "text-black/50" : "text-white/50"}`} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/20 rounded-lg text-xs text-white text-center opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 backdrop-blur-md">
                          {categoryInfo[cat]}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white text-lg font-bold mb-2 block">
                Settlement Method
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setSettlementType("creator")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    settlementType === "creator" 
                      ? "bg-white/10 border-brand-orange shadow-[0_0_10px_rgba(242,127,13,0.2)]" 
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`size-4 rounded-full border flex items-center justify-center ${settlementType === "creator" ? "border-brand-orange" : "border-white/50"}`}>
                      {settlementType === "creator" && <div className="size-2 rounded-full bg-brand-orange" />}
                    </div>
                    <span className="font-bold text-white">Creator Settlement</span>
                  </div>
                  <p className="text-xs text-white/60 pl-6">
                    You manually review submissions and select the winners.
                  </p>
                </div>

                <div 
                  onClick={() => setSettlementType("community")}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    settlementType === "community" 
                      ? "bg-white/10 border-brand-orange shadow-[0_0_10px_rgba(242,127,13,0.2)]" 
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`size-4 rounded-full border flex items-center justify-center ${settlementType === "community" ? "border-brand-orange" : "border-white/50"}`}>
                      {settlementType === "community" && <div className="size-2 rounded-full bg-brand-orange" />}
                    </div>
                    <span className="font-bold text-white">Community Voting</span>
                  </div>
                  <p className="text-xs text-white/60 pl-6">
                    The community can select their favorite submission and pick the winner.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-white text-lg font-bold mb-2 block">
                Description
              </Label>
              <p className="text-white/60 text-sm mb-2">
                Clearly describe what the bounty is about and what is expected as the final deliverable.
              </p>
              <Textarea
                id="description"
                placeholder="Describe your bounty in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl min-h-[120px] text-lg backdrop-blur-lg resize-none"
              />
            </div>

            <div>
              <Label className="text-white text-lg font-bold mb-2 block">
                Deadline (Optional)
              </Label>
              <p className="text-white/60 text-sm mb-2">
                Set a time limit or leave it open-ended.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
                <Button 
                  type="button"
                  variant={deadlineType === "none" ? "default" : "outline"}
                  onClick={() => setDeadlineType("none")}
                  className={`w-full sm:w-auto ${deadlineType === "none" ? "bg-brand-orange text-black" : "border-white/20 text-white"}`}
                >
                  No Deadline
                </Button>
                <Button 
                  type="button"
                  variant={deadlineType === "duration" ? "default" : "outline"}
                  onClick={() => setDeadlineType("duration")}
                  className={`w-full sm:w-auto ${deadlineType === "duration" ? "bg-brand-orange text-black" : "border-white/20 text-white"}`}
                >
                  Set Duration (Days)
                </Button>
                <Button 
                  type="button"
                  variant={deadlineType === "date" ? "default" : "outline"}
                  onClick={() => setDeadlineType("date")}
                  className={`w-full sm:w-auto ${deadlineType === "date" ? "bg-brand-orange text-black" : "border-white/20 text-white"}`}
                >
                  Specific Date
                </Button>
              </div>

              {deadlineType === "duration" && (
                <Input
                  type="number"
                  placeholder="Number of days (e.g. 7)"
                  value={deadlineValue}
                  onChange={(e) => setDeadlineValue(e.target.value)}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl h-14 text-lg backdrop-blur-lg"
                />
              )}

              {deadlineType === "date" && (
                <Input
                  type="datetime-local"
                  value={deadlineValue}
                  onChange={(e) => setDeadlineValue(e.target.value)}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl h-14 text-lg backdrop-blur-lg"
                />
              )}
            </div>

            <div>
              <Label className="text-white text-lg font-bold mb-2 block">
                Prizes (SUI)
              </Label>
              <p className="text-white/60 text-sm mb-2">
                Define the rewards. For &quot;First to Deliver&quot;, set a single prize. For ranked winners, add multiple prizes.
              </p>
              <div className="space-y-3">
                {prizes.map((prize, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-bold">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </div>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={prize}
                        onChange={(e) => handlePrizeChange(index, e.target.value)}
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl h-12 text-lg backdrop-blur-lg pl-12"
                      />
                    </div>
                    {prizes.length > 1 && (
                      <Button
                        variant="ghost"
                        onClick={() => handleRemovePrize(index)}
                        className="h-12 w-12 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-xl"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                ))}
                {prizes.length < 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleAddPrize}
                    className="text-brand-orange hover:text-brand-orange hover:bg-white/5 font-bold"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Prize Position
                  </Button>
                )}
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-white/30 text-white hover:bg-white/10 rounded-xl h-14 text-lg font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title || !description || prizes.every(p => !p)}
              className="flex-1 bg-brand-orange hover:opacity-90 text-black font-black text-lg h-14 rounded-xl shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Rocket className="h-5 w-5 mr-2" />
              LAUNCH BOUNTY!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

