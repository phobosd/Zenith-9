import React from 'react';
import './InventoryDisplay.css';

interface InventoryData {
    leftHand: string;
    rightHand: string;
    backpack: string;
    head: string;
    torso: string;
    legs: string;
    feet: string;
    waist: string;
    backpackContents: string[];
}

interface Props {
    data: InventoryData;
}

export const InventoryDisplay: React.FC<Props> = ({ data }) => {
    return (
        <div className="inventory-display">
            <div className="inventory-header">CHARACTER INVENTORY</div>
            <div className="inventory-grid">
                <div className="inventory-section">
                    <div className="section-title">EQUIPPED:</div>
                    <div className="backpack-list">
                        <div className="inventory-item stat-row">
                            <span className="stat-label">Head:</span>
                            <span className="stat-value">{data.head}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">Torso:</span>
                            <span className="stat-value">{data.torso}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">Back:</span>
                            <span className="stat-value">{data.backpack}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">Left Hand:</span>
                            <span className="stat-value">{data.leftHand}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">Right Hand:</span>
                            <span className="stat-value">{data.rightHand}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">Waist:</span>
                            <span className="stat-value">{data.waist}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">Legs:</span>
                            <span className="stat-value">{data.legs}</span>
                        </div>
                        <div className="inventory-item stat-row">
                            <span className="stat-label">Feet:</span>
                            <span className="stat-value">{data.feet}</span>
                        </div>
                    </div>
                </div>
                <div className="inventory-section">
                    <div className="section-title">BACKPACK:</div>
                    <div className="backpack-list">
                        {data.backpackContents && data.backpackContents.length > 0 ? (
                            data.backpackContents.map((item, idx) => (
                                <div key={idx} className="inventory-item">
                                    <span className="stat-value">- {item}</span>
                                </div>
                            ))
                        ) : (
                            <div className="inventory-item">
                                <span className="stat-value" style={{ fontStyle: 'italic', opacity: 0.5 }}>(Empty)</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
