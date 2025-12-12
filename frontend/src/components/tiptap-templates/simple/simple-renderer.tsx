"use client"

import { EditorContent, useEditor } from "@tiptap/react"
import DOMPurify from "dompurify"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { HorizontalRule } from "@tiptap/extension-horizontal-rule"
import { Link } from "@tiptap/extension-link"
import { Underline } from "@tiptap/extension-underline"
import React from "react"

// Sanitize HTML content to prevent XSS attacks
const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'u', 's', 'code', 'pre',
      'ul', 'ol', 'li', 'blockquote',
      'a', 'img', 'br', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur']
  })
}

// Use the same extensions as SimpleEditor for consistency
const getExtensions = () => [
  StarterKit.configure({
    horizontalRule: false,
    link: {
      openOnClick: true,
      enableClickSelection: false,
    },
  }),
  HorizontalRule,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  Image.configure({
    HTMLAttributes: {
      class: "max-w-full h-auto rounded-lg",
    },
  }),
  Typography,
  Superscript,
  Subscript,
  Underline,
  Link.configure({
    openOnClick: true,
    linkOnPaste: true,
    autolink: true,
    protocols: ['mailto', 'https', 'http', 'ftp', 'tel'],
    HTMLAttributes: {
      class: "text-blue-600 hover:text-blue-800 underline",
    },
  }),
]

interface SimpleRendererProps {
  content: string
  className?: string
}

export function SimpleRenderer({ content, className }: SimpleRendererProps) {
  // Sanitize the HTML content before rendering
  const sanitizedContent = sanitizeHTML(content)
  
  const editor = useEditor({
    immediatelyRender: false,
    editable: false, // This makes it read-only
    editorProps: {
      attributes: {
        class: "simple-editor",
      },
    },
    extensions: getExtensions(),
    content: sanitizedContent,
  })

  if (!editor) {
    return null
  }

  return (
    <div className={`simple-renderer-wrapper ${className || ""}`}>
      <EditorContent editor={editor} />
    </div>
  )
}

SimpleRenderer.displayName = "SimpleRenderer"
