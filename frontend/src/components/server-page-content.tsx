"use client";

import Image from "next/image";
import { copyText } from "@/lib/copy-text";
import { renderPageMarkdown } from "@/lib/page-markdown";

interface Block {
    type: string;
    data: any;
}

interface Content {
    blocks?: Block[];
    html?: string;
}

export function ServerPageContent({ content }: { content: any }) {
    let contentString: string;
    
    if (typeof content === 'string') {
        contentString = content;
    } else if (content && typeof content === 'object') {
        if (typeof content.markdown === 'string') {
            contentString = content.markdown;
        } else if (content.content && typeof content.content === 'string') {
            contentString = content.content;
        } else {
            contentString = JSON.stringify(content);
        }
    } else {
        contentString = String(content || '');
    }

    return (
        <div
            onClick={(event) => {
                const button = (event.target as HTMLElement).closest("button.cms-copy");
                if (!(button instanceof HTMLButtonElement)) return;
                const text = button.getAttribute("data-copy") || "";
                void copyText(text).then(() => {
                    button.setAttribute("data-copied", "true");
                    window.setTimeout(() => button.removeAttribute("data-copied"), 2000);
                }).catch(() => undefined);
            }}
            dangerouslySetInnerHTML={{ __html: renderPageMarkdown(contentString) }}
        />
    );
}

function BlockRenderer({ block }: { block: Block }) {
    switch (block.type) {
        case 'paragraph':
            return (
                <p className="cms-p">{block.data?.text || ''}</p>
            );

        case 'header':
            const level = block.data?.level || 1;
            const content = block.data?.text || '';
            
            switch (level) {
                case 1: return <h1 className={`font-bold ${getHeaderClass(1)}`}>{content}</h1>;
                case 2: return <h2 className={`font-bold ${getHeaderClass(2)}`}>{content}</h2>;
                case 3: return <h3 className={`font-bold ${getHeaderClass(3)}`}>{content}</h3>;
                case 4: return <h4 className={`font-bold ${getHeaderClass(4)}`}>{content}</h4>;
                case 5: return <h5 className={`font-bold ${getHeaderClass(5)}`}>{content}</h5>;
                case 6: return <h6 className={`font-bold ${getHeaderClass(6)}`}>{content}</h6>;
                default: return <h2 className={`font-bold ${getHeaderClass(2)}`}>{content}</h2>;
            }

        case 'list':
            return (
                <ul className="cms-ul">
                    {block.data?.items?.map((item: string, index: number) => (
                        <li key={index} className="cms-li">{item}</li>
                    ))}
                </ul>
            );

        case 'code':
            return (
                <pre className="cms-pre">
                    <code>{block.data?.code || ''}</code>
                </pre>
            );

        case 'table':
            if (!block.data?.content) return null;
            
            return (
                <div className="overflow-x-auto">
                    <table className="cms-table">
                        <tbody>
                            {block.data.content.map((row: string[], rowIndex: number) => (
                                <tr key={rowIndex}>
                                    {row.map((cell: string, cellIndex: number) => (
                                        <td 
                                            key={cellIndex} 
                                            className="cms-td"
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'image':
            const imageUrl = block.data?.file?.url || block.data?.url;
            return (
                <div className="w-full relative">
                    <Image
                        src={imageUrl}
                        alt={block.data?.caption || 'Image'}
                        width={1200}
                        height={800}
                        className="cms-img"
                        unoptimized
                    />
                </div>
            );

        case 'html':
            return <div dangerouslySetInnerHTML={{ __html: block.data?.html || '' }} />;

        default:
            return <div className="text-muted-foreground italic">Unknown block type: {block.type}</div>;
    }
}

function getHeaderClass(level: number): string {
    switch (level) {
        case 1: return 'cms-h1';
        case 2: return 'cms-h2';
        case 3: return 'cms-h3';
        case 4: return 'cms-h4';
        case 5: return 'cms-h4';
        case 6: return 'cms-h4';
        default: return 'cms-h2';
    }
}
