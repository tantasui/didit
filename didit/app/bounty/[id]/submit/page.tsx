"use client"

import { useState, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, ArrowLeft, Loader2, Rocket } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { PACKAGE_ID, MODULE_NAME } from "@/app/config"

const PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space"

export default function SubmitBountyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const router = useRouter()

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const uploadToWalrus = async (file: File): Promise<string> => {
    setUploadStatus("Uploading to Walrus...")
    
    try {
      // Walrus HTTP API: PUT /v1/blobs
      const response = await fetch(`${PUBLISHER_URL}/v1/blobs?epochs=5`, {
        method: "PUT",
        body: file,
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
      // 1. Upload to Walrus
      const blobId = await uploadToWalrus(file)
      setUploadStatus("Confirming on Sui...")

      // 2. Submit proof to Smart Contract
      const tx = new Transaction()
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::submit_bounty_proof`,
        arguments: [
          tx.object(id), // bounty object ID
          tx.pure.string(crypto.randomUUID()), // offchain_bounty_proof_id
          tx.pure.string(blobId), // proof_url (storing blob ID)
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-xl border-white/20 text-white">
        <CardHeader>
          <div className="flex items-center mb-4">
            <Link href={`/bounty/${id}`}>
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 -ml-4">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Bounty
              </Button>
            </Link>
          </div>
          <CardTitle className="text-3xl font-black">Submit Your Entry</CardTitle>
          <CardDescription className="text-white/70 text-lg">
            Upload your proof and claim your glory!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* File Upload Area */}
          <div className="space-y-4">
            <Label className="text-lg font-bold">Proof (Image/Video)</Label>
            <div className="border-2 border-dashed border-white/30 rounded-2xl p-8 text-center hover:border-brand-orange transition-colors bg-black/20">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <Label htmlFor="file-upload" className="cursor-pointer block">
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mb-4 text-brand-green">
                      <Upload className="h-8 w-8" />
                    </div>
                    <p className="text-xl font-bold text-brand-green">{file.name}</p>
                    <p className="text-sm text-white/50 mt-2">Click to change file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                     <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                      <Upload className="h-8 w-8 text-white/70" />
                    </div>
                    <p className="text-lg font-bold">Click to upload or drag and drop</p>
                    <p className="text-sm text-white/50 mt-2">Images or Videos up to 10MB</p>
                  </div>
                )}
              </Label>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <Label htmlFor="desc" className="text-lg font-bold">Description (Optional)</Label>
            <Textarea
              id="desc"
              placeholder="Tell us about your masterpiece..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              className="bg-white/5 border-white/20 text-white min-h-[120px] text-lg focus:border-brand-orange rounded-xl"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="w-full bg-brand-orange hover:opacity-90 text-black font-black text-xl py-6 rounded-xl shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                {uploadStatus}
              </>
            ) : (
              <>
                <Rocket className="h-6 w-6 mr-3" />
                SUBMIT ENTRY
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
