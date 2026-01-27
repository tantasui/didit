"use client"

import { useEffect, useState } from "react"
import { useSuiClient } from "@mysten/dapp-kit"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PACKAGE_ID, MODULE_NAME } from "@/app/config"
import { ExternalLink, Loader2, Trophy } from "lucide-react"
import { SubmissionDetailsModal } from "@/components/submission-details-modal"

const AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space"

interface Submission {
  submitter: string
  blobId: string
  metadataBlobId?: string
  timestamp: number
  submissionNo?: number
  txDigest?: string
}

interface SubmissionListProps {
  bountyId: string
  bountyTitle?: string
  bountyCreator?: string
  isBountyActive?: boolean
  prizeSchedule?: number[]
  isCreator?: boolean
  onAward?: (submitter: string) => void
  isAwarding?: boolean
}

export function SubmissionList({
  bountyId,
  bountyTitle,
  bountyCreator,
  isBountyActive,
  prizeSchedule,
  isCreator,
  onAward,
  isAwarding,
}: SubmissionListProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selected, setSelected] = useState<Submission | null>(null)
  const client = useSuiClient()

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        console.log("Fetching events for:", `${PACKAGE_ID}::${MODULE_NAME}::BountyProofSubmitted`)
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::BountyProofSubmitted`
          },
          limit: 50
        })

        const filtered = events.data
          .map((event) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parsed = event.parsedJson as any
            return {
              bountyId: parsed.bounty_id,
              submitter: parsed.submitter,
              blobId: parsed.proof_url, 
              metadataBlobId: parsed.metadata_url,
              submissionNo: parsed.submission_no ? Number(parsed.submission_no) : undefined,
              timestamp: Number(parsed.submitted_at),
              txDigest: (event as any).id?.txDigest || (event as any).txDigest
            }
          })
          .filter(s => s.bountyId === bountyId)

        setSubmissions(filtered)
      } catch (e) {
        console.error("Error fetching submissions:", e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubmissions()
  }, [client, bountyId])

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-orange" /></div>
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        <p>No submissions yet. Be the first!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SubmissionDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        submission={
          selected
            ? {
                bountyId,
                bountyTitle,
                bountyCreator,
                isBountyActive,
                prizeSchedule,
                isCreator,
                onSelectWinner: onAward,
                submitter: selected.submitter,
                submissionNo: selected.submissionNo,
                proofBlobId: selected.blobId,
                metadataBlobId: selected.metadataBlobId,
                submittedAt: selected.timestamp,
                txDigest: selected.txDigest,
              }
            : null
        }
      />
      {submissions.map((sub, idx) => (
        <Card
          key={idx}
          className="bg-white/5 border-white/10 overflow-hidden cursor-pointer"
          onClick={() => {
            setSelected(sub)
            setIsModalOpen(true)
          }}
        >
          <div className="aspect-video bg-black/50 relative group">
            {/* We assume it's an image for the hackathon. 
                In a real app, we'd check content-type or metadata */}
            <img 
              src={`${AGGREGATOR_URL}/v1/blobs/${sub.blobId}`}
              alt="Submission Proof"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if not an image
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <a 
                href={`${AGGREGATOR_URL}/v1/blobs/${sub.blobId}`} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="secondary" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </Button>
              </a>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-gradient-to-r from-purple-500 to-pink-500">
                    {sub.submitter.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium">
                  {sub.submitter.slice(0, 6)}...{sub.submitter.slice(-4)}
                </span>
              </div>
              <div className="text-white/50 text-xs">
                {new Date(sub.timestamp).toLocaleDateString()}
              </div>
            </div>
            
            {isCreator && onAward && (
              <Button 
                className="w-full bg-brand-orange hover:bg-brand-orange/90 text-black font-bold"
                onClick={(e) => {
                  e.stopPropagation()
                  onAward(sub.submitter)
                }}
                disabled={isAwarding}
              >
                {isAwarding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Awarding...
                  </>
                ) : (
                  <>
                    <Trophy className="mr-2 h-4 w-4" />
                    Select as Winner
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
