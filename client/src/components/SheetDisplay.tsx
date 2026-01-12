import React from 'react';
import './InventoryDisplay.css';

interface SheetData {
    attributes: { name: string; value: number }[];
    combat: { hp: number; maxHp: number; defense: number; damage: number };
    equipment?: {
        head: string;
        torso: string;
        legs: string;
        feet: string;
        hands: string;
    };
}

interface Props {
    data: SheetData;
}

export const SheetDisplay: React.FC<Props> = ({ data }) => {
    return (
        <div className="inventory-display">
            <div className="inventory-header">CHARACTER SHEET</div>
            <div className="inventory-grid">
                <div className="inventory-section">
                    <div className="section-title">ATTRIBUTES:</div>
                    <div className="backpack-list">
                        {data.attributes.map((attr, idx) => (
                            <div key={idx} className="inventory-item stat-row">
                                <span className="stat-label">{attr.name}:</span>
                                <span className="stat-value">{attr.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="inventory-section">
                    <div className="section-title">COMBAT STATS:</div>
                    <div className="backpack-list">
                        <div className="inventory-item stat-row">
                            <span className="stat-label">HEALTH:</span>
                            <span className="stat-value">{data.combat.hp} / {data.combat.maxHp}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">DEFENSE:</span>
                            <span className="stat-value">{data.combat.defense}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">BASE DMG:</span>
                            <span className="stat-value">{data.combat.damage}</span>
                        </div>
                    </div>
                </div>

                {data.equipment && (
                    <div className="inventory-section" style={{ gridColumn: '1 / -1' }}>
                        <div className="section-title">ARMOR & GEAR:</div>
                        <div className="backpack-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div className="inventory-item stat-row">
                                <span className="stat-label">Head:</span>
                                <span className="stat-value">{data.equipment.head}</span>
                            </div>
                            <div className="inventory-item stat-row">
                                <span className="stat-label">Torso:</span>
                                <span className="stat-value">{data.equipment.torso}</span>
                            </div>
                            <div className="inventory-item stat-row">
                                <span className="stat-label">Legs:</span>
                                <span className="stat-value">{data.equipment.legs}</span>
                            </div>
                            <div className="inventory-item stat-row">
                                <span className="stat-label">Feet:</span>
                                <span className="stat-value">{data.equipment.feet}</span>
                            </div>
                            <div className="inventory-item stat-row">
                                <span className="stat-label">Hands:</span>
                                <span className="stat-value">{data.equipment.hands}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
