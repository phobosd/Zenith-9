import React, { useState, useEffect, useRef } from 'react';
import './CombatOverlay.css';

interface SyncBarParams {
    speed: number;
    critZoneSize: number;
    jitter: number;
    barLength: number;
}

interface CombatSyncData {
    targetId: string;
    targetName: string;
    weaponName: string;
    syncBar: SyncBarParams;
}

interface CombatOverlayProps {
    socket: any;
}

export const CombatOverlay: React.FC<CombatOverlayProps> = ({ socket }) => {
    // State for rendering
    const [isActive, setIsActive] = useState(false);
    const [combatDataState, setCombatDataState] = useState<CombatSyncData | null>(null);
    const [cursorPosPercent, setCursorPosPercent] = useState(0);

    // Refs for animation logic (mutable, accessible in loop)
    const combatDataRef = useRef<CombatSyncData | null>(null);
    const cursorValRef = useRef(0); // 0 to barLength
    const directionRef = useRef(1);
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const isActiveRef = useRef(false);

    useEffect(() => {
        const handleCombatSync = (data: CombatSyncData) => {
            // Update state for render
            setCombatDataState(data);
            setIsActive(true);

            // Update refs for loop
            combatDataRef.current = data;
            isActiveRef.current = true;
            cursorValRef.current = 0;
            directionRef.current = 1;
            lastTimeRef.current = 0;

            // Start animation loop
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            animationRef.current = requestAnimationFrame(animate);
        };

        socket.on('combat-sync', handleCombatSync);

        return () => {
            socket.off('combat-sync', handleCombatSync);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [socket]);

    const animate = (currentTime: number) => {
        if (!isActiveRef.current || !combatDataRef.current) return;

        // Initialize time on first frame
        if (!lastTimeRef.current) {
            lastTimeRef.current = currentTime;
            animationRef.current = requestAnimationFrame(animate);
            return;
        }

        const deltaTime = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;

        const data = combatDataRef.current;
        const speed = data.syncBar.speed; // Units per 100ms
        const barLength = data.syncBar.barLength;
        const jitter = data.syncBar.jitter;

        const jitterAmount = Math.random() < jitter ? (Math.random() - 0.5) * 2 : 0;

        // Calculate movement
        // Speed is chars per 100ms. 
        // deltaTime is ms.
        // move = speed * (deltaTime / 100)
        const move = speed * (deltaTime / 100);

        let newPos = cursorValRef.current + (directionRef.current * move) + jitterAmount;

        if (newPos >= barLength) {
            newPos = barLength;
            directionRef.current = -1;
        } else if (newPos <= 0) {
            newPos = 0;
            directionRef.current = 1;
        }

        cursorValRef.current = newPos;

        // Update UI
        setCursorPosPercent((newPos / barLength) * 100);

        animationRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (!isActive || !combatDataState) return;

        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key.toLowerCase() === 'f') {
                e.preventDefault();

                // Stop animation
                if (animationRef.current) cancelAnimationFrame(animationRef.current);
                isActiveRef.current = false;

                const data = combatDataRef.current;
                if (!data) return;

                const barLength = data.syncBar.barLength;
                const critZoneSize = data.syncBar.critZoneSize;
                const critZoneCenter = barLength / 2;
                const critZoneStart = critZoneCenter - critZoneSize / 2;
                const critZoneEnd = critZoneCenter + critZoneSize / 2;

                const hitMarkers = [barLength * 0.25, barLength * 0.75];
                const hitTolerance = 1.0; // Forgiving tolerance

                let hitType: 'crit' | 'hit' | 'miss';
                const currentPos = cursorValRef.current;

                if (currentPos >= critZoneStart && currentPos <= critZoneEnd) {
                    hitType = 'crit';
                } else if (
                    Math.abs(currentPos - hitMarkers[0]) < hitTolerance ||
                    Math.abs(currentPos - hitMarkers[1]) < hitTolerance
                ) {
                    hitType = 'hit';
                } else {
                    hitType = 'miss';
                }

                socket.emit('combat-result', {
                    targetId: data.targetId,
                    hitType: hitType
                });

                setIsActive(false);
                setCombatDataState(null);
                combatDataRef.current = null;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isActive, combatDataState, socket]);

    if (!isActive || !combatDataState) return null;

    const barLength = combatDataState.syncBar.barLength;
    const critZoneSize = combatDataState.syncBar.critZoneSize;

    // Calculate percentages for CSS
    const critWidthPercent = (critZoneSize / barLength) * 100;
    const critLeftPercent = 50 - (critWidthPercent / 2);

    const hitMarker1Percent = 25;
    const hitMarker2Percent = 75;

    return (
        <div className="combat-overlay">
            <div className="combat-header">
                <div className="combat-target">TARGET: {combatDataState.targetName}</div>
                <div className="combat-weapon">WEAPON: {combatDataState.weaponName}</div>
            </div>

            <div className="sync-bar-container">
                <div className="sync-bar-track">
                    {/* Crit Zone */}
                    <div
                        className="crit-zone"
                        style={{
                            left: `${critLeftPercent}%`,
                            width: `${critWidthPercent}%`
                        }}
                    />

                    {/* Hit Markers */}
                    <div className="hit-marker" style={{ left: `${hitMarker1Percent}%` }} />
                    <div className="hit-marker" style={{ left: `${hitMarker2Percent}%` }} />

                    {/* Cursor */}
                    <div
                        className="sync-cursor"
                        style={{
                            left: `${cursorPosPercent}%`
                        }}
                    />
                </div>
            </div>

            <div className="combat-instructions">
                PRESS <span>[SPACE]</span> OR <span>[F]</span> TO FIRE
            </div>
        </div>
    );
};
