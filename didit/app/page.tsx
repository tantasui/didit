"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Trophy, Users, Star, Rocket } from "lucide-react"
import Link from "next/link"
import { CreateTaskModal } from "@/components/create-task-modal"

export default function HomePage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [heroWord, setHeroWord] = useState("Silly")
  
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroWord(prev => prev === "Silly" ? "Devving" : "Silly")
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-dark)" }}>
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4 sm:px-6 text-center py-12 md:py-0">
        <div className="max-w-4xl space-y-6 md:space-y-8">
          {/* Main Heading */}
          <div className="space-y-2 md:space-y-4">
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black text-white leading-tight">
              Get <span className="animate-pulse text-brand-green inline-block min-w-[180px] sm:min-w-[300px]">{heroWord}</span>,
            </h1>
            <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-brand-orange leading-tight">Get Paid!</h2>
          </div>

          {/* Subtitle */}
          <p className="text-lg sm:text-2xl md:text-3xl text-white/90 font-light max-w-3xl mx-auto leading-relaxed px-2">
            Turn your wildest, silliest ideas into crypto bounties.
            <span className="text-brand-orange font-semibold"> Create bounties</span>,
            <span className="text-brand-green font-semibold"> compete with friends</span>, and
            <span className="text-white font-semibold"> earn real rewards!</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center pt-6 md:pt-8 w-full sm:w-auto">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto group relative bg-brand-orange hover:opacity-90 text-black font-black text-base md:text-xl px-6 py-3 md:px-12 md:py-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 transform btn-mobile-responsive"
            >
              <Rocket className="h-5 w-5 md:h-6 md:w-6 mr-3 group-hover:animate-bounce" />
              CREATE EPIC BOUNTY
            </Button>

            <Link href="/bounties" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-brand-green hover:opacity-90 text-black font-bold text-base md:text-xl px-6 py-3 md:px-12 md:py-6 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 btn-mobile-responsive">
                <Star className="h-5 w-5 md:h-6 md:w-6 mr-3" />
                Browse Bounties
              </Button>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 md:pt-16 max-w-5xl mx-auto w-full">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-orange/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-6 md:p-8 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-black" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">Create Silly Tasks</h3>
                <p className="text-white/80 text-sm md:text-base">Dream up the most ridiculous bounties and watch people compete!</p>
              </CardContent>
            </Card>


            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-green/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-6 md:p-8 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-black" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">Join the Fun</h3>
                <p className="text-white/80 text-sm md:text-base">Upload photos & videos of your attempts and compete for rewards!</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105">
              <CardContent className="p-6 md:p-8 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-6 w-6 md:h-8 md:w-8 text-brand-green" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">Earn Crypto</h3>
                <p className="text-white/80 text-sm md:text-base">Win real SUI tokens for being wonderfully ridiculous!</p>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-12 pt-12 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-black text-brand-orange">2.5K+</div>
              <div className="text-white/70 font-medium text-sm md:text-base">Silly Challenges</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-black text-brand-green">8.9K+</div>
              <div className="text-white/70 font-medium text-sm md:text-base">Happy Participants</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-black text-white">₿ 45K</div>
              <div className="text-white/70 font-medium text-sm md:text-base">Rewards Paid</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-16 h-16 md:w-20 md:h-20 bg-brand-orange hover:opacity-90 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 animate-pulse"
        >
          <span className="text-2xl md:text-3xl">🎯</span>
        </Button>
      </div>

      <CreateTaskModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  )
}
