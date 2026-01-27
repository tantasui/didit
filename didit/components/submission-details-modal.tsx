"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { PACKAGE_ID, MODULE_NAME } from "@/app/config"

const AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space"

export type SubmissionDetails = {
  bountyId: string
  bountyTitle?: string
  submitter: string
  submissionNo?: number
  proofBlobId: string
  metadataBlobId?: string
  submittedAt: number
  txDigest?: string
  isBountyActive?: boolean
  bountyCreator?: string
  prizeSchedule?: number[]
  isCreator?: boolean
  onSelectWinner?: (submitter: string) => void
}

type SubmissionMetadata = {
  version?: number
  bountyId?: string
  proofBlobId?: string
  description?: string
  file?: {
    name?: string
    type?: string
    sizeBytes?: number
  }
  createdAt?: number
}

async function fetchEventsUpTo(client: any, moveEventType: string, max: number) {
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

export function SubmissionDetailsModal({
  isOpen,
  onClose,
  submission,
}: {
  isOpen: boolean
  onClose: () => void
  submission: SubmissionDetails | null
}) {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  const [metadata, setMetadata] = useState<SubmissionMetadata | null>(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [votes, setVotes] = useState<number>(0)
  const [myVotedFor, setMyVotedFor] = useState<string | null>(null)
  const [isVoting, setIsVoting] = useState(false)

  const proofUrl = useMemo(() => {
    if (!submission) return ""
    return `${AGGREGATOR_URL}/v1/blobs/${submission.proofBlobId}`
  }, [submission])

  const isSelfSubmission = useMemo(() => {
    if (!account?.address || !submission) return false
    return account.address === submission.submitter
  }, [account?.address, submission])

  const isBountyCreator = useMemo(() => {
    if (!account?.address || !submission?.bountyCreator) return false
    return account.address === submission.bountyCreator
  }, [account?.address, submission?.bountyCreator])

  const canVote = useMemo(() => {
    if (!submission || !account?.address || submission.isBountyActive === false || isSelfSubmission || isBountyCreator) return false
    return true
  }, [account?.address, submission, isSelfSubmission, isBountyCreator])

  useEffect(() => {
    const loadData = async () => {
      if (!submission) return
      
      // Load Metadata
      if (submission.metadataBlobId) {
        setIsLoadingMetadata(true)
        try {
          const res = await fetch(`${AGGREGATOR_URL}/v1/blobs/${submission.metadataBlobId}`)
          const text = await res.text()
          setMetadata(JSON.parse(text))
        } catch { setMetadata(null) } finally { setIsLoadingMetadata(false) }
      }

      // Load Votes
      try {
        const voteType = `${PACKAGE_ID}::${MODULE_NAME}::SubmissionVoted`
        const events = await fetchEventsUpTo(client as any, voteType, 500)
        const totalsBySubmission = new Map<string, number>()
        const lastVoteByVoter = new Map<string, { submission: string; ts: number }>()

        for (const ev of events) {
          const parsed = (ev as any).parsedJson as any
          if (!parsed || parsed.bounty_id !== submission.bountyId) continue
          const subAddr = parsed.submission_address as string
          const voter = parsed.voter as string
          const total = Number(parsed.total_votes_for_submission ?? 0)
          const ts = Number(parsed.voted_at ?? 0)
          if (subAddr) totalsBySubmission.set(subAddr, total)
          if (voter) {
            const prev = lastVoteByVoter.get(voter)
            if (!prev || ts >= prev.ts) lastVoteByVoter.set(voter, { submission: subAddr, ts })
          }
        }
        setVotes(totalsBySubmission.get(submission.submitter) ?? 0)
        setMyVotedFor(account?.address ? (lastVoteByVoter.get(account.address)?.submission ?? null) : null)
      } catch { setVotes(0) }
    }

    if (isOpen && submission) loadData()
  }, [isOpen, submission, client, account?.address])

  const handleVote = async () => {
    if (!submission || !canVote) return
    setIsVoting(true)
    try {
      const tx = new Transaction()
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::vote_submission`,
        arguments: [tx.object(submission.bountyId), tx.pure.address(submission.submitter)],
      })
      signAndExecuteTransaction({ transaction: tx }, {
        onSuccess: () => { setIsVoting(false); onClose(); },
        onError: () => setIsVoting(false),
      })
    } catch { setIsVoting(false) }
  }

  const voteLabel = useMemo(() => {
    if (!account?.address) return "CONNECT WALLET"
    if (isBountyCreator) return "CREATOR"
    if (isSelfSubmission) return "YOUR SUBMISSION"
    if (submission?.isBountyActive === false) return "CLOSED"
    if (myVotedFor === submission?.submitter) return "VOTED"
    if (myVotedFor) return "SWITCH VOTE"
    return "VOTE NOW"
  }, [submission, account?.address, isBountyCreator, isSelfSubmission, myVotedFor])

  if (!submission) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="p-0 border-0 bg-transparent shadow-none w-full max-w-md">
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-xl"></div>

        <div className="relative z-50 w-full mx-auto px-4">
          <div className="glass-modal-frame w-full max-h-[92vh] rounded-[2.5rem] overflow-hidden flex flex-col bg-[#080808] border border-white/10 shadow-2xl">
            
            {/* 1. TOP IMAGE SECTION */}
            <div className="w-full bg-black relative border-b border-white/5 h-[35vh]">
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <img
                  alt="Submission"
                  className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
                  src={proofUrl}
                />
              </div>
              
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 z-[70] size-10 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* 2. INFO & VOTING SECTION */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              
              {/* Header Tags */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <span className="text-primary text-[10px] font-black uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                    {submission.bountyTitle || "Bounty"}
                  </span>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </div>
                </div>
                <h1 className="text-xl font-black italic uppercase text-white/90">
                  Submission #{submission.submissionNo || "1"}
                </h1>
              </div>

              {/* Description/Notes */}
              <div className="mb-6 overflow-y-auto max-h-[15vh] custom-scrollbar">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Description</h3>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap ">
                  {isLoadingMetadata ? "Loading..." : metadata?.description || "No description."}
                </p>
              </div>

              {/* 3. COMMUNITY VOTES COMPONENT */}
              <div className="mt-auto bg-white/[0.03] p-3.5 rounded-2xl border border-white/10">
                <div className="flex justify-between items-end mb-3">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Community Votes</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white leading-none tabular-nums">{votes}</span>
                      <span className="text-primary text-xs font-black italic tracking-tighter">votes</span>
                    </div>
                  </div>
                
                </div>

                <button
                  disabled={!canVote || isVoting}
                  onClick={handleVote}
                  className={`w-full py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                    canVote && !isVoting 
                      ? "bg-primary text-black hover:brightness-110 shadow-[0_10px_30px_-10px_rgba(255,165,0,0.5)]" 
                      : "bg-white/5 text-white/20 border border-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-base font-bold">how_to_vote</span>
                  {isVoting ? "VOTING..." : voteLabel}
                </button>
              </div>

              {/* Creator Exclusive Action */}
              {submission.isCreator && (
                <button 
                  onClick={() => { submission.onSelectWinner?.(submission.submitter); onClose(); }} 
                  className="mt-4 w-full border-2 border-emerald-500/30 text-emerald-400 py-3 rounded-2xl text-xs font-black tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                >
                  DECLARE WINNER
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
