import React, { useState, useEffect } from 'react';
import './TerminalDisplay.css';

interface ItemData {
    name: string;
    weight: number;
    size: string;
    legality: string;
    attributes: string;
    description: string;
    cost: number;
}

interface TerminalData {
    title: string;
    items: ItemData[];
}

interface Props {
    data: TerminalData;
    socket: any;
    onClose: () => void;
}

export const TerminalDisplay: React.FC<Props> = ({ data, socket, onClose }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(data.items.length - 1, prev + 1));
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const item = data.items[selectedIndex];
                socket.emit('terminal-buy', { itemName: item.name, cost: item.cost });
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data, selectedIndex, socket, onClose]);

    return (
        <div className="term-overlay">
            <div className="term-window">
                <div className="term-header">
                    <div className="term-title">{data.title}</div>
                    <div className="term-close" onClick={onClose}>[X]</div>
                </div>
                <div className="term-body">
                    <table className="term-table">
                        <thead>
                            <tr>
                                <th>ITEM NAME</th>
                                <th>WEIGHT</th>
                                <th>SIZE</th>
                                <th>LEGALITY</th>
                                <th>ATTRIBUTES / NOTES</th>
                                <th>COST</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item, idx) => (
                                <tr key={idx} className={idx === selectedIndex ? 'selected' : ''}>
                                    <td className="term-name">
                                        {idx === selectedIndex && <span className="term-cursor">&gt; </span>}
                                        {item.name}
                                    </td>
                                    <td>{item.weight} kg</td>
                                    <td>{item.size}</td>
                                    <td className={`term-legality ${item.legality.toLowerCase()}`}>{item.legality}</td>
                                    <td className="term-attr">{item.attributes}</td>
                                    <td className="term-cost">{item.cost} CR</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="term-footer">
                    [ARROW KEYS] Navigate  [ENTER] Buy  [ESC] Close
                </div>
            </div>
        </div>
    );
};
