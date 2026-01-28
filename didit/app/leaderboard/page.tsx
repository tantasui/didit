"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSuiClient } from "@mysten/dapp-kit"
import { PACKAGE_ID, MODULE_NAME } from "@/app/config"
import { Check, Copy, ExternalLink } from "lucide-react"

type LeaderRow = {
  address: string
  earnedSui: number
  wins: number
  submissions: number
}

async function fetchEventsUpTo(
  client: any,
  moveEventType: string,
  max: number
) {
  let cursor: any = null
  const out: any[] = []

  while (out.length < max) {
    const page = await client.queryEvents({
      query: { MoveEventType: moveEventType },
      cursor,
      limit: Math.min(50, max - out.length),
    })

    out.push(...page.data)
    if (!page.hasNextPage) break
    cursor = page.nextCursor
  }

  return out
}

export default function LeaderboardPage() {
  const client = useSuiClient()
  const [rows, setRows] = useState<LeaderRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const awardedType = `${PACKAGE_ID}::${MODULE_NAME}::BountyAwarded`
        const submittedType = `${PACKAGE_ID}::${MODULE_NAME}::BountyProofSubmitted`

        const [awards, submissions] = await Promise.all([
          fetchEventsUpTo(client as any, awardedType, 500),
          fetchEventsUpTo(client as any, submittedType, 500),
        ])

        const earnedMistByAddress = new Map<string, number>()
        const winsByAddress = new Map<string, number>()
        const submissionsByAddress = new Map<string, number>()

        for (const e of awards) {
          const winner = (e as any).parsedJson?.winner as string | undefined
          const amount = Number((e as any).parsedJson?.amount ?? 0)
          if (!winner) continue
          earnedMistByAddress.set(winner, (earnedMistByAddress.get(winner) ?? 0) + amount)
          winsByAddress.set(winner, (winsByAddress.get(winner) ?? 0) + 1)
        }

        for (const e of submissions) {
          const submitter = (e as any).parsedJson?.submitter as string | undefined
          if (!submitter) continue
          submissionsByAddress.set(submitter, (submissionsByAddress.get(submitter) ?? 0) + 1)
        }

        const allAddresses = new Set<string>([
          ...earnedMistByAddress.keys(),
          ...winsByAddress.keys(),
          ...submissionsByAddress.keys(),
        ])

        const merged: LeaderRow[] = Array.from(allAddresses).map((address) => ({
          address,
          earnedSui: (earnedMistByAddress.get(address) ?? 0) / 1_000_000_000,
          wins: winsByAddress.get(address) ?? 0,
          submissions: submissionsByAddress.get(address) ?? 0,
        }))

        merged.sort((a, b) => {
          if (b.earnedSui !== a.earnedSui) return b.earnedSui - a.earnedSui
          if (b.wins !== a.wins) return b.wins - a.wins
          return b.submissions - a.submissions
        })

        setRows(merged.slice(0, 50))
      } catch (e) {
        console.error("Failed to load leaderboard:", e)
        setRows([])
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [client])

  const explorerBase = useMemo(() => "https://suiexplorer.com/address", [])

  const handleCopy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      setTimeout(() => setCopiedAddress(null), 1200)
    } catch {
      setCopiedAddress(null)
    }
  }

  return (
    <div className="min-h-screen bg-didit-background-light dark:bg-didit-background-dark font-display text-slate-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="glass p-10 rounded-3xl border border-white/10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
            <span className="text-didit-primary italic">Leaderboard</span>
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-2xl">
            Ranked by total earned SUI (from on-chain award events), then wins, then submissions.
          </p>

          <div className="mt-10">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-didit-primary"></div>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-white/60">
                No leaderboard data yet on this network. Create a bounty and award a winner to generate events.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-12 gap-0 bg-black/30 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white/60">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Address</div>
                  <div className="col-span-2 text-right">Earned</div>
                  <div className="col-span-2 text-right">Wins</div>
                  <div className="col-span-2 text-right">Submissions</div>
                </div>
                <div className="divide-y divide-white/10">
                  {rows.map((r, idx) => (
                    <div key={r.address} className="grid grid-cols-12 items-center px-5 py-4 bg-white/5">
                      <div className="col-span-1 text-white/70 font-bold">{idx + 1}</div>
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <span className="text-white font-mono text-sm truncate">
                          {r.address.slice(0, 6)}...{r.address.slice(-4)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(r.address)}
                          className="shrink-0 inline-flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors size-9"
                          title="Copy address"
                        >
                          {copiedAddress === r.address ? (
                            <Check className="h-4 w-4 text-didit-primary" />
                          ) : (
                            <Copy className="h-4 w-4 text-white/70" />
                          )}
                        </button>
                        <a
                          href={`${explorerBase}/${r.address}?network=testnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 inline-flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors size-9"
                          title="Open in explorer"
                        >
                          <ExternalLink className="h-4 w-4 text-white/70" />
                        </a>
                      </div>
                      <div className="col-span-2 text-right font-bold text-didit-primary">
                        {r.earnedSui.toFixed(2)} SUI
                      </div>
                      <div className="col-span-2 text-right font-bold text-white">{r.wins}</div>
                      <div className="col-span-2 text-right font-bold text-white/80">{r.submissions}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/bounties"
              className="inline-flex items-center justify-center rounded-full bg-didit-primary text-didit-background-dark px-8 py-3 font-bold hover:brightness-110 transition-all"
            >
              explore bounties
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 px-8 py-3 font-bold hover:bg-white/10 transition-all"
            >
              view profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
