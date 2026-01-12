import React from 'react';
import './StatusHUD.css';

interface StatusProps {
    stats: {
        hp: number;
        maxHp: number;
        stance: string;
        roundtime?: number;
        maxRoundtime?: number;
        balance?: number;
        fatigue?: number;
        maxFatigue?: number;
        engagement?: string;
    } | null;
}

export const RoundtimeIndicator: React.FC<StatusProps> = ({ stats }) => {
    if (!stats || !stats.roundtime || stats.roundtime <= 0) return null;

    const maxRt = stats.maxRoundtime || stats.roundtime;
    const percent = Math.min(100, Math.max(0, (stats.roundtime / maxRt) * 100));

    return (
        <div className="rt-indicator">
            <div className="rt-bar-bg">
                <div
                    className="rt-bar-fill"
                    style={{ width: `${percent}%` }}
                />
                <div className="rt-text">WAIT {Math.ceil(stats.roundtime)}S</div>
            </div>
        </div>
    );
};

export const StatusBar: React.FC<StatusProps> = ({ stats }) => {
    if (!stats) return null;

    const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
    const fatiguePercent = Math.max(0, Math.min(100, stats.maxFatigue ? (stats.fatigue || 0) / stats.maxFatigue * 100 : 100));
    const balancePercent = Math.max(0, Math.min(100, (stats.balance || 0) * 100));

    return (
        <div className="status-bar">
            {/* Health Section */}
            <div className="status-section">
                <div className="status-track">
                    <div className="status-fill hp" style={{ width: `${hpPercent}%` }} />
                    <div className="status-text">Health {Math.ceil(hpPercent)}%</div>
                </div>
            </div>

            {/* Balance Section */}
            <div className="status-section">
                <div className="status-track">
                    <div className="status-fill balance" style={{ width: `${balancePercent}%` }} />
                    <div className="status-text">Balance {Math.ceil(balancePercent)}%</div>
                </div>
            </div>

            {/* Fatigue Section */}
            <div className="status-section">
                <div className="status-track">
                    <div className="status-fill fatigue" style={{ width: `${fatiguePercent}%` }} />
                    <div className="status-text">Fatigue {Math.ceil(fatiguePercent)}%</div>
                </div>
            </div>

            {/* Info Section */}
            <div className="status-info">
                <span>{stats.stance}</span>
                <span>|</span>
                <span>{stats.engagement || 'NONE'}</span>
            </div>
        </div>
    );
};
