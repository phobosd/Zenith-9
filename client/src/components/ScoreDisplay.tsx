import React from 'react';
import './InventoryDisplay.css'; // Reusing the same CSS for consistency

interface ScoreData {
    skills: { name: string; level: number; progress: number }[];
}

interface Props {
    data: ScoreData;
}

export const ScoreDisplay: React.FC<Props> = ({ data }) => {
    const renderProgressBar = (percent: number) => {
        const barLength = 20;
        const filledLength = Math.floor((percent / 100) * barLength);
        const bar = '#'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
        return `[${bar}] ${percent}%`;
    };

    return (
        <div className="inv">
            <div className="inv-title">CHARACTER SKILLS</div>
            <div className="inv-border"></div>
            <div className="inv-body">
                <div className="inv-right" style={{ flex: 1 }}>
                    <div className="inv-section">SKILL PROGRESS:</div>
                    <div className="inv-list">
                        {data.skills.length > 0 ? (
                            data.skills.map((skill, idx) => (
                                <div key={idx} className="inv-slot" style={{ justifyContent: 'space-between' }}>
                                    <span className="slot-label" style={{ minWidth: '200px' }}>{skill.name}</span>
                                    <span className="slot-item">Lvl {skill.level}</span>
                                    <span className="slot-item wide" style={{ fontFamily: 'monospace' }}>
                                        {renderProgressBar(skill.progress)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="inv-empty">(No Skills Learned)</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="inv-border"></div>
        </div>
    );
};
