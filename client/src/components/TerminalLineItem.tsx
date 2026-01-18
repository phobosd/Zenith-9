import React from 'react';
import { Socket } from 'socket.io-client';
import { InventoryDisplay } from './InventoryDisplay';
import { ScoreDisplay } from './ScoreDisplay';
import { SheetDisplay } from './SheetDisplay';
import { MapDisplay } from './MapDisplay';
import { ParseMessage } from './InteractiveText';

export interface TerminalLine {
    id: string;
    text: string;
    type: 'output' | 'input' | 'system' | 'inventory' | 'score' | 'sheet' | 'terminal' | 'map' | 'info' | 'error' | 'success' | 'action' | 'combat' | 'room_desc' | 'global' | 'emote' | 'chat' | 'whisper';
    data?: any;
}

export const TerminalLineItem = React.memo(({ line, socket }: { line: TerminalLine, socket: Socket | null }) => {
    return (
        <div className={`terminal-line ${line.type}`}>
            {line.type === 'inventory' && line.data ? (
                <InventoryDisplay data={line.data} socket={socket} />
            ) : line.type === 'score' && line.data ? (
                <ScoreDisplay data={line.data} />
            ) : line.type === 'sheet' && line.data ? (
                <SheetDisplay data={line.data} />
            ) : line.type === 'map' && line.data ? (
                <MapDisplay data={line.data} />
            ) : (
                <ParseMessage text={line.text} socket={socket} />
            )}
        </div>
    );
}, (prev, next) => prev.line.id === next.line.id);
