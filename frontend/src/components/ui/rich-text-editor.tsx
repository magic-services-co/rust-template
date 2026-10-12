"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Button } from "@/components/ui/button"
import { Bold, Italic, Strikethrough, Link as LinkIcon, Quote, List, Heading2, Heading3, Heading4 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
            levels: [2, 3, 4],
        }
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
        attributes: {
            class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
        },
    }
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className={cn("w-full space-y-2 rounded-md border border-input", className)}>
      {editor && (
        <BubbleMenu editor={editor}>
          <div className="flex gap-1 rounded-md border border-border/15 bg-background p-1 shadow-sm">
            <Button
              variant={editor.isActive('heading', { level: 2 }) ? "default" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('heading', { level: 3 }) ? "default" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('heading', { level: 4 }) ? "default" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            >
              <Heading4 className="h-4 w-4" />
            </Button>
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
      <EditorContent editor={editor} />
      <style jsx global>{`
        .ProseMirror {
            min-height: 300px;
        }
        .tiptap a:hover {
            text-decoration: underline;
        }
      `}</style>
    </div>
  )
} 