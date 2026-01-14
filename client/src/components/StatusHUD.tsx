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
        momentum?: number;
        hasKatana?: boolean;
        leftHand?: string;
        rightHand?: string;
        leftHandDetails?: any;
        rightHandDetails?: any;
        evasion?: number;
        parry?: number;
        shield?: number;
        aggression?: number;
    } | null;
}

import { ItemTooltip } from './ItemTooltip';

export const HandsDisplay: React.FC<StatusProps> = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="hands-display">
            <div className="hand-box left">
                <div className="hand-box-visual">
                    <div className="hand-label">L</div>
                    <div className="hand-content">{stats.leftHand || 'Empty'}</div>
                </div>
                {stats.leftHandDetails && <ItemTooltip details={stats.leftHandDetails} />}
            </div>
            <div className="hand-box right">
                <div className="hand-box-visual">
                    <div className="hand-label">R</div>
                    <div className="hand-content">{stats.rightHand || 'Empty'}</div>
                </div>
                {stats.rightHandDetails && <ItemTooltip details={stats.rightHandDetails} />}
            </div>
        </div>
    );
};

export const CombatStatusDisplay: React.FC<StatusProps> = ({ stats }) => {
    if (!stats) return null;

    const getStanceName = () => {
        const { evasion, parry, shield, aggression } = stats;

        // Evasion: 100/0/0
        if (evasion === 100 && parry === 0 && shield === 0) return 'EVASION';
        // Parry: 0/100/0
        if (evasion === 0 && parry === 100 && shield === 0) return 'PARRY';
        // Shield: 0/0/100
        if (evasion === 0 && parry === 0 && shield === 100) return 'SHIELD';

        // Offensive: 30/30/10, Agg 0.8
        if (evasion === 30 && parry === 30 && shield === 10 && aggression === 0.8) return 'OFFENSIVE';
        // Defensive: 40/40/20, Agg 0.2
        if (evasion === 40 && parry === 40 && shield === 20 && aggression === 0.2) return 'DEFENSIVE';
        // Neutral: 40/30/30, Agg 0.5
        if (evasion === 40 && parry === 30 && shield === 30 && aggression === 0.5) return 'NEUTRAL';

        return 'CUSTOM';
    };

    return (
        <div className="combat-status-display">
            <div className="status-box stance">
                <div className="status-label">STANCE</div>
                <div className="status-value">{getStanceName()}</div>
            </div>
            <div className="status-box posture">
                <div className="status-label">POSTURE</div>
                <div className="status-value">{stats.stance}</div>
            </div>
            <div className="status-box engagement">
                <div className="status-label">ENGAGEMENT</div>
                <div className="status-value">{stats.engagement}</div>
            </div>
        </div>
    );
};

export const RoundtimeIndicator: React.FC<StatusProps> = ({ stats }) => {
    if (!stats || !stats.roundtime || stats.roundtime <= 0) return null;

    return (
        <div className="rt-indicator">
            <div className="rt-bar-bg">
                <div
                    className="rt-bar-fill"
                    style={{ width: `${Math.min(100, (stats.roundtime / (stats.maxRoundtime || stats.roundtime)) * 100)}%` }}
                />
                <div className="rt-text">WAIT {Math.ceil(stats.roundtime)}S</div>
            </div>
        </div>
    );
};

export const MomentumBar: React.FC<StatusProps> = ({ stats }) => {
    if (!stats) return null;

    const momentumPercent = Math.max(0, Math.min(100, stats.momentum || 0));
    const showMomentum = stats.hasKatana && (stats.engagement !== 'disengaged' || momentumPercent > 0);

    if (!showMomentum) return null;

    const getMomentumClass = () => {
        if (momentumPercent >= 30) return 'peak';
        if (momentumPercent >= 15) return 'flowing';
        if (momentumPercent > 0) return 'building';
        return '';
    };

    const getMomentumLabel = () => {
        if (momentumPercent >= 30) return 'PEAK';
        if (momentumPercent >= 15) return 'FLOWING';
        if (momentumPercent > 0) return 'BUILDING';
        return 'IDLE';
    };

    return (
        <div className="momentum-bar-container">
            <div className="momentum-track">
                <div className={`momentum-fill ${getMomentumClass()}`} style={{ width: `${momentumPercent}%` }} />
                <div className="momentum-text">
                    <span className="momentum-label">MOMENTUM</span>
                    <span className="momentum-value">{Math.ceil(momentumPercent)}%</span>
                    <span className="momentum-state">[{getMomentumLabel()}]</span>
                </div>
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
        </div>
    );
};
