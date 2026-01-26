"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, Target, Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { CreateTaskModal } from "@/components/create-task-modal"
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import { PACKAGE_ID, MODULE_NAME } from "@/app/config"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const account = useCurrentAccount()
  const client = useSuiClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [createdBounties, setCreatedBounties] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [participatedBounties, setParticipatedBounties] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUserData() {
      if (!account?.address) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // 1. Fetch objects owned by user to find Created Bounties (BountyCreator cap)
        // and Participated Bounties (SubmissionReceipt)
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const receiptData: any[] = []

        ownedObjects.data.forEach((obj) => {
          if (obj.data?.content?.dataType === "moveObject") {
             const type = obj.data.content.type
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const fields = obj.data.content.fields as any

             if (type.includes("::BountyCreator")) {
                // We need to fetch the actual bounties. The BountyCreator cap 
                // doesn't store the bounty ID directly in our current contract (it stores user address).
                // Wait, looking at the contract, BountyCreator is just a capability.
                // The actual Bounty object is shared.
                // We need to query events to find which bounties this user created.
             } else if (type.includes("::SubmissionReceipt")) {
                receiptData.push({
                   bountyId: fields.bounty_id,
                   submittedAt: Number(fields.submitted_at),
                   proofUrl: fields.proof_url
                })
             }
          }
        })

        // Fetch Created Bounties via Events (more reliable since Bounty is shared)
        const createdEvents = await client.queryEvents({
           query: {
              MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::BountyCreated`
           },
           // Filter by sender in client-side since API doesn't support complex filters
        })

        const myCreatedBounties = createdEvents.data
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           .filter((e: any) => e.parsedJson.creator === account.address)
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           .map((e: any) => ({
              id: e.parsedJson.bounty_id,
              createdAt: Number(e.parsedJson.created_at)
           }))

        // Fetch details for created bounties
        if (myCreatedBounties.length > 0) {
           const bountyObjects = await client.multiGetObjects({
              ids: myCreatedBounties.map(b => b.id),
              options: { showContent: true }
           })
           
           const mappedCreated = bountyObjects.map((obj, idx) => {
              if (obj.data?.content?.dataType === "moveObject") {
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const fields = obj.data.content.fields as any
                 // Calculate balance
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
                    status: fields.active ? "open" : "completed",
                    createdAt: myCreatedBounties[idx].createdAt
                 }
              }
              return null
           }).filter(Boolean)
           setCreatedBounties(mappedCreated)
        }

        // For participated, we have the receipts. We can also fetch the bounty details if we want titles.
        if (receiptData.length > 0) {
           // Dedup bounty IDs
           const uniqueBountyIds = Array.from(new Set(receiptData.map(r => r.bountyId)))
           const bountyObjects = await client.multiGetObjects({
              ids: uniqueBountyIds,
              options: { showContent: true }
           })
           
           const bountyMap = new Map()
           bountyObjects.forEach(obj => {
              if (obj.data?.content?.dataType === "moveObject") {
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const fields = obj.data.content.fields as any
                 bountyMap.set(fields.id.id, fields.title)
              }
           })

           const mappedParticipated = receiptData.map(r => ({
              ...r,
              bountyTitle: bountyMap.get(r.bountyId) || "Unknown Bounty"
           }))
           setParticipatedBounties(mappedParticipated)
        }

      } catch (err) {
        console.error("Error fetching profile:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [account, client])

  if (!account) {
    return (
      <div className="min-h-screen bg-[var(--color-dark)] flex items-center justify-center">
         <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">Please Connect Wallet</h1>
            <p className="text-white/70">Connect your wallet to view your profile and manage challenges.</p>
         </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-dark)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="mb-12">
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-white/30">
                    <AvatarFallback className="text-4xl bg-brand-orange text-black font-black">
                      {account.address.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 text-center lg:text-left">
                  <h1 className="text-4xl font-black text-white mb-2">
                     {account.address.slice(0, 6)}...{account.address.slice(-4)}
                  </h1>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-black text-brand-orange">
                         {createdBounties.length + participatedBounties.length * 10}
                      </div>
                      <div className="text-white/70 font-medium">Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-white">{createdBounties.length}</div>
                      <div className="text-white/70 font-medium">Created</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-white">{participatedBounties.length}</div>
                      <div className="text-white/70 font-medium">Participated</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-4">
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-brand-orange hover:opacity-90 text-black font-black px-8 py-4 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <Target className="h-5 w-5 mr-2" />
                    CREATE BOUNTY
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white/10 rounded-2xl p-2 backdrop-blur-lg border border-white/20">
            {["created", "participated"].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-8 py-3 font-bold transition-all duration-300 ${
                  activeTab === tab ? "bg-brand-green text-black shadow-lg" : "text-white hover:bg-white/10"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {isLoading ? (
             <div className="flex justify-center pt-20">
                <Loader2 className="animate-spin h-12 w-12 text-brand-orange" />
             </div>
          ) : (
             <>
               {activeTab === "created" && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {createdBounties.length === 0 ? (
                      <div className="col-span-3 text-center text-white/50 py-10">
                         No bounties created yet. Start one today!
                      </div>
                   ) : (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      createdBounties.map((task: any) => (
                        <Link href={`/bounty/${task.id}`} key={task.id}>
                         <Card
                           className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-orange/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                         >
                           <CardHeader>
                             <CardTitle className="text-white text-lg font-bold truncate">{task.title}</CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                             <div className="flex justify-between items-center">
                               <div className="text-brand-orange font-bold">
                                 <Trophy className="h-4 w-4 inline mr-1" />
                                 {task.reward} SUI
                               </div>
                               <Badge
                                 className={`${
                                   task.status === "open" ? "bg-brand-green" : "bg-brand-orange"
                                 } text-black font-bold`}
                               >
                                 {task.status === "open" ? "LIVE" : "COMPLETED"}
                               </Badge>
                             </div>
                             <div className="flex justify-between text-sm text-white/70">
                               <span>{task.participants} participants</span>
                               <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                             </div>
                           </CardContent>
                         </Card>
                        </Link>
                      ))
                   )}
                 </div>
               )}

               {activeTab === "participated" && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {participatedBounties.length === 0 ? (
                      <div className="col-span-3 text-center text-white/50 py-10">
                         You haven&apos;t participated in any bounties yet.
                      </div>
                   ) : (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      participatedBounties.map((submission: any, idx) => (
                         <Card
                           key={idx}
                           className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-green/50 transition-all duration-300"
                         >
                           <CardHeader>
                             <CardTitle className="text-white text-lg font-bold truncate">
                                {submission.bountyTitle}
                             </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-4">
                             <div className="aspect-video bg-black/50 rounded-lg overflow-hidden relative group">
                                <img 
                                   src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${submission.proofUrl}`}
                                   className="w-full h-full object-cover"
                                   alt="Proof"
                                />
                                <a 
                                  href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${submission.proofUrl}`}
                                  target="_blank"
                                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                   <ExternalLink className="text-white" />
                                </a>
                             </div>
                             <div className="flex justify-between text-sm text-white/70">
                               <span>Submitted</span>
                               <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                             </div>
                             <Link href={`/bounty/${submission.bountyId}`}>
                                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 mt-2">
                                   View Bounty
                                </Button>
                             </Link>
                           </CardContent>
                         </Card>
                      ))
                   )}
                 </div>
               )}
             </>
          )}
        </div>
      </div>

      <CreateTaskModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  )
}
