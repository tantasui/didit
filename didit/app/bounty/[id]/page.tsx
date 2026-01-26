"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, Users, Upload, Clock, Share2 } from "lucide-react"
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

        // @ts-expect-error - we know the shape of the object
        const fields = obj.data.content.fields

        // Calculate reward from balance (MIST -> SUI)
        let balanceMist = 0
        if (fields.balance) {
          if (typeof fields.balance === 'object' && 'fields' in fields.balance) {
             // @ts-expect-error - dynamic field access
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
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-dark)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bounty Header */}
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden">
              <div className="relative">
                <img
                  src={bounty.image || "/placeholder.svg"}
                  alt={bounty.title}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge
                    className={`${
                      bounty.status === "open"
                        ? "bg-brand-green"
                        : bounty.status === "judging"
                          ? "bg-brand-orange"
                          : "bg-white/20"
                    } text-black font-bold`}
                  >
                    {bounty.status === "open"
                      ? "🔥 LIVE"
                      : bounty.status === "judging"
                        ? "⏳ JUDGING"
                        : "✅ COMPLETED"}
                  </Badge>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center bg-brand-orange text-black font-black px-4 py-2 rounded-full">
                    <Trophy className="h-5 w-5 mr-2" />
                    {bounty.reward} SUI
                  </div>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-white text-3xl font-black">{bounty.title}</CardTitle>
                <CardDescription className="text-white/80 text-lg leading-relaxed">{bounty.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center text-white/70">
                    <Users className="h-4 w-4 mr-2" />
                    {bounty.participants} participants
                  </div>
                  <div className="flex items-center text-white/70">
                    <Clock className="h-4 w-4 mr-2" />
                    {bounty.timeLeft} left
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border-2 border-white/30">
                      <AvatarFallback className="bg-white/20 text-white font-bold">
                        {bounty.creator.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-white font-bold">{bounty.creator.slice(0, 6)}...{bounty.creator.slice(-4)}</div>
                      <div className="text-white/50 text-sm">Created {bounty.createdDate}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-white/20 hover:bg-white/10 text-white"
                      onClick={() => setIsShareModalOpen(true)}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <Button
                      className={`${
                        bounty.status === "open"
                          ? "bg-brand-green hover:opacity-90"
                          : bounty.status === "judging"
                            ? "bg-brand-orange hover:opacity-90"
                            : "bg-white/20 hover:bg-white/30"
                      } text-black font-bold px-6`}
                      disabled={bounty.status === "completed"}
                      onClick={() => {
                        if (bounty.status === "open") {
                          router.push(`/bounty/${params.id}/submit`)
                        }
                      }}
                    >
                      {bounty.status === "open" ? (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Join Bounty
                        </>
                      ) : bounty.status === "judging" ? (
                        <>
                          <Clock className="h-5 w-5 mr-2" />
                          Judging in Progress
                        </>
                      ) : (
                        <>
                          <Trophy className="h-5 w-5 mr-2" />
                          Bounty Completed
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rules */}
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Bounty Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                   <li className="flex items-start text-white/80">
                      <span className="text-brand-orange mr-3 font-bold">•</span>
                      Have fun and be creative!
                    </li>
                    <li className="flex items-start text-white/80">
                      <span className="text-brand-orange mr-3 font-bold">•</span>
                      Keep it family friendly.
                    </li>
                </ul>
              </CardContent>
            </Card>

            {/* Submissions */}
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <SubmissionList 
                  bountyId={bounty.id} 
                  isCreator={isCreator}
                  onAward={handleOpenAwardModal}
                  isAwarding={isAwarding}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Bounty Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white/70">Reward Pool</span>
                  <span className="text-brand-orange font-black text-lg">{bounty.reward} SUI</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white/70">Participants</span>
                  <span className="text-white font-bold">{bounty.participants}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white/70">Time Left</span>
                  <span className="text-white font-bold">{bounty.timeLeft}</span>
                </div>
              </CardContent>
            </Card>

            {/* Creator Info */}
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Bounty Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16 border-4 border-white/10">
                    <AvatarFallback className="bg-brand-orange text-black font-black text-xl">
                      {bounty.creator.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white font-bold text-lg">{bounty.creator.slice(0, 6)}...</div>
                    <div className="text-brand-green font-bold text-sm">Bounty Master</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
