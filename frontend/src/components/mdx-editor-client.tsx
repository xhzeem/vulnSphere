'use client';

import {
    MDXEditor,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    imagePlugin,
    codeBlockPlugin,
    linkPlugin,
    linkDialogPlugin,
    tablePlugin,
    toolbarPlugin,
    diffSourcePlugin,
    codeMirrorPlugin,
    UndoRedo,
    BoldItalicUnderlineToggles,
    BlockTypeSelect,
    CodeToggle,
    CreateLink,
    InsertCodeBlock,
    InsertTable,
    InsertThematicBreak,
    ListsToggle,
    DiffSourceToggleWrapper,
    MDXEditorMethods
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { useRef, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Image as ImageIcon } from 'lucide-react';

interface MDXEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onUpload?: (file: File) => Promise<string>;
}

export const MDXEditorComponent = forwardRef<MDXEditorMethods, MDXEditorProps>(({ value, onChange, placeholder, className, onUpload }, ref) => {
    const editorRef = useRef<MDXEditorMethods>(null);
    const { theme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Forward ref manually if needed, or use the one from MDXEditor
    useImperativeHandle(ref, () => editorRef.current!, []);

    const handleImageUpload = async (image: File): Promise<string> => {
        if (onUpload) {
            return await onUpload(image);
        }
        return Promise.resolve(URL.createObjectURL(image)); // Fallback
    };

    const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const url = await handleImageUpload(file);
                // Insert markdown image
                editorRef.current?.insertMarkdown(`![](${url})`);
            } catch (e) {
                console.error("Upload failed", e);
            }
        }
        // Reset input
        if (event.target) event.target.value = '';
    };

    return (
        <div className={cn("mdx-editor-wrapper border rounded-md overflow-hidden bg-card", className, theme === 'dark' ? 'dark-theme' : '')}>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
            />

            <MDXEditor
                ref={editorRef}
                markdown={value}
                onChange={onChange}
                placeholder={placeholder}
                className={cn("prose prose-sm dark:prose-invert max-w-none p-4 min-h-[150px]",
                    // Custom styles to override some MDXEditor defaults that might conflict or look off
                    "[&_.mdxeditor-toolbar]:bg-muted [&_.mdxeditor-toolbar]:border-b [&_.mdxeditor-toolbar]:p-1",
                    "[&_.mdxeditor-content-editable]:min-h-[150px] [&_.mdxeditor-content-editable]:outline-none"
                )}
                contentEditableClassName="outline-none"
                plugins={[
                    headingsPlugin(),
                    listsPlugin(),
                    quotePlugin(),
                    thematicBreakPlugin(),
                    markdownShortcutPlugin(),
                    imagePlugin({ imageUploadHandler: handleImageUpload }),
                    codeBlockPlugin({ defaultCodeBlockLanguage: 'sh' }),
                    codeMirrorPlugin({ codeBlockLanguages: { sh: 'Shell', js: 'JavaScript', python: 'Python', css: 'CSS', html: 'HTML', txt: 'Text', ts: 'TypeScript', json: 'JSON' } }),
                    linkPlugin(),
                    linkDialogPlugin(),
                    tablePlugin(),
                    diffSourcePlugin(),
                    toolbarPlugin({
                        toolbarContents: () => (
                            <>
                                <UndoRedo />
                                <BoldItalicUnderlineToggles />
                                <BlockTypeSelect />
                                <CodeToggle />
                                <CreateLink />
                                <InsertCodeBlock />
                                {/* Custom Image Button */}
                                <button
                                    type="button"
                                    className="p-1 hover:bg-accent rounded-md"
                                    title="Insert Image"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </button>
                                <ListsToggle />
                                <InsertTable />
                                <InsertThematicBreak />
                                <div className="ml-auto">
                                    <DiffSourceToggleWrapper><></></DiffSourceToggleWrapper>
                                </div>
                            </>
                        )
                    })
                ]}
            />
        </div>
    );
});

MDXEditorComponent.displayName = 'MDXEditorComponent';
