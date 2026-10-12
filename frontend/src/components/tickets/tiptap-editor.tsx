"use client"

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import BulletList from '@tiptap/extension-bullet-list'
import { Button } from "@/components/ui/button"
import { Send, Bold, Italic, Strikethrough, Link as LinkIcon, Quote, List, Loader2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isUploadsEnabled } from '@/lib/upload'
import { UploadFile } from '../upload-file'

interface TipTapEditorProps {
    onSend: (content: string) => void
    disabled: boolean
    handleFilesSelected?: (files: File[]) => void
    isScanning?: boolean
    initialContent?: string
    tone?: "default" | "support"
}

export function TipTapEditor({ onSend, handleFilesSelected, disabled, isScanning, initialContent, tone = "default" }: TipTapEditorProps) {
    const [content, setContent] = useState(initialContent || '')

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: false,
            }),
            Link.configure({
                openOnClick: false,
            }),
            BulletList.configure({
                HTMLAttributes: {
                    class: 'list-disc list-inside',
                },
            }),
        ],
        content: initialContent || '',
        immediatelyRender: true,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML())
        },
    })

    const handleSend = () => {
        if (content.trim()) {
            onSend(content)
            setContent('')
            editor?.commands.setContent('')
        }
    }

    return (
        <div className="w-full space-y-2">
            {editor && (
                <BubbleMenu editor={editor}>
                    <div className="flex gap-2 rounded-md border border-border/15 bg-background shadow-sm">
                        <Button
                            variant={editor.isActive("bold") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive("italic") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive("strike") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                        >
                            <Strikethrough className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive("link") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => {
                                const url = window.prompt('URL')
                                if (url) {
                                    editor.chain().focus().setLink({ href: url }).run()
                                }
                            }}
                        >
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive("blockquote") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        >
                            <Quote className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={editor.isActive("bulletList") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </BubbleMenu>
            )}
            <div className="relative">
                <EditorContent
                    editor={editor}
                    className={cn(
                        "min-h-[350px] md:min-h-[100px] w-full border px-3 py-2 text-sm",
                        tone === "support"
                            ? "support-form-input rounded-none"
                            : "rounded-md border-input bg-transparent ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                />
                <style jsx global>{`
                    .ProseMirror {
                        min-height: 100px;
                        height: 100%;
                        outline: none;
                    }
                    .ProseMirror p.is-editor-empty:first-child::before {
                        color: #adb5bd;
                        content: attr(data-placeholder);
                        float: left;
                        height: 0;
                        pointer-events: none;
                    }

                    .tiptap a:hover {
                        text-decoration: underline;
                    }
                `}</style>
            </div>
            <div className={cn("flex gap-3", tone === "support" && "gap-2")}>
                {isUploadsEnabled && (
                    <UploadFile
                        className={tone === "support" ? "w-auto shrink-0" : "w-fit h-11 flex-grow"}
                        btnClassName={cn(
                            "h-11",
                            tone === "support" && "ghost support-form-btn-secondary h-[41px] w-[41px] rounded-none px-0"
                        )}
                        onFilesSelected={handleFilesSelected}
                    />
                )}
                <Button
                    className={cn(
                        "w-full",
                        tone === "support" && "ghost support-form-btn-primary h-[41px] rounded-none text-[10px] font-bold tracking-[1.4px]"
                    )}
                    size={"lg"}
                    onClick={handleSend}
                    disabled={disabled}
                >
                    {disabled ? (
                        isScanning ? (
                            <>
                                <Shield className="mr-2 h-4 w-4 animate-pulse text-muted-foreground" />
                                Scanning Attached Documents
                            </>
                        ) : (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {tone === "support" ? "SENDING" : "Send Message"}
                            </>
                        )
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            {tone === "support" ? "SEND REPLY" : "Send Message"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
