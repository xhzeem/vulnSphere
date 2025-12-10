'use client';

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import { MDXEditorMethods } from '@mdxeditor/editor';

// Define Props that match the client component
interface MDXEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onUpload?: (file: File) => Promise<string>;
}

const Editor = dynamic(() => import('./mdx-editor-client').then(mod => mod.MDXEditorComponent), {
    ssr: false,
    loading: () => <div className="border rounded-md p-4 bg-muted animate-pulse h-[150px]" />
});

export const MDXEditorComponent = forwardRef<MDXEditorMethods, MDXEditorProps>((props, ref) => {
    return <Editor {...props} ref={ref} />;
});

MDXEditorComponent.displayName = 'MDXEditorComponent';
