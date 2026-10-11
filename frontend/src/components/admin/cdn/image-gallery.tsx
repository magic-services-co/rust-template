"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Copy, Download, Trash2, Eye, EyeOff, Edit, File } from "lucide-react"
import { toast } from "sonner"

interface UploadedImage {
  id: string
  fileName: string
  originalName: string
  url: string
  size: number
  mimeType: string
  uploadedBy: string
  createdAt: string
  description?: string
}

interface ImageGalleryProps {
  images: UploadedImage[]
  onDelete: (imageId: string) => void
  onRename: (imageId: string, newName: string) => void
}

export function ImageGallery({ images, onDelete, onRename }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [imageToRename, setImageToRename] = useState<UploadedImage | null>(null)
  const [newName, setNewName] = useState("")

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const copyToClipboard = async (url: string) => {
    const fullUrl = url.startsWith("/") ? `${window.location.origin}${url}` : url
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl)
        toast.success("URL copied to clipboard")
        return
      }
    } catch {
    }
    try {
      const textarea = document.createElement("textarea")
      textarea.value = fullUrl
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      textarea.setAttribute("readonly", "")
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      if (ok) {
        toast.success("URL copied to clipboard")
      } else {
        toast.error("Failed to copy URL")
      }
    } catch {
      toast.error("Failed to copy URL")
    }
  }

  const downloadImage = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      toast.success("Image downloaded")
    } catch (error) {
      toast.error("Failed to download image")
    }
  }

  const handleRenameClick = (image: UploadedImage) => {
    setImageToRename(image)
    setNewName(image.originalName)
    setRenameDialogOpen(true)
  }

  const handleRenameSubmit = () => {
    if (imageToRename && newName.trim()) {
      onRename(imageToRename.id, newName.trim())
      setRenameDialogOpen(false)
      setImageToRename(null)
      setNewName("")
    }
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
          <svg
            className="h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium">No images found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by uploading some images
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden group">
            <div className="relative aspect-video">
              {image.mimeType?.startsWith("image/") ? (
                <img
                  src={image.url}
                  alt={image.originalName}
                  className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted px-3 text-center">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <p className="text-xs break-all line-clamp-2">{image.originalName}</p>
                </div>
              )}

              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedImage(image)}
                      >
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <div className="space-y-4">
                        <div className="relative aspect-video">
                          {image.mimeType?.startsWith("image/") ? (
                            <img
                              src={image.url}
                              alt={image.originalName}
                              className="absolute inset-0 h-full w-full object-contain"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted px-3 text-center">
                              <File className="h-10 w-10 text-muted-foreground" />
                              <p className="text-sm break-all">{image.originalName}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold">{image.originalName}</h3>
                          {image.description && (
                            <p className="text-sm text-muted-foreground">
                              {image.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(image.size)}</span>
                            <span>•</span>
                            <span>{image.mimeType}</span>
                            <span>•</span>
                            <span>{formatDate(image.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div>
                  <p className="font-medium truncate text-sm">{image.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(image.size)} • {formatDate(image.createdAt)}
                  </p>
                  {image.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {image.description}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(image.url)}
                    className="flex-1 h-8"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadImage(image.url, image.originalName)}
                    className="h-8"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRenameClick(image)}
                    className="h-8"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(image.id)}
                    className="h-8"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Rename Image</h3>
              <p className="text-sm text-muted-foreground">
                Enter a new name for the image
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="newName" className="text-sm font-medium">
                Image Name
              </label>
              <Input
                id="newName"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRenameDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenameSubmit}
                disabled={!newName.trim()}
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 