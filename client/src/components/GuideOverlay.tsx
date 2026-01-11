import React, { useState, useEffect, useRef } from 'react';
import './GuideOverlay.css';

interface GuideOverlayProps {
    content: string;
    onClose: () => void;
}

interface Chapter {
    id: string;
    title: string;
    level: number;
}

export const GuideOverlay: React.FC<GuideOverlayProps> = ({ content, onClose }) => {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Parse chapters from headers
        // Handle both CRLF and LF line endings
        const lines = content.split(/\r?\n/);
        const extractedChapters: Chapter[] = [];

        lines.forEach((line, index) => {
            const match = line.trim().match(/^(#{1,3})\s+(.+)$/);
            if (match) {
                const level = match[1].length;
                const title = match[2].trim();
                const id = `chapter-${index}`;
                extractedChapters.push({ id, title, level });
            }
        });

        setChapters(extractedChapters);
    }, [content]);

    const scrollToChapter = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const renderContent = () => {
        const lines = content.split(/\r?\n/);
        let inTable = false;

        return lines.map((line, index) => {
            const trimmedLine = line.trim();

            // Headers
            const headerMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const Tag = `h${level}` as any;
                return <Tag key={index} id={`chapter-${index}`}>{headerMatch[2]}</Tag>;
            }

            // Tables
            if (trimmedLine.startsWith('|')) {
                const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());

                if (line.includes('---')) {
                    inTable = true;
                    return null; // Skip separator line
                }

                if (!inTable) {
                    inTable = true;
                    return (
                        <table key={index}>
                            <thead>
                                <tr>
                                    {cells.map((cell, i) => <th key={i}>{cell}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Rows will be added by subsequent lines */}
                            </tbody>
                        </table>
                    );
                }

                return (
                    <div key={index} className="table-row" style={{ display: 'flex', borderBottom: '1px solid #333' }}>
                        {cells.map((cell, i) => (
                            <div key={i} style={{ flex: 1, padding: '5px', borderRight: '1px solid #333' }}>
                                {cell.replace(/`/g, '')}
                            </div>
                        ))}
                    </div>
                );
            } else {
                inTable = false;
            }

            // Lists
            if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                return <li key={index} style={{ marginLeft: '20px' }}>{trimmedLine.replace(/^[\*\-]\s+/, '')}</li>;
            }

            // Empty lines
            if (trimmedLine === '') {
                return <br key={index} />;
            }

            // Code blocks (inline)
            const parts = line.split('`');
            if (parts.length > 1) {
                return (
                    <p key={index}>
                        {parts.map((part, i) =>
                            i % 2 === 1 ? <code key={i}>{part}</code> : <span key={i}>{part}</span>
                        )}
                    </p>
                );
            }

            return <p key={index}>{line}</p>;
        });
    };

    return (
        <div className="guide-overlay">
            <div className="guide-header">
                <div className="guide-title">USER'S GUIDE v1.0</div>
                <button className="guide-close-btn" onClick={onClose}>[CLOSE]</button>
            </div>
            <div className="guide-body">
                <div className="guide-toc">
                    {chapters.map(chapter => (
                        <div
                            key={chapter.id}
                            className="guide-toc-item"
                            style={{ paddingLeft: `${(chapter.level - 1) * 10 + 5}px` }}
                            onClick={() => scrollToChapter(chapter.id)}
                        >
                            {chapter.title}
                        </div>
                    ))}
                </div>
                <div className="guide-content" ref={contentRef}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
