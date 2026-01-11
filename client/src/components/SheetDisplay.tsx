import React from 'react';
import './InventoryDisplay.css'; // Reusing the same CSS for consistency

interface SheetData {
    attributes: { name: string; value: number }[];
    combat: { hp: number; maxHp: number; defense: number; damage: number };
}

interface Props {
    data: SheetData;
}

export const SheetDisplay: React.FC<Props> = ({ data }) => {
    return (
        <div className="inv">
            <div className="inv-title">CHARACTER SHEET</div>
            <div className="inv-border"></div>
            <div className="inv-body">
                <div className="inv-left" style={{ minWidth: '300px', flex: '0 0 300px' }}>
                    <div className="inv-section">ATTRIBUTES:</div>
                    <div className="inv-list">
                        {data.attributes.map((attr, idx) => (
                            <div key={idx} className="inv-slot">
                                <span className="slot-label" style={{ minWidth: '100px' }}>{attr.name}:</span>
                                <span className="slot-item" style={{ minWidth: '50px', textAlign: 'center' }}>{attr.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="inv-divider"></div>

                <div className="inv-right">
                    <div className="inv-section">COMBAT STATS:</div>
                    <div className="inv-list">
                        <div className="inv-slot">
                            <span className="slot-label">HEALTH:</span>
                            <span className="slot-item">{data.combat.hp} / {data.combat.maxHp}</span>
                        </div>
                        <div className="inv-slot">
                            <span className="slot-label">DEFENSE:</span>
                            <span className="slot-item">{data.combat.defense}</span>
                        </div>
                        <div className="inv-slot">
                            <span className="slot-label">BASE DMG:</span>
                            <span className="slot-item">{data.combat.damage}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="inv-border"></div>
        </div>
    );
};
