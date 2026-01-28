"use client"

import { useState, useEffect } from "react"
import { Search, Clock, MessageCircle, Share2, Globe } from "lucide-react"
import Link from "next/link"
import { CreateTaskModal } from "@/components/create-task-modal"
import { useSuiClient } from "@mysten/dapp-kit"
import { REGISTRY_ID } from "@/app/config"

interface Bounty {
  id: string
  title: string
  description: string
  reward: number
  participants: number
  status: "open" | "judging" | "completed"
  creator: string
  timeLeft: string
  image: string
}

export default function BountiesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const client = useSuiClient()

  useEffect(() => {
    const fetchBounties = async () => {
      setIsLoading(true)
      try {
        const registryObj = await client.getObject({
          id: REGISTRY_ID,
          options: { showContent: true }
        })

        if (!registryObj.data || !registryObj.data.content || registryObj.data.content.dataType !== "moveObject") {
          setBounties([])
          return
        }

        // @ts-expect-error - we know the shape of the object
        const bountyIds = registryObj.data.content.fields.bounties as string[]

        if (!bountyIds || bountyIds.length === 0) {
          setBounties([])
          return
        }

        const bountyObjects = await client.multiGetObjects({
          ids: bountyIds,
          options: { showContent: true }
        })

        const fetchedBounties: Bounty[] = bountyObjects.map((obj) => {
          if (!obj.data || !obj.data.content || obj.data.content.dataType !== "moveObject") {
            return null
          }
          
          const fields = obj.data.content.fields as any

          let balanceMist = 0
          if (fields.balance) {
            if (typeof fields.balance === 'object' && 'fields' in fields.balance) {
               balanceMist = Number(fields.balance.fields.value)
            } else {
               balanceMist = Number(fields.balance)
            }
          }

          const rewardSui = balanceMist / 1_000_000_000

          const createdAt = Number(fields.created_at)
          const now = Date.now()
          const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))
          const timeDisplay = diffDays === 0 ? "Today" : `${diffDays}d ago`

          return {
            id: fields.id.id,
            title: fields.title,
            description: fields.description,
            reward: rewardSui,
            participants: Number(fields.no_of_submissions),
            status: fields.active ? "open" : "completed",
            creator: fields.creator.slice(0, 6) + "..." + fields.creator.slice(-4),
            timeLeft: timeDisplay,
            image: "/placeholder.svg",
          } as Bounty
        }).filter((b): b is Bounty => b !== null)

        // Set fetched bounties
        setBounties(fetchedBounties)

      } catch (error) {
        console.error("Error fetching bounties:", error)
        setBounties([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchBounties()
  }, [client, showCreateModal])

  const statuses = ["all", "open", "judging", "completed"]

  const filteredBounties = bounties.filter((bounty) => {
    const matchesSearch =
      bounty.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bounty.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = selectedStatus === "all" || bounty.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="bg-didit-background-light dark:bg-didit-background-dark font-display text-white min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Title */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2">
            onchain <span className="text-didit-primary italic">bounties</span>
          </h1>
          <p className="text-white/60 text-lg">prove you did it. get paid in SUI.</p>
        </div>

        {/* Search & Filters Container */}
        <div className="glass p-6 rounded-2xl mb-12 flex flex-col gap-6">
          {/* Search Bar */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-didit-primary/60">
              <Search className="h-6 w-6" />
            </div>
            <input 
              className="w-full bg-didit-background-dark/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-didit-primary/50 transition-colors" 
              placeholder="search bounties, creators, or categories..." 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Categories/Statuses */}
          <div className="flex flex-wrap gap-3">
            {statuses.map((status) => (
              <button 
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
                  selectedStatus === status 
                    ? "bg-didit-primary text-didit-background-dark neon-glow" 
                    : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {status === "all" ? "all bounties" : status}
              </button>
            ))}
          </div>
        </div>

        {/* Bounty Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-didit-primary"></div>
          </div>
        ) : filteredBounties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBounties.map((bounty) => (
              <Link href={`/bounty/${bounty.id}`} key={bounty.id}>
                <div className="group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden card-hover h-full">
                  <div className="relative aspect-video w-full bg-center bg-cover" style={{ backgroundImage: `url('${bounty.image}')` }}>
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className={`text-didit-background-dark text-[10px] font-black uppercase px-2 py-1 rounded ${bounty.status === 'open' ? 'bg-didit-primary/90' : 'bg-white/90'}`}>
                        {bounty.status === 'open' ? 'Live' : 'Completed'}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col grow">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-didit-primary transition-colors">{bounty.title}</h3>
                    <p className="text-white/60 text-sm line-clamp-2 mb-6">{bounty.description}</p>
                    <div className="mt-auto pt-5 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-didit-primary font-bold text-lg">{bounty.reward} SUI</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/40 text-xs font-medium">
                        <Clock className="h-4 w-4" />
                        {bounty.timeLeft}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-white/50 text-xl">
             No bounties found.
          </div>
        )}

        {/* Pagination/Load More */}
        <div className="mt-16 flex justify-center">
          <button className="px-12 py-4 rounded-xl border-2 border-didit-primary/20 hover:border-didit-primary text-didit-primary font-bold transition-all bg-didit-primary/5">
            Load More Bounties
          </button>
        </div>
      </main>

      <footer className="border-t border-white/10 py-12 px-6 mt-20 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 grayscale opacity-50">
            <div className="size-6 text-white">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
            <span className="font-bold uppercase tracking-widest text-sm">didit marketplace</span>
          </div>
          <p className="text-white/30 text-xs font-medium">powered by Sui. proof on Walrus. built different.</p>
          <div className="flex gap-6 text-white/50">
            <a href="#" className="hover:text-didit-primary transition-colors"><Globe className="h-5 w-5" /></a>
            <a href="#" className="hover:text-didit-primary transition-colors"><MessageCircle className="h-5 w-5" /></a>
            <a href="#" className="hover:text-didit-primary transition-colors"><Share2 className="h-5 w-5" /></a>
          </div>
        </div>
      </footer>
      <CreateTaskModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  )
}
