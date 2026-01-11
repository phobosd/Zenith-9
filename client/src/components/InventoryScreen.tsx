import React from 'react';
import './InventoryScreen.css';

interface InventoryData {
    leftHand: string;
    rightHand: string;
    backpack: string;
    torso: string;
    legs: string;
    waist: string;
    backpackContents: string[];
}

interface Props {
    data: InventoryData;
    onClose: () => void;
}

export const InventoryScreen: React.FC<Props> = ({ data, onClose }) => {
    React.useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'i') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onClose]);

    return (
        <div className="inventory-overlay">
            <div className="inventory-container">
                <div className="inventory-header">CHARACTER INVENTORY</div>

                <div className="inventory-grid">
                    {/* Left Column - Equipment */}
                    <div className="equipment-col">
                        <div className="section-header">EQUIPPED ITEMS:</div>

                        <div className="equipment-row">
                            <div className="label">SHOULDER:</div>
                            <div className="label">HEAD:</div>
                        </div>
                        <div className="equipment-row">
                            <div className="item-box">[ {data.backpack} ]</div>
                            <div className="item-box">[ None ]</div>
                        </div>

                        <div className="ascii-art">
                            <pre>{`           L___|___J
               |
CHEST:       __|___`}</pre>
                        </div>

                        <div className="equipment-row">
                            <div className="item-box chest">[ {data.torso} ]</div>
                            <div className="ascii-body">{`/     \\`}</div>
                        </div>

                        <div className="ascii-art">
                            <pre>{`             |     |`}</pre>
                        </div>

                        <div className="equipment-row">
                            <div className="label">R HAND:</div>
                            <div className="ascii-body">{`|_____|`}</div>
                            <div className="label right">L HAND:</div>
                        </div>

                        <div className="equipment-row hands">
                            <div className="item-box">[ {data.rightHand} ]</div>
                            <div className="ascii-body">{`\\___/`}</div>
                            <div className="item-box">[ {data.leftHand} ]</div>
                        </div>

                        <div className="ascii-art">
                            <pre>{`               | |
WAIST:       __|_|__`}</pre>
                        </div>

                        <div className="equipment-row">
                            <div className="item-box">[ {data.waist} ]</div>
                            <div className="ascii-body">{`|     |`}</div>
                        </div>

                        <div className="ascii-art">
                            <pre>{`             |     |
LEGS:        |_____|`}</pre>
                        </div>

                        <div className="equipment-row">
                            <div className="item-box">[ {data.legs} ]</div>
                            <div className="ascii-body">{`|___|___|`}</div>
                        </div>
                    </div>

                    {/* Right Column - Backpack Contents */}
                    <div className="backpack-col">
                        <div className="section-header">ALL ITEMS / BACKPACK CONTENTS:</div>
                        <div className="backpack-list">
                            {data.backpackContents.length > 0 ? (
                                data.backpackContents.map((item, idx) => (
                                    <div key={idx} className="backpack-item">
                                        [ {item} ]
                                    </div>
                                ))
                            ) : (
                                <div className="empty-message">(Empty)</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="inventory-footer">
                    GOLD: 0
                </div>

                <div className="close-hint">
                    Press [ESC] or [I] to close
                </div>
            </div>
        </div>
    );
};
