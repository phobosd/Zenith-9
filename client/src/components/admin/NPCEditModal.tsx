import React, { useState, useEffect } from 'react';

interface NPCEditModalProps {
    npc: any;
    onClose: () => void;
    onSave: (id: string, updates: any) => void;
    onGeneratePortrait: (id: string) => void;
    onDeleteMemory: (npcId: string, index: number, type: 'short' | 'long') => void;
    npcStatus: any[];
}

export const NPCEditModal: React.FC<NPCEditModalProps> = ({
    npc,
    onClose,
    onSave,
    onGeneratePortrait,
    onDeleteMemory,
    npcStatus
}) => {
    const [editingNPC, setEditingNPC] = useState<any>(null);

    // Initialize editing state when npc prop changes
    useEffect(() => {
        if (npc) {
            setEditingNPC({ ...npc });
        } else {
            setEditingNPC(null);
        }
    }, [npc]);

    if (!editingNPC) return null;

    const activeStatus = npcStatus.find(s => s.name === editingNPC.name || s.id === editingNPC.id);

    // Helper to resolve IDs to names
    const resolveId = (id: string) => {
        const found = npcStatus.find(s => s.id === id || s.name === id);
        if (found) return found.name;

        // Check relationships for this ID to see if we have a name
        if (activeStatus) {
            const rel = activeStatus.relationships.find(([targetId]: [string, any]) => targetId === id);
            if (rel && rel[1].name) return rel[1].name;
        }

        return id;
    };

    // Helper to clean descriptions (replace IDs with names)
    const cleanDescription = (desc: string) => {
        if (!desc) return '';
        // Look for things that look like IDs (alphanumeric, dashes, underscores, length > 10)
        // This is a bit heuristic but should catch socket IDs
        return desc.replace(/[a-zA-Z0-9_-]{15,}/g, (match) => resolveId(match));
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: '2rem'
        }}>
            <div style={{
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '16px',
                width: '1200px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '3rem',
                position: 'relative',
                boxShadow: '0 0 60px rgba(0,255,255,0.15), 0 20px 50px rgba(0,0,0,0.9)',
                color: '#fff',
                fontFamily: "'Inter', sans-serif"
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#555',
                        fontSize: '2.5rem',
                        cursor: 'pointer',
                        lineHeight: '1',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#ff4444'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#555'}
                >
                    ×
                </button>

                {/* Header */}
                <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid #222', paddingBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '2rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 800 }}>
                            Agent Profile: <span style={{ color: '#00ffff' }}>{editingNPC.name}</span>
                        </h2>
                        {activeStatus && (
                            <span style={{
                                background: 'rgba(0, 255, 0, 0.1)',
                                color: '#00ff00',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '20px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                border: '1px solid rgba(0, 255, 0, 0.3)',
                                letterSpacing: '1px'
                            }}>
                                LIVE NEURAL LINK
                            </span>
                        )}
                    </div>
                    <div style={{ color: '#444', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                        ID: {editingNPC.id}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '4rem' }}>
                    {/* Left Column: Core Data */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px', fontWeight: 600 }}>Name</label>
                                <input
                                    type="text"
                                    value={editingNPC.name}
                                    onChange={(e) => setEditingNPC({ ...editingNPC, name: e.target.value })}
                                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '1rem', borderRadius: '8px', fontSize: '1rem', transition: 'border-color 0.2s' }}
                                    onFocus={(e) => e.target.style.borderColor = '#00ffff'}
                                    onBlur={(e) => e.target.style.borderColor = '#333'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px', fontWeight: 600 }}>Faction</label>
                                <input
                                    type="text"
                                    value={editingNPC.faction || ''}
                                    onChange={(e) => setEditingNPC({ ...editingNPC, faction: e.target.value })}
                                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '1rem', borderRadius: '8px', fontSize: '1rem' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px', fontWeight: 600 }}>Description</label>
                            <textarea
                                value={editingNPC.description}
                                onChange={(e) => setEditingNPC({ ...editingNPC, description: e.target.value })}
                                style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '1rem', borderRadius: '8px', minHeight: '120px', lineHeight: '1.6', fontSize: '1rem' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px', fontWeight: 600 }}>Role</label>
                                <select
                                    value={editingNPC.role || 'civilian'}
                                    onChange={(e) => setEditingNPC({ ...editingNPC, role: e.target.value })}
                                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '1rem', borderRadius: '8px', fontSize: '1rem', appearance: 'none' }}
                                >
                                    <option value="vendor">Vendor</option>
                                    <option value="guard">Guard</option>
                                    <option value="civilian">Civilian</option>
                                    <option value="mob">Mob</option>
                                    <option value="boss">Boss</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px', fontWeight: 600 }}>Behavior Profile</label>
                                <select
                                    value={editingNPC.behavior || 'neutral'}
                                    onChange={(e) => setEditingNPC({ ...editingNPC, behavior: e.target.value })}
                                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '1rem', borderRadius: '8px', fontSize: '1rem' }}
                                >
                                    <option value="friendly">Friendly - Non-Hostile</option>
                                    <option value="neutral">Neutral - Reactive</option>
                                    <option value="cautious">Cautious - Defensive</option>
                                    <option value="elusive">Elusive - Avoidant</option>
                                    <option value="aggressive">Aggressive - Hostile</option>
                                </select>
                            </div>
                        </div>

                        {/* Stats */}
                        <div style={{ background: 'linear-gradient(180deg, #080808 0%, #050505 100%)', padding: '2rem', borderRadius: '12px', border: '1px solid #1a1a1a' }}>
                            <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#00ffff', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>Combat Parameters</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Health Points</label>
                                    <input
                                        type="number"
                                        value={editingNPC.stats?.health || 100}
                                        onChange={(e) => setEditingNPC({ ...editingNPC, stats: { ...editingNPC.stats, health: parseInt(e.target.value) || 0 } })}
                                        style={{ width: '100%', background: '#000', border: '1px solid #222', color: '#fff', padding: '0.8rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Attack Rating</label>
                                    <input
                                        type="number"
                                        value={editingNPC.stats?.attack || 10}
                                        onChange={(e) => setEditingNPC({ ...editingNPC, stats: { ...editingNPC.stats, attack: parseInt(e.target.value) || 0 } })}
                                        style={{ width: '100%', background: '#000', border: '1px solid #222', color: '#fff', padding: '0.8rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Defense Rating</label>
                                    <input
                                        type="number"
                                        value={editingNPC.stats?.defense || 0}
                                        onChange={(e) => setEditingNPC({ ...editingNPC, stats: { ...editingNPC.stats, defense: parseInt(e.target.value) || 0 } })}
                                        style={{ width: '100%', background: '#000', border: '1px solid #222', color: '#fff', padding: '0.8rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Portrait & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <label style={{ display: 'block', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem', fontWeight: 600 }}>Neural Portrait</label>
                            <div style={{
                                width: '320px',
                                height: '320px',
                                background: '#000',
                                border: '2px solid #222',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                                position: 'relative'
                            }}>
                                {(() => {
                                    const portrait = activeStatus?.portrait || editingNPC.portrait;
                                    return portrait ? (
                                        <img src={portrait} alt={editingNPC.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#1a1a1a' }}>
                                            <div style={{ fontSize: '6rem' }}>👤</div>
                                            <div style={{ fontSize: '0.8rem', marginTop: '1rem', letterSpacing: '2px', color: '#333' }}>NO VISUAL DATA</div>
                                        </div>
                                    );
                                })()}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', pointerEvents: 'none' }}></div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Portrait URL"
                                value={editingNPC.portrait || ''}
                                onChange={(e) => setEditingNPC({ ...editingNPC, portrait: e.target.value })}
                                style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace' }}
                            />
                            <button
                                onClick={() => onGeneratePortrait(editingNPC.id)}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: 'linear-gradient(45deg, #00ffff, #0088ff)',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 4px 15px rgba(0,255,255,0.3)',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,255,255,0.4)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,255,255,0.3)';
                                }}
                            >
                                Generate Portrait
                            </button>
                        </div>
                    </div>
                </div>

                {/* LIVE STATUS SECTION */}
                {activeStatus && (
                    <div style={{ marginTop: '5rem', borderTop: '2px solid #222', paddingTop: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
                            <h3 style={{ margin: 0, color: '#00ffff', fontSize: '1.4rem', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: 800 }}>Neural Link: Live Status</h3>
                            <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, #00ffff33, transparent)' }}></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: '4rem' }}>
                            {/* Personality & Agenda */}
                            <div>
                                <h4 style={{ color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '2px', fontWeight: 700 }}>Personality & Core Agenda</h4>
                                <div style={{ background: '#050505', padding: '2rem', border: '1px solid #1a1a1a', borderRadius: '12px', fontSize: '1rem', lineHeight: '1.8', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                                    <div style={{ marginBottom: '1.2rem' }}><span style={{ color: '#00ffff', fontWeight: '900', marginRight: '1rem', fontSize: '0.8rem' }}>TRAITS:</span> <span style={{ color: '#ccc' }}>{activeStatus.personality?.traits.join(', ')}</span></div>
                                    <div style={{ marginBottom: '1.2rem' }}><span style={{ color: '#00ffff', fontWeight: '900', marginRight: '1rem', fontSize: '0.8rem' }}>VOICE:</span> <span style={{ color: '#ccc' }}>{activeStatus.personality?.voice}</span></div>
                                    <div><span style={{ color: '#00ffff', fontWeight: '900', marginRight: '1rem', fontSize: '0.8rem' }}>AGENDA:</span> <span style={{ color: '#ccc' }}>{activeStatus.personality?.agenda}</span></div>
                                </div>
                            </div>

                            {/* Relationships */}
                            <div>
                                <h4 style={{ color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '2px', fontWeight: 700 }}>Social Network</h4>
                                <div style={{ background: '#050505', padding: '1rem', border: '1px solid #1a1a1a', borderRadius: '12px', height: '220px', overflowY: 'auto' }}>
                                    {activeStatus.relationships.length > 0 ? (
                                        activeStatus.relationships.map(([target, data]: [string, any]) => (
                                            <div key={target} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid #111', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#080808'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                                <span style={{ color: '#fff', fontWeight: '600', fontSize: '1.1rem' }}>{resolveId(target)}</span>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ color: data.trust > 60 ? '#00ff00' : data.trust < 20 ? '#ff4444' : '#ffff00', fontWeight: '900', fontSize: '0.9rem', letterSpacing: '1px' }}>{data.status.toUpperCase()}</div>
                                                    <div style={{ color: '#444', fontSize: '0.75rem', marginTop: '0.2rem' }}>Trust Index: {data.trust}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ color: '#222', textAlign: 'center', marginTop: '5rem', fontStyle: 'italic', letterSpacing: '1px' }}>NO SOCIAL CONNECTIONS DETECTED</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Memories */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: '4rem' }}>
                            <div>
                                <h4 style={{ color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '2px', fontWeight: 700 }}>Short-Term Buffer</h4>
                                <div style={{ background: '#050505', padding: '1.5rem', border: '1px solid #1a1a1a', borderRadius: '12px', height: '400px', overflowY: 'auto' }}>
                                    {activeStatus.memory?.shortTerm.length > 0 ? (
                                        activeStatus.memory.shortTerm.map((m: any, i: number) => (
                                            <div key={i} style={{ marginBottom: '1.5rem', borderLeft: '4px solid #00ffff', paddingLeft: '1.5rem', background: 'rgba(0,255,255,0.02)', padding: '1.5rem', borderRadius: '0 8px 8px 0', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                                    <span style={{ color: '#333', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{new Date(m.timestamp).toLocaleTimeString()}</span>
                                                    <button
                                                        onClick={() => onDeleteMemory(editingNPC.id, i, 'short')}
                                                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', opacity: 0.3, fontSize: '1.5rem', lineHeight: '1' }}
                                                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.3'}
                                                    >×</button>
                                                </div>
                                                <div style={{ color: '#bbb', fontSize: '1rem', lineHeight: '1.6' }}>{cleanDescription(m.description)}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ color: '#1a1a1a', textAlign: 'center', marginTop: '10rem', letterSpacing: '2px' }}>BUFFER EMPTY</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 style={{ color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '2px', fontWeight: 700 }}>Long-Term Archive</h4>
                                <div style={{ background: '#050505', padding: '1.5rem', border: '1px solid #1a1a1a', borderRadius: '12px', height: '400px', overflowY: 'auto' }}>
                                    {activeStatus.memory?.longTerm.length > 0 ? (
                                        activeStatus.memory.longTerm.map((m: any, i: number) => (
                                            <div key={i} style={{ marginBottom: '1.5rem', borderLeft: '4px solid #ff00ff', paddingLeft: '1.5rem', background: 'rgba(255,0,255,0.02)', padding: '1.5rem', borderRadius: '0 8px 8px 0', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                                    <span style={{ color: '#333', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{new Date(m.timestamp).toLocaleTimeString()}</span>
                                                    <button
                                                        onClick={() => onDeleteMemory(editingNPC.id, i, 'long')}
                                                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', opacity: 0.3, fontSize: '1.5rem', lineHeight: '1' }}
                                                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.3'}
                                                    >×</button>
                                                </div>
                                                <div style={{ color: '#bbb', fontSize: '1rem', lineHeight: '1.6' }}>{cleanDescription(m.description)}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ color: '#1a1a1a', textAlign: 'center', marginTop: '10rem', letterSpacing: '2px' }}>ARCHIVE EMPTY</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Structured Rumors */}
                        <div>
                            <h4 style={{ color: '#ffd700', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '3px', fontWeight: 800 }}>Extracted Intelligence (Rumors & Intel)</h4>
                            <div style={{ background: '#050505', padding: '2rem', border: '1px solid #1a1a1a', borderRadius: '12px', minHeight: '150px', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)' }}>
                                {activeStatus.memory?.longTerm.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #222', textAlign: 'left' }}>
                                                <th style={{ padding: '1.5rem 1rem', color: '#444', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Subject</th>
                                                <th style={{ padding: '1.5rem 1rem', color: '#444', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Action/Intel</th>
                                                <th style={{ padding: '1.5rem 1rem', color: '#444', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Target/Details</th>
                                                <th style={{ padding: '1rem', color: '#444', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Location</th>
                                                <th style={{ padding: '1rem', color: '#444', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Timeframe</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeStatus.memory.longTerm.map((m: any, i: number) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #111', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseOut={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                    {m.rumor ? (
                                                        <>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#00ffff', fontWeight: '900' }}>{resolveId(m.rumor.subject)}</td>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#fff' }}>{m.rumor.action}</td>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#ff00ff', fontWeight: 'bold' }}>{m.rumor.target ? resolveId(m.rumor.target) : '-'}</td>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#888' }}>{m.rumor.location}</td>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.rumor.time}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#00ffff', fontWeight: '900' }}>{m.participants && m.participants.length > 0 ? resolveId(m.participants[0]) : 'Neural Link'}</td>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#fff' }}>Intel</td>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#ccc', fontStyle: 'italic' }}>{cleanDescription(m.description)}</td>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#444' }}>Archive</td>
                                                            <td style={{ padding: '1.5rem 1rem', color: '#444', fontFamily: 'monospace', fontSize: '0.8rem' }}>{new Date(m.timestamp).toLocaleTimeString()}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ color: '#1a1a1a', textAlign: 'center', padding: '4rem', fontStyle: 'italic' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.1 }}>📡</div>
                                        NO STRUCTURED INTELLIGENCE DETECTED
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div style={{ display: 'flex', gap: '2rem', marginTop: '5rem', justifyContent: 'flex-end', borderTop: '1px solid #222', paddingTop: '3rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '1rem 3rem',
                            fontSize: '1rem',
                            letterSpacing: '2px',
                            background: 'transparent',
                            border: '1px solid #444',
                            color: '#888',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = '#fff';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = '#444';
                            e.currentTarget.style.color = '#888';
                        }}
                    >
                        DISCARD
                    </button>
                    <button
                        onClick={() => onSave(editingNPC.id, editingNPC)}
                        style={{
                            padding: '1rem 4rem',
                            fontSize: '1rem',
                            letterSpacing: '2px',
                            background: 'linear-gradient(45deg, #00aa00, #00ff00)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            boxShadow: '0 4px 15px rgba(0,255,0,0.2)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,255,0,0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,255,0,0.2)';
                        }}
                    >
                        COMMIT CHANGES
                    </button>
                </div>
            </div>
        </div>
    );
};
