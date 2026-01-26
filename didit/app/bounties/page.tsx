"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search, Trophy, Users, Clock } from "lucide-react"
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
        // 1. Fetch BountyRegistry to get list of bounty IDs
        const registryObj = await client.getObject({
          id: REGISTRY_ID,
          options: { showContent: true }
        })

        if (!registryObj.data || !registryObj.data.content || registryObj.data.content.dataType !== "moveObject") {
          console.error("Invalid registry object")
          return
        }

        // @ts-expect-error - we know the shape of the object
        const bountyIds = registryObj.data.content.fields.bounties as string[]

        if (!bountyIds || bountyIds.length === 0) {
          setBounties([])
          setIsLoading(false)
          return
        }

        // 2. Fetch all Bounty objects
        const bountyObjects = await client.multiGetObjects({
          ids: bountyIds,
          options: { showContent: true }
        })

        const fetchedBounties: Bounty[] = bountyObjects.map((obj) => {
          if (!obj.data || !obj.data.content || obj.data.content.dataType !== "moveObject") {
            return null
          }
          
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

          // Calculate time display
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
            status: fields.active ? "open" : "completed", // Simplified status mapping
            creator: fields.creator.slice(0, 6) + "..." + fields.creator.slice(-4),
            timeLeft: timeDisplay,
            image: "/placeholder.svg", // Default image as it's not on-chain yet (or in separate object)
          }
        }).filter((b): b is Bounty => b !== null)

        setBounties(fetchedBounties)

      } catch (error) {
        console.error("Error fetching bounties:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBounties()
  }, [client, showCreateModal]) // Refetch when modal closes (potentially new bounty)

  const statuses = ["all", "open", "judging", "completed"]

  const filteredBounties = bounties.filter((bounty) => {
    const matchesSearch =
      bounty.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bounty.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || bounty.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const BountyCard = ({ bounty }: { bounty: Bounty }) => (
    <Card className="group bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-orange/50 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
      <div className="relative">
        <img
          src={bounty.image || "/placeholder.svg"}
          alt={bounty.title}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4">
          <Badge
            className={`${
              bounty.status === "open"
                ? "bg-brand-green"
                : bounty.status === "judging"
                  ? "bg-brand-orange"
                  : "bg-white/20"
            } text-black font-bold`}
          >
            {bounty.status === "open" ? "🔥 LIVE" : bounty.status === "judging" ? "⏳ JUDGING" : "✅ DONE"}
          </Badge>
        </div>
        {/* Difficulty Badge removed */}
        <div className="absolute bottom-4 right-4 bg-brand-orange text-black font-black px-4 py-2 rounded-full">
          <Trophy className="h-4 w-4 inline mr-1" />
          {bounty.reward} SUI
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-white text-xl font-bold group-hover:text-brand-orange transition-colors">
          {bounty.title}
        </CardTitle>
        <p className="text-white/80 text-sm leading-relaxed line-clamp-2">{bounty.description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center text-white/70">
              <Users className="h-4 w-4 mr-1" />
              {bounty.participants}
            </div>
            <div className="flex items-center text-white/70">
              <Clock className="h-4 w-4 mr-1" />
              {bounty.timeLeft}
            </div>
          </div>
          {/* Category Badge removed */}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white font-bold">{bounty.creator[0]}</AvatarFallback>
            </Avatar>
            <span className="text-white/80 text-sm font-medium">{bounty.creator}</span>
          </div>
          <Link href={`/bounty/${bounty.id}`}>
            <Button className="bg-brand-green hover:opacity-90 text-black font-bold px-6 py-2 rounded-full shadow-lg transition-all duration-300">
              Join Now!
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-dark)" }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">Epic Bounties</h1>
          <p className="text-lg md:text-2xl text-white/80 font-light px-2">
            Discover wild tasks, compete with friends, and earn crypto rewards!
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 h-5 w-5" />
            <Input
              placeholder="Search for epic bounties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-2xl h-14 text-base md:text-lg backdrop-blur-lg"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Categories filter removed */}
          </div>

          {/* Status Filter */}
          <div className="flex gap-3 flex-wrap">
            <span className="text-white/70 font-semibold self-center">Status:</span>
            {statuses.map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                onClick={() => setSelectedStatus(status)}
                className={`rounded-full px-6 py-3 font-bold transition-all duration-300 ${
                  selectedStatus === status
                    ? "bg-brand-orange text-black shadow-lg"
                    : "border-white/30 text-white hover:bg-white/10"
                }`}
              >
                {status === "all"
                  ? "🌟 All"
                  : status === "open"
                    ? "🔥 Live"
                    : status === "judging"
                      ? "⏳ Judging"
                      : "✅ Completed"}
              </Button>
            ))}
          </div>
        </div>

        {/* Bounties Grid */}
        {isLoading ? (
           <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-orange"></div>
           </div>
        ) : filteredBounties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {filteredBounties.map((bounty) => (
              <BountyCard key={bounty.id} bounty={bounty} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-white/50 text-xl">
             No bounties found. Be the first to create one!
          </div>
        )}

        {/* Create Challenge CTA */}
        <div className="text-center bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6 md:p-12 mb-8">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-4">Got a Crazy Idea? 🤪</h2>
          <p className="text-base md:text-xl text-white/80 mb-6 md:mb-8 max-w-2xl mx-auto">
            Turn your wildest thoughts into epic bounties! Create something silly and watch the community go wild.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-brand-orange hover:opacity-90 text-black font-black text-lg md:text-2xl px-8 py-4 md:px-16 md:py-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 w-full sm:w-auto btn-mobile-responsive"
          >
            🚀 CREATE EPIC BOUNTY
          </Button>
        </div>
      </div>

      <CreateTaskModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  )
}
