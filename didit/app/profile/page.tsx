"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, Copy, Plus, Filter } from "lucide-react"
import Link from "next/link"
import { CreateTaskModal } from "@/components/create-task-modal"
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import { PACKAGE_ID, MODULE_NAME } from "@/app/config"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"participated" | "created" | "saved">("participated")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const account = useCurrentAccount()
  const client = useSuiClient()
  
  const [createdBounties, setCreatedBounties] = useState<Array<{
    id: string
    title: string
    reward: number
    participants: number
    status: "open" | "completed"
    createdAt: number
  }>>([])
  const [participatedBounties, setParticipatedBounties] = useState<Array<{
    bountyId: string
    bountyTitle: string
    submittedAt: number
    proofUrl: string
    metadataUrl?: string
  }>>([])
  const [earnedSui, setEarnedSui] = useState(0)
  const [wins, setWins] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchUserData() {
      if (!account?.address) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const ownedObjects = await client.getOwnedObjects({
          owner: account.address,
          filter: {
            MatchAny: [
              { StructType: `${PACKAGE_ID}::${MODULE_NAME}::BountyCreator` },
              { StructType: `${PACKAGE_ID}::${MODULE_NAME}::SubmissionReceipt` }
            ]
          },
          options: { showContent: true }
        })

        const receiptData: Array<{ bountyId: string; submittedAt: number; proofUrl: string; metadataUrl?: string }> = []

        ownedObjects.data.forEach((obj) => {
          if (obj.data?.content?.dataType === "moveObject") {
            const type = obj.data.content.type
            const fields = obj.data.content.fields as any

            if (type.includes("::SubmissionReceipt")) {
              receiptData.push({
                bountyId: fields.bounty_id,
                submittedAt: Number(fields.submitted_at),
                proofUrl: fields.proof_url,
                metadataUrl: fields.metadata_url
              })
            }
          }
        })

        const createdEvents = await client.queryEvents({
           query: {
              MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::BountyCreated`
           },
        })

        const myCreatedBounties = createdEvents.data
           .filter((e: any) => e.parsedJson.creator === account.address)
           .map((e: any) => ({
              id: e.parsedJson.bounty_id,
              createdAt: Number(e.parsedJson.created_at)
           }))

        if (myCreatedBounties.length > 0) {
           const bountyObjects = await client.multiGetObjects({
              ids: myCreatedBounties.map(b => b.id),
              options: { showContent: true }
           })
           
           const mappedCreated = bountyObjects.map((obj, idx) => {
              if (obj.data?.content?.dataType === "moveObject") {
                 const fields = obj.data.content.fields as any
                 let balanceMist = 0
                 if (fields.balance) {
                    if (typeof fields.balance === 'object' && 'fields' in fields.balance) {
                       balanceMist = Number(fields.balance.fields.value)
                    } else {
                       balanceMist = Number(fields.balance)
                    }
                 }
                 
                 return {
                    id: fields.id.id,
                    title: fields.title,
                    reward: balanceMist / 1_000_000_000,
                    participants: Number(fields.no_of_submissions),
                    status: (fields.active ? "open" : "completed") as "open" | "completed",
                    createdAt: myCreatedBounties[idx].createdAt
                 }
              }
              return null
           }).filter((v): v is NonNullable<typeof v> => Boolean(v))
           setCreatedBounties(mappedCreated)
        } else {
           setCreatedBounties([])
        }

        if (receiptData.length > 0) {
           const uniqueBountyIds = Array.from(new Set(receiptData.map(r => r.bountyId)))
           const bountyObjects = await client.multiGetObjects({
              ids: uniqueBountyIds,
              options: { showContent: true }
           })
           
           const bountyMap = new Map<string, string>()
           bountyObjects.forEach(obj => {
              if (obj.data?.content?.dataType === "moveObject") {
                 const fields = obj.data.content.fields as any
                 bountyMap.set(fields.id.id, fields.title)
              }
           })

           const mappedParticipated = receiptData.map(r => ({
              ...r,
              bountyTitle: bountyMap.get(r.bountyId) || "Unknown Bounty"
           }))
           setParticipatedBounties(mappedParticipated)
        } else {
           setParticipatedBounties([])
        }

        const awardedEvents = await client.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::BountyAwarded`
          }
        })

        const myAwards = awardedEvents.data.filter((e: any) => e.parsedJson.winner === account.address)
        const earnedMist = myAwards.reduce((sum: number, e: any) => sum + Number(e.parsedJson.amount), 0)
        setWins(myAwards.length)
        setEarnedSui(earnedMist / 1_000_000_000)
      } catch (err) {
        console.error("Error fetching profile:", err)
        setCreatedBounties([])
        setParticipatedBounties([])
        setWins(0)
        setEarnedSui(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [account, client])

  const shortAddress = useMemo(() => {
    if (!account?.address) return ""
    return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
  }, [account?.address])

  const scoreXp = useMemo(() => {
    return createdBounties.length * 50 + participatedBounties.length * 10 + wins * 100
  }, [createdBounties.length, participatedBounties.length, wins])

  const level = useMemo(() => {
    return Math.max(1, Math.floor(scoreXp / 250) + 1)
  }, [scoreXp])

  const nextLevelXp = useMemo(() => level * 250, [level])
  const prevLevelXp = useMemo(() => (level - 1) * 250, [level])
  const progressPct = useMemo(() => {
    const denom = nextLevelXp - prevLevelXp
    if (denom <= 0) return 0
    return Math.min(100, Math.max(0, Math.round(((scoreXp - prevLevelXp) / denom) * 100)))
  }, [nextLevelXp, prevLevelXp, scoreXp])

  const handleCopyAddress = async () => {
    if (!account?.address) return
    try {
      await navigator.clipboard.writeText(account.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  if (!account?.address) {
    return (
      <div className="min-h-screen bg-didit-background-light dark:bg-didit-background-dark flex items-center justify-center px-6">
        <div className="glass p-10 rounded-3xl max-w-xl w-full text-center">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">Connect Wallet</h1>
          <p className="text-white/60">Connect your wallet to view your profile and your on-chain activity.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-didit-background-light dark:bg-didit-background-dark text-slate-900 dark:text-white min-h-screen font-display">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-didit-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="glass rounded-2xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="relative">
                <div className="size-32 md:size-40 rounded-full border-4 border-didit-primary p-1">
                  <div
                    className="w-full h-full rounded-full bg-cover bg-center"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBg-egGvAQ3OHtTpPlveOHISIK7u-aqhqx9LN6qZ_4zfubYRRAq8mgb8oenitPtzXDbOWxIkfvG5Fl0uPSBhAgl3NQLIOBTM1NIkrzPuCdxF3eWmyvlmLFixyY8MOeZ2nwYfT-STinCo5v3Ey_xBZcRT5451SqPogRfWyspr9MhMk5SPEWVsBy-FSTDcAzODKyLrMAZOnsxS01CWVYfQ-G3HIZFMzTiZl6Q9g3MPURCR3n-ZTaojOvsoUEwRH9v7Hdfskau5sbfXQyQ')"
                    }}
                  ></div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-didit-primary text-didit-background-dark text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Lvl {level}
                </div>
              </div>

              <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold mb-1 text-white">
                  didit Builder
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-sm font-mono">{account.address}</span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex items-center justify-center rounded-full size-8 hover:bg-white/5 transition-colors"
                    aria-label="Copy address"
                  >
                    <Copy className={`h-4 w-4 ${copied ? "text-didit-primary" : "text-white/60"}`} />
                  </button>
                </div>
                <p className="text-sm text-slate-400 max-w-md">
                  Your on-chain profile shows bounties you created, submissions you made, and rewards you earned.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <Button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-didit-primary text-didit-background-dark hover:shadow-[0_0_20px_rgba(242,127,13,0.4)] transition-all font-bold text-sm h-auto"
              >
                <Plus className="h-4 w-4" />
                create bounty
              </Button>
              <Link
                href="/bounties"
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-sm"
              >
                explore
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            <div className="flex flex-col gap-1 p-5 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">didit Score</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-didit-primary">{scoreXp} XP</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-5 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Bounties Won</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{wins}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-5 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Earned SUI</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{earnedSui.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-5 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Created</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">{createdBounties.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-didit-primary/5 border border-didit-primary/10">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-xs font-bold text-didit-primary uppercase tracking-tighter">Next Rank</p>
                <p className="text-lg font-bold text-white">Level {level + 1}</p>
              </div>
              <p className="text-sm font-bold text-didit-primary">{progressPct}%</p>
            </div>
            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-didit-primary neon-glow transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{Math.max(0, nextLevelXp - scoreXp)} XP remaining</p>
          </div>
        </section>

        <div className="flex items-center justify-between border-b border-white/10 mb-8 overflow-x-auto">
          <div className="flex gap-10">
            <button
              type="button"
              onClick={() => setActiveTab("participated")}
              className={`pb-4 border-b-2 font-bold text-lg px-2 transition-colors ${
                activeTab === "participated"
                  ? "border-didit-primary text-didit-primary"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              entries
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("created")}
              className={`pb-4 border-b-2 font-bold text-lg px-2 transition-colors ${
                activeTab === "created"
                  ? "border-didit-primary text-didit-primary"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              created
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={`pb-4 border-b-2 font-bold text-lg px-2 transition-colors ${
                activeTab === "saved"
                  ? "border-didit-primary text-didit-primary"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              saved
            </button>
          </div>
          <div className="flex items-center gap-4 pb-4">
            <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border border-white/10 rounded-full px-4 py-2 hover:bg-white/5">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-didit-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === "participated" &&
              (participatedBounties.length === 0 ? (
                <div className="col-span-full text-center py-20 text-white/50 text-lg">
                  No submissions yet.
                </div>
              ) : (
                participatedBounties.map((submission) => (
                  <div
                    key={`${submission.bountyId}-${submission.submittedAt}`}
                    className="glass rounded-2xl p-6 group cursor-pointer hover:border-didit-primary/40 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 rounded-full bg-didit-primary/10 text-didit-primary text-[10px] font-bold uppercase tracking-widest border border-didit-primary/20">
                        Submitted
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold mb-4 group-hover:text-didit-primary transition-colors line-clamp-2 text-white">
                      {submission.bountyTitle}
                    </h3>

                    <div className="aspect-video bg-black/50 rounded-xl overflow-hidden relative border border-white/10">
                      <img
                        src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${submission.proofUrl}`}
                        className="w-full h-full object-cover"
                        alt="Submission proof"
                      />
                      <a
                        href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${submission.proofUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="text-white" />
                      </a>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                      <Link href={`/bounty/${submission.bountyId}`} className="text-sm font-bold text-didit-primary hover:underline">
                        View Bounty
                      </Link>
                      <span className="text-xs text-slate-500 font-medium">{shortAddress}</span>
                    </div>
                  </div>
                ))
              ))}

            {activeTab === "created" &&
              (createdBounties.length === 0 ? (
                <div className="col-span-full text-center py-20 text-white/50 text-lg">
                  no bounties created yet
                </div>
              ) : (
                createdBounties.map((bounty) => (
                  <Link
                    key={bounty.id}
                    href={`/bounty/${bounty.id}`}
                    className="glass rounded-2xl p-6 group hover:border-didit-primary/40 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                          bounty.status === "open"
                            ? "bg-didit-primary/10 text-didit-primary border-didit-primary/20"
                            : "bg-green-500/10 text-green-500 border-green-500/20"
                        }`}
                      >
                        {bounty.status === "open" ? "Active" : "Completed"}
                      </span>
                      <span className="text-2xl font-bold text-didit-primary">{bounty.reward} SUI</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-didit-primary transition-colors line-clamp-2 text-white">
                      {bounty.title}
                    </h3>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-xs text-slate-400 font-medium">{bounty.participants} Submissions</span>
                      <span className="text-xs text-slate-500 font-medium">{new Date(bounty.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))
              ))}

            {activeTab === "saved" && (
              <div className="col-span-full text-center py-20 text-white/50 text-lg">
                Saved bounties are not available yet.
              </div>
            )}
          </div>
        )}

        <footer className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm pb-12">
          <p>© 2024 didit Protocol. Built on Sui Network.</p>
          <div className="flex gap-6">
            <a className="hover:text-didit-primary" href="#">Terms of Service</a>
            <a className="hover:text-didit-primary" href="#">Privacy Policy</a>
            <a className="hover:text-didit-primary" href="#">Support</a>
          </div>
        </footer>
      </main>

      <CreateTaskModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  )
}
