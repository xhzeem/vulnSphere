'use client';

import React, { useRef, forwardRef, useImperativeHandle, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
    Upload, Code, Eye, EyeOff, Copy, Check, Type, Heading1, Heading2, Heading3, Bold, Italic, Link, List, ListOrdered, Quote, GripVertical 
} from 'lucide-react';
import api from '@/lib/api';

interface MDXEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onUpload?: (file: File) => Promise<string>;
    onImageUploaded?: () => void; // Callback for when an image is uploaded
    projectId?: string;
    companyId?: string;
    vulnerabilityId?: string;
    context?: 'vulnerability' | 'template' | 'other'; // Context for different behaviors
    height?: number; // Custom height in pixels
}

export interface MDXEditorMethods {
    insertMarkdown: (markdown: string) => void;
    focus: () => void;
    setMarkdown: (markdown: string) => void;
}

export const MDXEditorComponent = forwardRef<MDXEditorMethods, MDXEditorProps>(({ 
    value, 
    onChange, 
    placeholder = 'Start typing markdown...', 
    className, 
    onUpload,
    onImageUploaded,
    projectId,
    companyId,
    vulnerabilityId,
    context = 'other',
    height = 200
}, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { theme } = useTheme();
    const [showPreview, setShowPreview] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [editorWidth, setEditorWidth] = useState(50); // Percentage
    const [isResizing, setIsResizing] = useState(false);

    // Forward ref methods
    useImperativeHandle(ref, () => ({
        insertMarkdown: (markdown: string) => {
            const textarea = textareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const newText = text.substring(0, start) + markdown + text.substring(end);
                onChange(newText);
                
                // Set cursor position after insertion
                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + markdown.length, start + markdown.length);
                }, 0);
            }
        },
        focus: () => {
            textareaRef.current?.focus();
        },
        setMarkdown: (markdown: string) => {
            onChange(markdown);
        }
    }), [onChange]);

    const insertText = useCallback((text: string, selection?: { start: number, end: number }) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        // Store current scroll position
        const scrollPosition = textarea.scrollTop;
        
        // Get current selection or use provided one
        const start = selection?.start ?? textarea.selectionStart;
        const end = selection?.end ?? textarea.selectionEnd;
        
        // Use document.execCommand to preserve undo history
        textarea.focus();
        textarea.setSelectionRange(start, end);
        
        // Use execCommand for text insertion (preserves undo/redo)
        const success = document.execCommand('insertText', false, text);
        
        if (!success) {
            // Fallback to manual insertion
            const textValue = textarea.value;
            const newText = textValue.substring(0, start) + text + textValue.substring(end);
            onChange(newText);
            
            requestAnimationFrame(() => {
                if (textarea) {
                    textarea.focus();
                    textarea.setSelectionRange(start + text.length, start + text.length);
                    textarea.scrollTop = scrollPosition;
                }
            });
        } else {
            // Update onChange to sync with new value
            setTimeout(() => {
                onChange(textarea.value);
                textarea.scrollTop = scrollPosition;
            }, 0);
        }
    }, [onChange]);

    const handleImageUpload = useCallback(async (file: File) => {
        console.log('handleImageUpload called with file:', file);
        console.log('context:', context, 'companyId:', companyId, 'projectId:', projectId, 'vulnerabilityId:', vulnerabilityId);
        
        // Check if images are allowed in this context
        if (context !== 'vulnerability') {
            alert('Images can only be uploaded in vulnerability details and retest sections.');
            return;
        }
        
        try {
            // Check if we have the required context for nested endpoint
            if (!companyId || !projectId) {
                // For templates or contexts without project/company, use fallback
                console.log('No project/company context, using fallback image handling');
                const url = URL.createObjectURL(file);
                const altText = prompt('Enter alt text for the image:', file.name);
                const markdown = `![${altText || file.name}](${url})`;
                insertText(markdown);
                return;
            }

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('file_name', file.name);
            formData.append('description', `Image uploaded from markdown editor: ${file.name}`);

            let uploadUrl: string;
            
            // If vulnerabilityId is provided, upload to vulnerability-specific endpoint
            if (vulnerabilityId) {
                uploadUrl = `/companies/${companyId}/projects/${projectId}/attachments/`;
                formData.append('vulnerability', vulnerabilityId);
                console.log('Uploading to vulnerability-specific endpoint:', uploadUrl);
            } else {
                uploadUrl = `/companies/${companyId}/projects/${projectId}/attachments/`;
                console.log('Uploading to project-level endpoint:', uploadUrl);
            }

            console.log('FormData:', formData);

            // Upload to API - using the correct nested endpoint
            const response = await api.post(uploadUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Upload response:', response);

            // Get the file URL from the response
            const attachment = response.data;
            let fileUrl = attachment.file; // This should be the URL to the uploaded file
            
            // Check if the URL is absolute, if not, construct it
            if (!fileUrl.startsWith('http')) {
                const baseUrl = api.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8000';
                fileUrl = `${baseUrl}${fileUrl}`;
            }
            
            console.log('Final file URL:', fileUrl);
            
            // Get alt text from user
            const altText = prompt('Enter alt text for the image:', file.name);
            const markdown = `![${altText || file.name}](${fileUrl})`;
            
            // Insert the markdown
            insertText(markdown);
            
            // Call the onImageUploaded callback if provided
            console.log('Calling onImageUploaded callback:', !!onImageUploaded);
            if (onImageUploaded) {
                onImageUploaded();
            }
            
        } catch (error) {
            console.error('Image upload failed:', error);
            alert('Failed to upload image. Please try again.');
        }
    }, [companyId, projectId, vulnerabilityId, insertText, context]);

    // Resize handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        
        const container = textareaRef.current?.parentElement?.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newWidth = Math.max(20, Math.min(80, (x / rect.width) * 100));
        setEditorWidth(newWidth);
    }, [isResizing]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing, handleMouseMove, handleMouseUp]);

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        await handleImageUpload(file);
                    }
                    break;
                }
            }
        }
    }, [handleImageUpload]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            await handleImageUpload(file);
        }
        // Reset input
        if (e.target) e.target.value = '';
    }, [handleImageUpload]);

    const insertCodeBlock = useCallback(() => {
        const markdown = '```javascript\n// Your code here\n```';
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newText = text.substring(0, start) + markdown + text.substring(end);
            onChange(newText);
            
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 15, start + 31); // Select "Your code here"
            }, 0);
        }
    }, [onChange]);

    const insertHeading = useCallback((level: number) => {
        const heading = '#'.repeat(level) + ' ';
        insertText(heading);
    }, [insertText]);

    const insertBold = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
            const boldText = `**${selectedText || 'bold text'}**`;
            insertText(boldText, { start, end });
        }
    }, [insertText]);

    const insertItalic = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
            const italicText = `*${selectedText || 'italic text'}*`;
            insertText(italicText, { start, end });
        }
    }, [insertText]);

    const insertLink = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
            const linkText = `[${selectedText || 'link text'}](url)`;
            insertText(linkText, { start, end });
        }
    }, [insertText]);

    const insertList = useCallback((ordered: boolean = false) => {
        const listPrefix = ordered ? '1. ' : '- ';
        insertText(listPrefix);
    }, [insertText]);

    const insertQuote = useCallback(() => {
        insertText('> ');
    }, [insertText]);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    }, []);

    return (
        <div className={cn("markdown-editor-wrapper border rounded-md overflow-hidden bg-card", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b bg-muted flex-wrap">
                {/* Heading Options */}
                <div className="flex items-center gap-1 border-r pr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Heading 1"
                        onClick={() => insertHeading(1)}
                    >
                        <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Heading 2"
                        onClick={() => insertHeading(2)}
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Heading 3"
                        onClick={() => insertHeading(3)}
                    >
                        <Heading3 className="w-4 h-4" />
                    </button>
                </div>

                {/* Text Formatting */}
                <div className="flex items-center gap-1 border-r pr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Bold"
                        onClick={insertBold}
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Italic"
                        onClick={insertItalic}
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                </div>

                {/* Lists and Quote */}
                <div className="flex items-center gap-1 border-r pr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Bullet List"
                        onClick={() => insertList(false)}
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Numbered List"
                        onClick={() => insertList(true)}
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Quote"
                        onClick={insertQuote}
                    >
                        <Quote className="w-4 h-4" />
                    </button>
                </div>

                {/* Link and Code */}
                <div className="flex items-center gap-1 border-r pr-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Insert Link"
                        onClick={insertLink}
                    >
                        <Link className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title="Insert Code Block"
                        onClick={insertCodeBlock}
                    >
                        <Code className="w-4 h-4" />
                    </button>
                </div>

                {/* Image */}
                {context === 'vulnerability' && (
                    <div className="flex items-center gap-1 border-r pr-2">
                        <button
                            type="button"
                            className="p-2 hover:bg-accent rounded-md"
                            title="Upload Image"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Preview Toggle */}
                <div className="ml-auto">
                    <button
                        type="button"
                        className="p-2 hover:bg-accent rounded-md"
                        title={showPreview ? "Hide Preview" : "Show Preview"}
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />

            {/* Editor and Preview */}
            <div className={cn("flex relative", showPreview ? "" : "")} style={showPreview ? { height: `${height}px` } : {}}>
                {/* Markdown Editor */}
                <div className={cn(showPreview ? "border-r" : "w-full")} style={{ width: showPreview ? `${editorWidth}%` : '100%' }}>
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onPaste={handlePaste}
                        placeholder={placeholder}
                        className={cn(
                            "w-full p-4 outline-none resize-none bg-background font-mono text-sm",
                            showPreview ? "" : "min-h-[200px]"
                        )}
                        style={{ height: showPreview ? `${height}px` : '200px' }}
                    />
                </div>

                {/* Resize Handle */}
                {showPreview && (
                    <div
                        className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex items-center justify-center group"
                        onMouseDown={handleMouseDown}
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}

                {/* Preview Panel */}
                {showPreview && (
                    <div className="flex-1 overflow-auto bg-background p-4" style={{ width: `${100 - editorWidth}%`, height: `${height}px` }}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1({ children, ...props }) {
                                    return (
                                        <h1 className="text-3xl font-bold mt-6 mb-4 text-foreground border-b pb-2" {...props}>
                                            {children}
                                        </h1>
                                    );
                                },
                                h2({ children, ...props }) {
                                    return (
                                        <h2 className="text-2xl font-semibold mt-5 mb-3 text-foreground" {...props}>
                                            {children}
                                        </h2>
                                    );
                                },
                                h3({ children, ...props }) {
                                    return (
                                        <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground" {...props}>
                                            {children}
                                        </h3>
                                    );
                                },
                                h4({ children, ...props }) {
                                    return (
                                        <h4 className="text-lg font-medium mt-3 mb-2 text-foreground" {...props}>
                                            {children}
                                        </h4>
                                    );
                                },
                                h5({ children, ...props }) {
                                    return (
                                        <h5 className="text-base font-medium mt-2 mb-1 text-foreground" {...props}>
                                            {children}
                                        </h5>
                                    );
                                },
                                h6({ children, ...props }) {
                                    return (
                                        <h6 className="text-sm font-medium mt-2 mb-1 text-muted-foreground" {...props}>
                                            {children}
                                        </h6>
                                    );
                                },
                                p({ children, ...props }) {
                                    return (
                                        <p className="mb-4 leading-7 text-foreground" {...props}>
                                            {children}
                                        </p>
                                    );
                                },
                                ul({ children, ...props }) {
                                    return (
                                        <ul className="list-disc list-inside mb-4 space-y-1 text-foreground" {...props}>
                                            {children}
                                        </ul>
                                    );
                                },
                                ol({ children, ...props }) {
                                    return (
                                        <ol className="list-decimal list-inside mb-4 space-y-1 text-foreground" {...props}>
                                            {children}
                                        </ol>
                                    );
                                },
                                li({ children, ...props }) {
                                    return (
                                        <li className="ml-2" {...props}>
                                            {children}
                                        </li>
                                    );
                                },
                                blockquote({ children, ...props }) {
                                    return (
                                        <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/50 italic text-foreground" {...props}>
                                            {children}
                                        </blockquote>
                                    );
                                },
                                a({ children, href, ...props }) {
                                    return (
                                        <a 
                                            href={href} 
                                            className="text-primary hover:text-primary/80 underline" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            {...props}
                                        >
                                            {children}
                                        </a>
                                    );
                                },
                                code({ node, className, children, ...props }: any) {
                                    const isInline = !className || !className.includes('language-');
                                    const match = /language-(\w+)/.exec(className || '');
                                    const language = match ? match[1] : '';
                                    
                                    if (!isInline && language) {
                                        return (
                                            <div className="relative">
                                                <SyntaxHighlighter
                                                    style={theme === 'dark' ? oneDark : oneLight}
                                                    language={language}
                                                    PreTag="pre"
                                                    className="rounded-md"
                                                    {...props}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                                <button
                                                    className="absolute top-2 right-2 p-1 bg-gray-200 dark:bg-gray-700 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
                                                    onClick={() => copyToClipboard(String(children))}
                                                >
                                                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        );
                                    }
                                    
                                    return (
                                        <code className={cn("bg-muted px-1 py-0.5 rounded text-sm", className)} {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                                img({ src, alt, ...props }) {
                                    return (
                                        <img 
                                            src={src} 
                                            alt={alt} 
                                            className="max-w-full h-auto rounded-md my-4"
                                            {...props} 
                                        />
                                    );
                                }
                            }}
                        >
                            {value || '*No content to preview*'}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
});

MDXEditorComponent.displayName = 'MDXEditorComponent';
