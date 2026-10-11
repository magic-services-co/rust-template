"use client";

import * as React from "react";
import { useState } from "react";
import { UploadCloud, Loader2, File, Paperclip, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import Image from 'next/image';

interface UploadFileProps {
    /** Megabytes. Pass null for no size limit. */
    maxSize?: number | null;
    /** File input accept filter. Pass an empty string to allow every file type. */
    accept?: string;
    multiple?: boolean;
    onFilesSelected?: (files: File[]) => void;
    isUploading?: boolean;
    isScanning?: boolean;
    progress?: number;
    className?: string;
    btnClassName?: string;
    disabled?: boolean;
}

export function UploadFile({
    maxSize = 5,
    accept = "image/*",
    multiple = false,
    onFilesSelected,
    isUploading = false,
    isScanning = false,
    progress = 0,
    className,
    btnClassName,
    disabled = false,
}: UploadFileProps) {
    const [error, setError] = useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setError(null);

        if (maxSize != null) {
            const invalidFiles = files.filter(
                (file) => file.size > maxSize * 1024 * 1024
            );

            if (invalidFiles.length > 0) {
                setError(`File size exceeds ${maxSize}MB limit`);
                return;
            }
        }

        if (onFilesSelected) {
            onFilesSelected(files);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className={cn("w-full", className)}>
            <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept={accept || undefined}
                multiple={multiple}
                onChange={handleFileChange}
                disabled={isUploading || isScanning || disabled}
            />

            <Button
                type="button"
                variant="ghost"
                onClick={handleClick}
                disabled={isUploading || isScanning || disabled}
                className={cn(
                    "relative w-full gap-2",
                    (isUploading || isScanning) && "pointer-events-none opacity-60",
                    btnClassName
                )}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                        <div className="absolute bottom-0 left-0 h-1 w-full overflow-hidden rounded-b-md">
                            <Progress value={progress} className="rounded-none" />
                        </div>
                    </>
                ) : isScanning ? (
                    <>
                        <Shield className="h-4 w-4 animate-pulse text-muted-foreground" />
                        <span>Scanning file...</span>
                    </>
                ) : (
                    <>
                        <Paperclip className="h-4 w-4" />
                    </>
                )}
            </Button>

            {error && (
                <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
        </div>
    );
}

interface FilePreviewProps {
    file: File;
    onRemove?: () => void;
    className?: string;
}

export function FilePreview({
    file,
    onRemove,
    className,
}: FilePreviewProps) {
    const [previewUrl, setPreviewUrl] = useState<string>();

    React.useEffect(() => {
        if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "flex w-full items-center gap-2 overflow-hidden text-left",
                        className
                    )}
                >
                    {previewUrl ? (
                        <Image
                            src={previewUrl}
                            alt={file.name}
                            className="h-10 w-10 rounded object-cover"
                            width={40}
                            height={40}
                        />
                    ) : (
                        <File className="h-10 w-10" />
                    )}
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                </Button>
            </DialogTrigger>
            {previewUrl && (
                <DialogContent className="max-w-3xl">
                    <Image
                        src={previewUrl}
                        alt={file.name}
                        className="w-full rounded-lg object-contain"
                        width={800}
                        height={600}
                    />
                </DialogContent>
            )}
        </Dialog>
    );
}

