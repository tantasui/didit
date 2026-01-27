"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, Users, Upload, Clock, Share2, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { SubmissionList } from "@/components/submission-list"
import { ShareBountyModal } from "@/components/share-bounty-modal"
import { AwardWinnerModal } from "@/components/award-winner-modal"
import { PACKAGE_ID, MODULE_NAME } from "@/app/config"
import { Transaction } from "@mysten/sui/transactions"

// Interface matching the one in bounties/page.tsx
interface Bounty {
  id: string
  title: string
  description: string
  reward: number
  participants: number
  status: "open" | "judging" | "completed"
  creator: string
  createdDate: string
  timeLeft: string
  image: string
  prizeSchedule: number[]
  winners: Record<string, string>
}

export default function BountyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [bounty, setBounty] = useState<Bounty | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false)
  const [selectedSubmitter, setSelectedSubmitter] = useState<string | null>(null)
  const [isAwarding, setIsAwarding] = useState(false)
  const router = useRouter()
  const client = useSuiClient()
  const account = useCurrentAccount()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  const [activeTab, setActiveTab] = useState<"winners" | "submissions" | "rules">("submissions")

  const isCreator = account?.address === bounty?.creator

  // Called when creator clicks "Select as Winner" on a submission
  const handleOpenAwardModal = (submitter: string) => {
    setSelectedSubmitter(submitter)
    setIsAwardModalOpen(true)
  }

  const handleAwardBounty = async (positionIndex: number) => {
    if (!bounty || !account || !selectedSubmitter) return
    setIsAwarding(true)

    try {
      // 1. Find the BountyCreator capability object
      const ownedObjects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::${MODULE_NAME}::BountyCreator`
        }
      })
      
      const capObj = ownedObjects.data[0]
      if (!capObj || !capObj.data) {
        throw new Error("BountyCreator capability not found")
      }

      const tx = new Transaction()
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::award_bounty`,
        arguments: [
          tx.object(bounty.id),
          tx.object(capObj.data.objectId),
          tx.pure.address(selectedSubmitter),
          tx.pure.u64(positionIndex) 
        ]
      })

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Awarded bounty:", result)
            // Refresh bounty data
            window.location.reload()
          },
          onError: (err) => {
            console.error("Failed to award bounty:", err)
            setError("Failed to award bounty. See console for details.")
          }
        }
      )

    } catch (err) {
      console.error("Error in award flow:", err)
      setError("Failed to prepare transaction")
    } finally {
      setIsAwarding(false)
      setIsAwardModalOpen(false)
    }
  }

  useEffect(() => {
    const fetchBounty = async () => {
      setIsLoading(true)
      try {
        const obj = await client.getObject({
          id: id,
          options: { showContent: true }
        })

        if (!obj.data || !obj.data.content || obj.data.content.dataType !== "moveObject") {
          setError("Bounty not found")
          return
        }

        const fields = obj.data.content.fields as any

        // Calculate reward from balance (MIST -> SUI)
        let balanceMist = 0
        if (fields.balance) {
          if (typeof fields.balance === 'object' && 'fields' in fields.balance) {
             balanceMist = Number(fields.balance.fields.value)
          } else {
             balanceMist = Number(fields.balance)
          }
        }
        const rewardSui = balanceMist / 1_000_000_000

        // Parse prize schedule
        const prizeSchedule = (fields.prize_schedule as unknown as string[]).map(p => Number(p) / 1_000_000_000)

        // Parse winners
        const winnersMap: Record<string, string> = {}
        if (fields.winners && typeof fields.winners === 'object' && 'fields' in fields.winners) {
             const contents = (fields.winners.fields as any).contents || []
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             contents.forEach((entry: any) => {
                const key = entry.fields.key // position index
                const value = entry.fields.value // winner address
                winnersMap[key.toString()] = value
             })
        }

        // Calculate time display
        const createdAt = Number(fields.created_at)
        const now = Date.now()
        const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))
        const timeDisplay = diffDays === 0 ? "Today" : `${diffDays}d ago`
        const createdDisplay = new Date(createdAt).toLocaleDateString()

        setBounty({
          id: fields.id.id,
          title: fields.title,
          description: fields.description,
          reward: rewardSui,
          participants: Number(fields.no_of_submissions),
          status: fields.active ? "open" : "completed",
          creator: fields.creator,
          createdDate: createdDisplay,
          timeLeft: timeDisplay,
          image: "/placeholder.svg",
          prizeSchedule: prizeSchedule,
          winners: winnersMap,
        })

      } catch (err) {
        console.error("Error fetching bounty:", err)
        setError("Failed to load bounty")
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchBounty()
    }
  }, [id, client])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-orange"></div>
      </div>
    )
  }

  if (error || !bounty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Oops!</h1>
          <p className="text-xl mb-6">{error || "Bounty not found"}</p>
          <Link href="/bounties">
             <Button className="bg-brand-green text-black">Back to Challenges</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Extract Category and Settlement from Description if present
  const categoryMatch = bounty.description.match(/\[Category: (.*?)\]/)
  const category = categoryMatch ? categoryMatch[1] : "General"
  
  const settlementMatch = bounty.description.match(/\[Settlement: (.*?)\]/)
  const settlement = settlementMatch ? settlementMatch[1] : "Creator"

  // Clean description for display
  const displayDescription = bounty.description
    .replace(/\[Category: .*?\]/, "")
    .replace(/\[Settlement: .*?\]/, "")
    .trim()

  return (
    <div className="bg-didit-background-light dark:bg-didit-background-dark text-slate-900 dark:text-white min-h-screen cyber-grid font-display">
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Column (70%) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Hero Section */}
            <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden group shadow-[0_0_30px_rgba(242,127,13,0.1)]">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
                style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%), url("${bounty.image}")` }}
              >
              </div>
              <div className="absolute top-6 left-6 flex gap-3">
                <div className={`flex items-center gap-2 ${bounty.status === 'open' ? 'bg-didit-accent-green' : 'bg-white/20'} text-black px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider animate-pulse`}>
                  <Zap className="h-4 w-4" />
                  {bounty.status === 'open' ? 'Live' : bounty.status}
                </div>
                <div className="bg-white/10 backdrop-blur-md text-white px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider border border-white/20">
                  Sui Network
                </div>
              </div>
            </div>

            {/* Bounty Info */}
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-white">
                {bounty.title}
              </h1>
              <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Posted {bounty.timeLeft}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{category} • {settlement}</span>
                </div>
              </div>
              <div className="bg-didit-primary/5 border-l-4 border-didit-primary p-6 rounded-r-xl mt-4 backdrop-blur-sm">
                <p className="text-lg leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {displayDescription}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10 flex gap-10 mt-6">
              <button 
                onClick={() => setActiveTab("winners")}
                className={`pb-4 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === "winners" ? "border-b-2 border-didit-primary text-white" : "border-b-2 border-transparent text-slate-400 hover:text-white"}`}
              >
                Winners
              </button>
              <button 
                onClick={() => setActiveTab("submissions")}
                className={`pb-4 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === "submissions" ? "border-b-2 border-didit-primary text-white" : "border-b-2 border-transparent text-slate-400 hover:text-white"}`}
              >
                Submissions ({bounty.participants})
              </button>
              <button 
                onClick={() => setActiveTab("rules")}
                className={`pb-4 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === "rules" ? "border-b-2 border-didit-primary text-white" : "border-b-2 border-transparent text-slate-400 hover:text-white"}`}
              >
                Rules
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex flex-col gap-6 pt-4">
              {activeTab === "winners" && (
                <div className="glass-card p-6 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-xl font-bold italic uppercase tracking-tighter text-white mb-6">Prize Schedule & Winners</h3>
                  
                  <div className="space-y-4">
                    {bounty.prizeSchedule.map((prize, index) => {
                      const winner = bounty.winners[index.toString()]
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className={`size-10 rounded-full flex items-center justify-center font-black text-lg ${
                              index === 0 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50" :
                              index === 1 ? "bg-slate-400/20 text-slate-400 border border-slate-400/50" :
                              index === 2 ? "bg-amber-700/20 text-amber-700 border border-amber-700/50" :
                              "bg-white/10 text-white border border-white/20"
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                {index === 0 ? "Grand Prize" : `${index + 1}nd Place`}
                              </p>
                              <p className="text-xl font-black text-white">{prize} SUI</p>
                            </div>
                          </div>
                          
                          {winner ? (
                            <div className="flex items-center gap-3 bg-didit-accent-green/10 px-4 py-2 rounded-full border border-didit-accent-green/30">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-didit-accent-green text-black text-xs">
                                  {winner.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-right">
                                <p className="text-xs font-bold text-didit-accent-green uppercase tracking-wider">Winner</p>
                                <p className="text-xs font-mono text-white">{winner.slice(0, 6)}...{winner.slice(-4)}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-500 text-xs font-bold uppercase tracking-wider">
                              Unclaimed
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === "submissions" && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold italic uppercase tracking-tighter text-white">Recent Submissions</h3>
                  </div>
                  <SubmissionList 
                    bountyId={bounty.id} 
                    bountyTitle={bounty.title}
                    bountyCreator={bounty.creator}
                    isBountyActive={bounty.status === "open"}
                    prizeSchedule={bounty.prizeSchedule}
                    isCreator={isCreator}
                    onAward={handleOpenAwardModal}
                    isAwarding={isAwarding}
                  />
                </>
              )}

              {activeTab === "rules" && (
                <div className="glass-card p-8 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-xl font-bold italic uppercase tracking-tighter text-white mb-6">Bounty Rules</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="text-didit-primary font-bold text-lg">•</span>
                      <p className="text-slate-300 leading-relaxed">Submissions must be original work created specifically for this bounty.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-didit-primary font-bold text-lg">•</span>
                      <p className="text-slate-300 leading-relaxed">Participants must connect their wallet to submit proof of work.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-didit-primary font-bold text-lg">•</span>
                      <p className="text-slate-300 leading-relaxed">Winners will be selected by the bounty creator based on quality and creativity.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-didit-primary font-bold text-lg">•</span>
                      <p className="text-slate-300 leading-relaxed">Rewards are distributed automatically via the smart contract upon selection.</p>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column (30%) */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* Reward Card */}
            <div className="glass-card p-8 rounded-xl flex flex-col items-center gap-6 border-2 border-didit-primary/30 shadow-[0_0_30px_rgba(242,127,13,0.15)] bg-black/40">
              <div className="text-center">
                <p className="text-sm font-bold text-didit-primary tracking-widest uppercase mb-1">Total Reward</p>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-5xl font-black text-white">{bounty.reward}</span>
                  <span className="text-xl font-bold text-didit-primary">SUI</span>
                </div>
              </div>
              
              <Button
                className={`w-full py-6 rounded-full font-black text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                  bounty.status === "open"
                    ? "bg-didit-primary hover:bg-didit-primary/90 text-didit-background-dark hover:shadow-didit-primary/20"
                    : "bg-white/20 cursor-not-allowed"
                }`}
                disabled={bounty.status !== "open"}
                onClick={() => {
                  if (bounty.status === "open") {
                    router.push(`/bounty/${id}/submit`)
                  }
                }}
              >
                {bounty.status === "open" ? (
                  <>
                    <Upload className="h-5 w-5" />
                    SUBMIT WORK
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5" />
                    {bounty.status === "judging" ? "JUDGING" : "COMPLETED"}
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Participants</p>
                  <p className="text-xl font-black text-white">{bounty.participants}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Status</p>
                  <p className="text-xl font-black text-white capitalize">{bounty.status}</p>
                </div>
              </div>
            </div>

            {/* Creator Card */}
            <div className="glass-card p-6 rounded-xl flex flex-col gap-6 bg-black/20">
              <div className="flex items-center gap-2">
                <Badge className="bg-transparent border border-white/20 text-didit-primary p-0 h-6 w-6 flex items-center justify-center rounded-full">
                  <Trophy className="h-3 w-3" />
                </Badge>
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Bounty Creator</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="size-14 rounded-full border-2 border-didit-primary/50 p-1">
                    <Avatar className="w-full h-full">
                      <AvatarFallback className="bg-didit-primary text-black font-bold">
                        {bounty.creator.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-didit-accent-green size-5 rounded-full flex items-center justify-center border-2 border-didit-background-dark">
                    <span className="text-[10px] text-black font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <h5 className="text-lg font-bold text-white">Creator</h5>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="text-xs font-mono text-white/60">{bounty.creator.slice(0, 6)}...{bounty.creator.slice(-4)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social/Sharing */}
            <div className="flex gap-4">
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="flex-1 glass-card p-3 rounded-xl flex items-center justify-center hover:bg-didit-primary/10 transition-colors border border-white/10"
              >
                <Share2 className="h-5 w-5 text-didit-primary" />
              </button>
            </div>
          </aside>
        </div>
      </div>
      <ShareBountyModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        bountyTitle={bounty.title}
        bountyId={bounty.id}
      />
      
      {bounty && (
        <AwardWinnerModal
          isOpen={isAwardModalOpen}
          onClose={() => setIsAwardModalOpen(false)}
          onConfirm={handleAwardBounty}
          submitter={selectedSubmitter}
          prizeSchedule={bounty.prizeSchedule}
          winners={bounty.winners}
          isAwarding={isAwarding}
        />
      )}
    </div>
  )
}
