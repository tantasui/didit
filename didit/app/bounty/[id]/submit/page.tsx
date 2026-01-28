"use client"

import { useState, use, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, ArrowLeft, Loader2, Rocket, CloudUpload, Network, File as FileIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { PACKAGE_ID, MODULE_NAME } from "@/app/config"

const PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space"

export default function SubmitBountyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [bountyTitle, setBountyTitle] = useState("")
  const router = useRouter()
  const client = useSuiClient()

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  useEffect(() => {
    const fetchBountyTitle = async () => {
      try {
        const obj = await client.getObject({
          id: id,
          options: { showContent: true }
        })

          if (obj.data?.content?.dataType === "moveObject") {
            const fields = obj.data.content.fields as any
            setBountyTitle(fields.title)
          }
      } catch (error) {
        console.error("Error fetching bounty title:", error)
        setBountyTitle(`Bounty #${id.slice(0, 6)}`)
      }
    }

    if (id) {
      fetchBountyTitle()
    }
  }, [id, client])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const uploadToWalrus = async (payload: Blob): Promise<string> => {
    setUploadStatus("Uploading to Walrus...")
    
    try {
      // Walrus HTTP API: PUT /v1/blobs
      const response = await fetch(`${PUBLISHER_URL}/v1/blobs?epochs=5`, {
        method: "PUT",
        body: payload,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Walrus upload response:", data)
      
      // The new blob ID is in newlyCreated.blobObject.blobId or alreadyCertified.blobId
      const blobId = data.newlyCreated?.blobObject?.blobId || data.alreadyCertified?.blobId
      
      if (!blobId) {
        throw new Error("No blob ID returned from Walrus")
      }

      return blobId
    } catch (error) {
      console.error("Walrus upload error:", error)
      throw error
    }
  }

  const handleSubmit = async () => {
    if (!file) return

    setIsUploading(true)
    try {
      // 1. Upload media to Walrus
      const proofBlobId = await uploadToWalrus(file)
      setUploadStatus("Uploading metadata...")

      // 2. Upload metadata JSON to Walrus
      const metadata = {
        version: 1,
        bountyId: id,
        proofBlobId,
        description: description || "",
        file: {
          name: file.name,
          type: file.type,
          sizeBytes: file.size,
        },
        createdAt: Date.now(),
      }
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" })
      const metadataBlobId = await uploadToWalrus(metadataBlob)

      setUploadStatus("Confirming on Sui...")

      // 3. Submit proof to Smart Contract
      const tx = new Transaction()
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::submit_bounty_proof`,
        arguments: [
          tx.object(id), // bounty object ID
          tx.pure.string(crypto.randomUUID()), // offchain_bounty_proof_id
          tx.pure.string(proofBlobId), // proof_url (Walrus media blob ID)
          tx.pure.string(metadataBlobId), // metadata_url (Walrus JSON blob ID)
        ],
      })

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Proof submitted:", result)
            setUploadStatus("Success!")
            // Redirect back to bounty page after short delay
            setTimeout(() => {
              router.push(`/bounty/${id}`)
            }, 1500)
          },
          onError: (error) => {
            console.error("Submission failed:", error)
            setUploadStatus("Transaction failed")
            setIsUploading(false)
          }
        }
      )
    } catch (error) {
      console.error("Process failed:", error)
      setUploadStatus("Upload failed")
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-didit-background-light dark:bg-didit-background-dark font-display text-white min-h-screen cyber-grid selection:bg-didit-primary/30 selection:text-didit-primary">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 cyber-grid pointer-events-none"></div>
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-didit-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="relative flex justify-center py-10 px-4 md:px-0">
        <div className="layout-content-container flex flex-col max-w-[800px] w-full">
            
            {/* Page Heading */}
            <div className="flex flex-col gap-3 mb-8">
              <Link href={`/bounty/${id}`} className="flex items-center gap-2 text-didit-primary/80 mb-2 hover:text-didit-primary transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium uppercase tracking-widest">Back to Bounty Details</span>
              </Link>
              <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
                submit for: <span className="text-didit-primary">{bountyTitle || <Loader2 className="inline h-8 w-8 animate-spin" />}</span>
              </h1>
              <p className="text-white/70 text-base font-normal leading-normal">
                upload your proof and claim your SUI
              </p>
            </div>

            {/* Submission Glass Card */}
            <div className="glass-card rounded-xl p-8 flex flex-col gap-8 bg-black/40 backdrop-blur-xl border border-didit-primary/20">
              
              {/* Upload Zone */}
              <div className="flex flex-col">
                <label className="text-white text-base font-medium leading-tight mb-4">
                  your proof
                </label>
                <div className="flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-didit-primary/30 bg-didit-primary/5 px-6 py-14 hover:border-didit-primary/60 transition-all group cursor-pointer relative">
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  <div className="flex max-w-[480px] flex-col items-center gap-2">
                    <div className="text-didit-primary/40 group-hover:text-didit-primary transition-colors mb-2">
                      {file ? <FileIcon className="h-16 w-16" /> : <Upload className="h-16 w-16" />}
                    </div>
                    <p className="text-white text-lg font-bold leading-tight tracking-[-0.015em] text-center">
                      {file ? file.name : "Drag and drop your assets or click to browse"}
                    </p>
                    <p className="text-white/50 text-sm font-normal leading-normal text-center">
                      {file ? "Click to change file" : "Supports PNG, JPG, MP4, and GIF (Max 10MB)"}
                    </p>
                  </div>
                  <button className="flex min-w-[120px] cursor-pointer items-center justify-center rounded-full h-11 px-6 bg-white/10 text-white text-sm font-bold border border-white/10 hover:bg-white/20 transition-all pointer-events-none">
                    <span className="truncate">{file ? "Change File" : "Select Files"}</span>
                  </button>
                </div>
              </div>

              {/* Description Field */}
              <div className="flex flex-col gap-2">
                <label className="flex flex-col flex-1">
                  <p className="text-white text-base font-medium leading-tight pb-4">
                    story (optional)
                  </p>
                  <Textarea
                    placeholder="how'd you do it? any behind-the-scenes?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isUploading}
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-didit-primary border border-white/10 bg-black/40 focus:border-didit-primary min-h-[160px] placeholder:text-white/30 p-5 text-base font-normal leading-relaxed transition-all"
                  />
                </label>
              </div>

              {/* Network Indicator */}
              <div className="flex items-center gap-4 bg-black/40 rounded-xl px-5 py-4 border border-white/5 justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-didit-primary flex items-center justify-center rounded-lg bg-didit-primary/10 shrink-0 size-10">
                    <Network className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold leading-none">Target Network</p>
                    <p className="text-white/50 text-xs mt-1">Sui Testnet</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-didit-primary uppercase tracking-tighter">Connected</span>
                  <div className="flex size-4 items-center justify-center">
                    <div className="size-2 rounded-full bg-[#0bda16] animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Submit Button Section */}
              <div className="flex flex-col gap-4 mt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!file || isUploading}
                  className="w-full flex cursor-pointer items-center justify-center rounded-full h-14 px-8 bg-didit-primary hover:bg-didit-primary/90 text-black text-lg font-black uppercase italic tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(242,127,13,0.4)] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                      {uploadStatus}
                    </>
                  ) : (
                    <span className="truncate flex items-center gap-3">
                      submit entry
                      <Rocket className="h-5 w-5" />
                    </span>
                  )}
                </Button>
                <p className="text-center text-white/40 text-xs">
                  your submission is stored on Walrus and recorded on Sui
                </p>
              </div>

            </div>

            {/* Footer Info */}
            <div className="mt-12 mb-20 flex justify-between items-center text-white/30 px-2">
              <div className="flex gap-6">
                <a className="hover:text-didit-primary transition-colors text-xs font-medium uppercase tracking-widest" href="#">Rules</a>
                <a className="hover:text-didit-primary transition-colors text-xs font-medium uppercase tracking-widest" href="#">Help Center</a>
              </div>
              <p className="text-xs">v1.0.4-beta // didit protocol</p>
            </div>

        </div>
      </main>
    </div>
  )
}
