"use client"

import { useState } from "react"
import Link from "next/link"
import { Rocket, Megaphone, Briefcase, CheckCircle, Zap, DollarSign } from "lucide-react"
import { CreateTaskModal } from "@/components/create-task-modal"

export default function HomePage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="relative overflow-x-hidden min-h-screen bg-didit-background-light dark:bg-didit-background-dark font-display text-slate-900 dark:text-white">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full hero-gradient pointer-events-none -z-10"></div>

      <main className="max-w-[1280px] mx-auto px-6 lg:px-40 pb-20">
        {/* HeroSection */}
        <section className="py-20 lg:py-32 flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-didit-primary/10 border border-didit-primary/20">
            <span className="size-2 rounded-full bg-didit-primary animate-pulse"></span>
            <span className="text-xs font-bold text-didit-primary uppercase tracking-widest">Live on Sui Network</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter">
            Did <span className="text-didit-primary">It?</span>
          </h1>
          <p className="max-w-2xl text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            onchain bounties for anything. <br className="hidden md:block" />
            prove you did it. get paid in SUI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link href="/bounties">
              <button className="bg-didit-primary text-didit-background-dark px-10 py-4 rounded-full text-lg font-bold hover:scale-105 transition-transform shadow-[0_0_30px_rgba(242,127,13,0.4)]">
                browse bounties
              </button>
            </Link>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-white/5 border border-white/10 hover:bg-white/10 px-10 py-4 rounded-full text-lg font-bold transition-all backdrop-blur-sm"
            >
              create bounty
            </button>
          </div>
        </section>

        {/* Section Header: Who Is This For? */}
        <section className="py-12">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">who uses this?</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-8"></div>
          </div>
          {/* Glassmorphism Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="glass-card p-8 rounded-xl group hover:border-didit-primary/50 transition-all duration-300">
              <div className="size-14 rounded-full bg-didit-primary/20 flex items-center justify-center mb-6 text-didit-primary group-hover:scale-110 transition-transform">
                <Rocket className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">meme projects</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">bounties for raids, memes, and community chaos.</p>
              <button onClick={() => setShowCreateModal(true)} className="w-full py-3 rounded-full bg-white/5 border border-white/10 hover:bg-didit-primary hover:text-didit-background-dark font-bold transition-all">explore</button>
            </div>
            {/* Card 2 */}
            <div className="glass-card p-8 rounded-xl group hover:border-didit-primary/50 transition-all duration-300">
              <div className="size-14 rounded-full bg-didit-primary/20 flex items-center justify-center mb-6 text-didit-primary group-hover:scale-110 transition-transform">
                <Megaphone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">creators & influencers</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">get your community to do stuff. pay them in SUI.</p>
              <button onClick={() => setShowCreateModal(true)} className="w-full py-3 rounded-full bg-white/5 border border-white/10 hover:bg-didit-primary hover:text-didit-background-dark font-bold transition-all">explore</button>
            </div>
            {/* Card 3 */}
            <div className="glass-card p-8 rounded-xl group hover:border-didit-primary/50 transition-all duration-300">
              <div className="size-14 rounded-full bg-didit-primary/20 flex items-center justify-center mb-6 text-didit-primary group-hover:scale-110 transition-transform">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">freelancers</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">find gigs, submit proof, get paid instantly.</p>
              <button onClick={() => setShowCreateModal(true)} className="w-full py-3 rounded-full bg-white/5 border border-white/10 hover:bg-didit-primary hover:text-didit-background-dark font-bold transition-all">explore</button>
            </div>
          </div>
        </section>

        {/* Section Header: How It Works */}
        <section className="py-20">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-3xl font-bold tracking-tight">how it works</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-8"></div>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-px bg-white/10 -z-10"></div>
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="size-20 rounded-full glass-card border-didit-primary/40 flex items-center justify-center text-2xl font-black mb-8 shadow-[0_0_20px_rgba(242,127,13,0.2)]">
                01
              </div>
              <h4 className="text-xl font-bold mb-3">create</h4>
              <p className="text-slate-400">post a bounty with your requirements. lock SUI rewards in the contract.</p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="size-20 rounded-full glass-card border-didit-primary/40 flex items-center justify-center text-2xl font-black mb-8 shadow-[0_0_20px_rgba(242,127,13,0.2)]">
                02
              </div>
              <h4 className="text-xl font-bold mb-3">submit</h4>
              <p className="text-slate-400">people do the thing and upload proof. everything stored onchain.</p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="size-20 rounded-full glass-card border-didit-accent-green/40 flex items-center justify-center text-2xl font-black mb-8 shadow-[0_0_20px_rgba(57,255,20,0.2)] text-didit-accent-green">
                03
              </div>
              <h4 className="text-xl font-bold mb-3">get paid</h4>
              <p className="text-slate-400">creator approves. contract pays out instantly. no middlemen.</p>
            </div>
          </div>
        </section>

        {/* Featured Bounties (Extra Component) */}
        <section className="py-12 glass-card rounded-3xl p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 size-64 bg-didit-primary/20 blur-[100px] rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">ready to dive in?</h2>
              <p className="text-slate-400">active bounties waiting for you.</p>
            </div>
            <Link href="/bounties">
              <button className="bg-didit-primary text-didit-background-dark px-10 py-4 rounded-full text-lg font-bold hover:scale-105 transition-transform whitespace-nowrap">
                explore bounties
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 lg:px-40">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="size-6 text-didit-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight">didit</h2>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <Link href="#" className="hover:text-didit-primary transition-colors">Twitter (X)</Link>
            <Link href="#" className="hover:text-didit-primary transition-colors">Discord</Link>
            <Link href="#" className="hover:text-didit-primary transition-colors">Documentation</Link>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Powered by</span>
            <span className="font-bold text-sm">SUI Network</span>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-slate-600">
          © 2024 didit. All rights reserved. Built for the future of Web3 engagement.
        </div>
      </footer>
      <CreateTaskModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  )
}
