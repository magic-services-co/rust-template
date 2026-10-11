"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UploadCloud, Search, Trash2, Settings2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import Image from "next/image"
import { UploadFile } from "@/components/upload-file"
import { ImageGallery } from "@/components/admin/cdn/image-gallery"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/laravel-auth"

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

function newUploadId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export default function CDNPage() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [description, setDescription] = useState("")
  const [isR2Configured, setIsR2Configured] = useState<boolean | null>(null)
  const [storageType, setStorageType] = useState<string>("local")

  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settings, setSettings] = useState<{
    storageType: string
    r2AccountId: string
    r2AccessKeyId: string
    r2SecretAccessKey: string
    r2BucketName: string
    r2PublicUrl: string
    r2Endpoint: string
    r2Region: string
  }>({
    storageType: "local",
    r2AccountId: "",
    r2AccessKeyId: "",
    r2SecretAccessKey: "",
    r2BucketName: "",
    r2PublicUrl: "",
    r2Endpoint: "",
    r2Region: "auto",
  })

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { Accept: "application/json" }
    const token = getAuthToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
    return headers
  }, [])

  const checkConfig = useCallback(async () => {
    try {
      const response = await fetch(backendApi("admin/cdn/config"), { credentials: "include", headers: getHeaders() })
      if (response.ok) {
        const data = await response.json()
        setIsR2Configured(data.isConfigured ?? true)
        setStorageType(data.storageType ?? "local")
      } else {
        setIsR2Configured(false)
      }
    } catch (error) {
      console.error("Failed to check CDN config:", error)
      setIsR2Configured(false)
    }
  }, [getHeaders])

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const response = await fetch(backendApi("admin/cdn/settings"), { credentials: "include", headers: getHeaders() })
      if (response.ok) {
        const data = await response.json()
        setSettings({
          storageType: data.storageType ?? "local",
          r2AccountId: data.r2AccountId ?? "",
          r2AccessKeyId: data.r2AccessKeyId ?? "",
          r2SecretAccessKey: data.r2SecretAccessKey ?? "",
          r2BucketName: data.r2BucketName ?? "",
          r2PublicUrl: data.r2PublicUrl ?? "",
          r2Endpoint: data.r2Endpoint ?? "",
          r2Region: data.r2Region ?? "auto",
        })
      }
    } catch (error) {
      console.error("Failed to load CDN settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setSettingsLoading(false)
    }
  }, [getHeaders])

  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch(backendApi("admin/cdn/images"), { credentials: "include", headers: getHeaders() })
      if (response.ok) {
        const data = await response.json()
        setImages(data.images || [])
      }
    } catch (error) {
      console.error("Failed to fetch images:", error)
      toast.error("Failed to load images")
    } finally {
      setLoading(false)
    }
  }, [getHeaders])

  useEffect(() => {
    checkConfig()
    fetchImages()
    fetchSettings()
  }, [checkConfig, fetchImages, fetchSettings])

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
  }

  const uploadHeaders = useCallback(() => {
    return { ...getHeaders(), ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}) }
  }, [getHeaders])

  const uploadDirect = useCallback(async (files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append("files[]", file)
    })
    formData.append("description", description)
    const response = await fetch(backendApi("admin/cdn/upload"), {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: uploadHeaders(),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || "Upload failed")
    }
    const result = await response.json()
    return result.uploadedImages?.length ?? files.length
  }, [description, uploadHeaders])

  const uploadInParts = useCallback(async (file: File) => {
    const chunkBytes = 1_500_000
    const totalParts = Math.ceil(file.size / chunkBytes)
    const uploadId = newUploadId()
    for (let partIndex = 0; partIndex < totalParts; partIndex++) {
      const start = partIndex * chunkBytes
      const formData = new FormData()
      formData.append("uploadId", uploadId)
      formData.append("partIndex", String(partIndex))
      formData.append("totalParts", String(totalParts))
      formData.append("originalName", file.name)
      formData.append("description", description)
      formData.append("chunk", file.slice(start, Math.min(file.size, start + chunkBytes)), file.name)
      const response = await fetch(backendApi("admin/cdn/upload/parts"), {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: uploadHeaders(),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Upload failed")
      }
      const result = await response.json()
      if (result.complete) {
        return result.uploadedImages?.length ?? 1
      }
    }
    throw new Error("Upload did not finish")
  }, [description, uploadHeaders])

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload")
      return
    }

    setUploading(true)
    const chunkBytes = 1_500_000
    const directFiles = selectedFiles.filter((file) => file.size <= chunkBytes)
    const partFiles = selectedFiles.filter((file) => file.size > chunkBytes)

    try {
      let uploaded = 0
      if (directFiles.length > 0) {
        uploaded += await uploadDirect(directFiles)
        setSelectedFiles(partFiles)
      }
      for (const file of partFiles) {
        uploaded += await uploadInParts(file)
        setSelectedFiles((current) => current.filter((item) => item !== file))
      }
      toast.success(`Successfully uploaded ${uploaded} file(s)`)
      setSelectedFiles([])
      setDescription("")
      fetchImages()
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Upload failed")
      fetchImages()
    } finally {
      setUploading(false)
    }
  }



  const deleteImage = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return

    try {
      const response = await fetch(backendApi(`admin/cdn/images/${imageId}`), {
        method: "DELETE",
        credentials: "include",
        headers: getHeaders(),
      })

      if (response.ok) {
        toast.success("Image deleted successfully")
        fetchImages()
      } else {
        const error = await response.json().catch(() => ({}))
        toast.error(error.error || "Failed to delete image")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete image")
    }
  }

  const renameImage = async (imageId: string, newName: string) => {
    try {
      const response = await fetch(backendApi(`admin/cdn/images/${imageId}`), {
        method: "PATCH",
        credentials: "include",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: newName }),
      })

      if (response.ok) {
        toast.success("Image renamed successfully")
        fetchImages()
      } else {
        const error = await response.json().catch(() => ({}))
        toast.error(error.error || "Failed to rename image")
      }
    } catch (error) {
      console.error("Rename error:", error)
      toast.error("Failed to rename image")
    }
  }

  const saveSettings = async () => {
    if (settings.storageType === "r2") {
      if (!settings.r2AccessKeyId?.trim() || !settings.r2BucketName?.trim() || !settings.r2PublicUrl?.trim()) {
        toast.error("Access Key ID, Bucket Name, and Public URL are required for R2")
        return
      }
      const secret = (settings.r2SecretAccessKey ?? "").trim()
      if (!secret) {
        toast.error("Secret Access Key is required for R2 (leave as ******** if already saved)")
        return
      }
    }
    setSettingsSaving(true)
    try {
      const response = await fetch(backendApi("admin/cdn/settings"), {
        method: "PATCH",
        credentials: "include",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          storageType: settings.storageType,
          r2AccountId: settings.r2AccountId || null,
          r2AccessKeyId: settings.r2AccessKeyId || null,
          r2SecretAccessKey: settings.r2SecretAccessKey === "********" ? undefined : settings.r2SecretAccessKey || null,
          r2BucketName: settings.r2BucketName || null,
          r2PublicUrl: settings.r2PublicUrl || null,
          r2Endpoint: settings.r2Endpoint || null,
          r2Region: settings.r2Region || "auto",
        }),
      })
      if (response.ok) {
        toast.success("Settings saved")
        checkConfig()
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || "Failed to save settings")
      }
    } catch (error) {
      console.error("Save settings error:", error)
      toast.error("Failed to save settings")
    } finally {
      setSettingsSaving(false)
    }
  }

  const filteredImages = images.filter((image) => {
    const matchesSearch = image.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })



  return (
    <div className="space-y-6 relative">
      {isR2Configured === false && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center rounded-lg">
          <div className="bg-background border border-border rounded-lg p-8 max-w-md mx-4 text-center">
            <h2 className="text-2xl font-bold mb-4">CDN Not Configured</h2>
            <p className="text-muted-foreground">
              CDN storage is not available. Configure local storage on the Laravel backend or set up Cloudflare R2.
            </p>
          </div>
        </div>
      )}

      {isR2Configured === true && storageType === "local" && (
        <Alert className="mb-4">
          <AlertDescription>
            Using <strong>local storage</strong> (VPS). Images are stored in <code className="text-xs">storage/app/public/cdn/</code> and served by Laravel.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CDN Management</h1>
          <p className="text-muted-foreground">
            Upload and manage images using Laravel local storage (VPS) or Cloudflare R2
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Images</TabsTrigger>
          <TabsTrigger value="manage">Manage Images</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload files</CardTitle>
              <CardDescription>
                Upload any file to your CDN. Files are stored and can be used throughout your website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="files">Select files</Label>
                <UploadFile
                  maxSize={null}
                  accept=""
                  multiple={true}
                  onFilesSelected={handleFilesSelected}
                  isUploading={uploading}
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Selected {selectedFiles.length} file(s):
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          {file.type.startsWith("image/") ? (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              width={100}
                              height={100}
                              className="w-full h-20 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-full h-20 rounded border flex items-center justify-center px-2 text-center text-xs break-all">
                              {file.name}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description for these images..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={selectedFiles.length === 0 || uploading || isR2Configured === false}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Images</CardTitle>
              <CardDescription>
                View, copy URLs, and manage your uploaded images.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search images..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading images...</p>
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-8">
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">No images found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm 
                      ? "Try adjusting your search"
                      : "Get started by uploading some images"
                    }
                  </p>
                </div>
              ) : (
                    <ImageGallery
      images={filteredImages}
      onDelete={deleteImage}
      onRename={renameImage}
    />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CDN Storage Settings</CardTitle>
              <CardDescription>
                Choose local storage (VPS) or Cloudflare R2 / S3-compatible storage. New uploads will use the selected backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading settings...
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Main storage</Label>
                    <Select
                      value={settings.storageType}
                      onValueChange={(value) =>
                        setSettings((s) => ({ ...s, storageType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select storage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="r2">R2</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Local: VPS disk. R2: Cloudflare R2 / S3-compatible.
                    </p>
                  </div>

                  {settings.storageType === "r2" && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        For Cloudflare R2: use Account ID, create an R2 API token in the dashboard, and set the public bucket URL (e.g. https://pub-xxx.r2.dev or your custom domain).
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="r2AccountId">Account ID (R2)</Label>
                          <Input
                            id="r2AccountId"
                            placeholder="Cloudflare account ID"
                            value={settings.r2AccountId}
                            onChange={(e) => setSettings((s) => ({ ...s, r2AccountId: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="r2Region">Region</Label>
                          <Input
                            id="r2Region"
                            placeholder="auto"
                            value={settings.r2Region}
                            onChange={(e) => setSettings((s) => ({ ...s, r2Region: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">Use &quot;auto&quot; for Cloudflare R2</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="r2AccessKeyId">Access Key ID</Label>
                        <Input
                          id="r2AccessKeyId"
                          placeholder="R2 / S3 access key"
                          value={settings.r2AccessKeyId}
                          onChange={(e) => setSettings((s) => ({ ...s, r2AccessKeyId: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="r2SecretAccessKey">Secret Access Key</Label>
                        <Input
                          id="r2SecretAccessKey"
                          type="password"
                          placeholder="Leave as ******** to keep existing"
                          value={settings.r2SecretAccessKey}
                          onChange={(e) => setSettings((s) => ({ ...s, r2SecretAccessKey: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="r2BucketName">Bucket Name</Label>
                        <Input
                          id="r2BucketName"
                          placeholder="my-cdn-bucket"
                          value={settings.r2BucketName}
                          onChange={(e) => setSettings((s) => ({ ...s, r2BucketName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="r2PublicUrl">Public URL</Label>
                        <Input
                          id="r2PublicUrl"
                          placeholder="https://pub-xxx.r2.dev or https://cdn.example.com"
                          value={settings.r2PublicUrl}
                          onChange={(e) => setSettings((s) => ({ ...s, r2PublicUrl: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Base URL for image links (no trailing slash)</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="r2Endpoint">Endpoint (optional)</Label>
                        <Input
                          id="r2Endpoint"
                          placeholder="https://accountid.r2.cloudflarestorage.com"
                          value={settings.r2Endpoint}
                          onChange={(e) => setSettings((s) => ({ ...s, r2Endpoint: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Leave empty for Cloudflare R2 (uses Account ID)</p>
                      </div>
                    </div>
                  )}

                  <Button onClick={saveSettings} disabled={settingsSaving}>
                    {settingsSaving ? "Saving..." : "Save settings"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 