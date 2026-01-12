import React from 'react';
import './InventoryDisplay.css';

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
        <div className="inventory-display">
            <div className="inventory-header">CHARACTER SKILLS</div>
            <div className="inventory-grid">
                <div className="inventory-section" style={{ gridColumn: '1 / -1' }}>
                    <div className="section-title">SKILL PROGRESS:</div>
                    <div className="backpack-list">
                        {data.skills.length > 0 ? (
                            data.skills.map((skill, idx) => (
                                <div key={idx} className="inventory-item skill-row">
                                    <span className="skill-name">{skill.name}</span>
                                    <span className="skill-level">Lvl {skill.level}</span>
                                    <span className="skill-progress">
                                        {renderProgressBar(skill.progress)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="inventory-item">(No Skills Learned)</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
