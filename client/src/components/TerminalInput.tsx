import React, { useRef, useEffect } from 'react';
import { RoundtimeIndicator, MomentumBar } from './StatusHUD';

interface TerminalInputProps {
    inputValue: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    playerStats: any;
}

export const TerminalInput: React.FC<TerminalInputProps> = ({
    inputValue,
    onChange,
    onKeyDown,
    playerStats
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    return (
        <div className="terminal-input-area">
            <div className="status-indicators-row">
                {playerStats && <RoundtimeIndicator stats={playerStats} />}
                {playerStats && <MomentumBar stats={playerStats} />}
            </div>
            <div className="terminal-input-row">
                <span className="prompt">
                    {'>'}
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    className="terminal-input"
                    value={inputValue}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    autoFocus
                />
            </div>
        </div>
    );
};
