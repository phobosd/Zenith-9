import React from 'react';

interface AITabProps {
    innerThoughts: { timestamp: number, thought: string }[];
    npcStatus: any[];
    aiConfig: {
        ambientDialogueFrequency: number;
        llmContextWindow: number;
        relationshipDecayRate: number;
        maxConversationTurns: number;
        npcMovementInterval: number;
    };
    updateAIConfig: (config: any) => void;
    editingNPC: any | null;
    setEditingNPC: (npc: any | null) => void;
    updateNPC: (id: string, updates: any) => void;
    generatePortrait: (id: string) => void;
    deleteNPCMemory: (npcId: string, index: number, type: 'short' | 'long') => void;
}

export const AITab: React.FC<AITabProps> = ({
    innerThoughts, npcStatus, aiConfig, updateAIConfig,
    editingNPC, setEditingNPC, updateNPC, generatePortrait, deleteNPCMemory
}) => {
    const [npcSearch, setNpcSearch] = React.useState('');
    const [npcFilter, setNpcFilter] = React.useState<string | null>(null);

    return (
        <div className="tab-content">
            <div className="admin-grid">
                {/* Director Thoughts */}
                <div className="admin-card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <h3 className="text-neon-blue">DIRECTOR INNER THOUGHTS</h3>
                        <span className="text-gray text-xs">Real-time reasoning stream</span>
                    </div>
                    <div className="thought-stream" style={{
                        height: '400px',
                        overflowY: 'auto',
                        background: '#050505',
                        padding: '1rem',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        border: '1px solid #222'
                    }}>
                        {innerThoughts.length === 0 && <div className="text-gray italic">No thoughts recorded yet...</div>}
                        {innerThoughts.map((t, i) => (
                            <div key={i} className="thought-entry" style={{ marginBottom: '1rem', borderLeft: '2px solid #00f2ff', paddingLeft: '1rem' }}>
                                <div className="text-gray text-xs" style={{ marginBottom: '0.2rem' }}>
                                    {new Date(t.timestamp).toLocaleTimeString()}
                                </div>
                                <div className="text-white">{t.thought}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* NPC Agent Status */}
                <div className="admin-card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 className="text-neon-green">ACTIVE NPC AGENTS</h3>
                            <span className="text-gray text-xs">Live personality and memory status</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={npcSearch}
                                onChange={(e) => setNpcSearch(e.target.value)}
                                style={{
                                    background: '#222',
                                    border: '1px solid #444',
                                    color: '#fff',
                                    padding: '0.3rem',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    width: '150px'
                                }}
                            />
                            {['vendor', 'guard', 'civilian', 'mob', 'boss'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setNpcFilter(npcFilter === type ? null : type)}
                                    style={{
                                        padding: '0.2rem 0.5rem',
                                        background: npcFilter === type ? '#00ffff' : '#222',
                                        color: npcFilter === type ? '#000' : '#888',
                                        border: '1px solid #444',
                                        borderRadius: '10px',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
                                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                                    <th style={{ padding: '0.5rem', color: '#888' }}>NPC Name</th>
                                    <th style={{ padding: '0.5rem', color: '#888' }}>Location</th>
                                    <th style={{ padding: '0.5rem', color: '#888' }}>Personality</th>
                                    <th style={{ padding: '0.5rem', color: '#888' }}>Memory</th>
                                    <th style={{ padding: '0.5rem', color: '#888' }}>Relationships</th>
                                    <th style={{ padding: '0.5rem', color: '#888', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {npcStatus
                                    .filter(npc => {
                                        const matchesSearch = npc.name.toLowerCase().includes(npcSearch.toLowerCase()) || npc.id.toLowerCase().includes(npcSearch.toLowerCase());
                                        const role = (npc as any).role || '';
                                        const matchesFilter = npcFilter ? role.toLowerCase() === npcFilter.toLowerCase() : true;
                                        return matchesSearch && matchesFilter;
                                    })
                                    .map(npc => (
                                        <tr key={npc.id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '0.5rem', color: '#fff', fontWeight: 'bold' }}>{npc.name}</td>
                                            <td style={{ padding: '0.5rem', color: '#888' }}>({npc.x}, {npc.y})</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ color: '#00ffff', fontSize: '0.75rem' }}>{npc.personality?.traits.join(', ')}</div>
                                                <div style={{ color: '#444', fontSize: '0.7rem' }}>Agenda: {npc.personality?.agenda}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ color: '#fff' }}>{npc.memory?.shortTerm.length || 0} short-term</div>
                                                <div style={{ color: '#888', fontSize: '0.7rem' }}>{npc.memory?.longTerm.length || 0} rumors</div>
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ color: '#ffd700' }}>{npc.relationships.length} active</div>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => setEditingNPC(npc)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid #444',
                                                        color: '#fff',
                                                        padding: '0.2rem 0.5rem',
                                                        cursor: 'pointer',
                                                        borderRadius: '3px',
                                                        fontSize: '0.7rem'
                                                    }}
                                                >
                                                    EDIT
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                {npcStatus.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#444' }}>No active NPC agents found in the world.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI Settings */}
                <div className="admin-card">
                    <div className="card-header">
                        <h3 className="text-neon-purple">AI CONFIGURATION</h3>
                    </div>
                    <div className="card-body">
                        <div className="setting-row" title="Controls how often NPCs initiate conversations with players or other NPCs.">
                            <label>Ambient Dialogue Frequency</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={aiConfig.ambientDialogueFrequency}
                                onChange={(e) => updateAIConfig({ ambientDialogueFrequency: parseInt(e.target.value) })}
                            />
                            <span className="text-xs text-gray">{aiConfig.ambientDialogueFrequency}% chance per tick</span>
                        </div>
                        <div className="setting-row" title="Number of recent messages retained in NPC short-term memory for context.">
                            <label>LLM Context Window (Short-term)</label>
                            <input
                                type="number"
                                value={aiConfig.llmContextWindow}
                                onChange={(e) => updateAIConfig({ llmContextWindow: parseInt(e.target.value) })}
                            />
                            <span className="text-xs text-gray">Messages remembered</span>
                        </div>
                        <div className="setting-row" title="Rate at which relationship values decay towards neutral over time.">
                            <label>Relationship Decay Rate</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={aiConfig.relationshipDecayRate}
                                onChange={(e) => updateAIConfig({ relationshipDecayRate: parseInt(e.target.value) })}
                            />
                            <span className="text-xs text-gray">{aiConfig.relationshipDecayRate}% per game day</span>
                        </div>
                        <div className="setting-row" title="Maximum number of exchanges in a single conversation before NPCs part ways.">
                            <label>Max Conversation Turns</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={aiConfig.maxConversationTurns}
                                onChange={(e) => updateAIConfig({ maxConversationTurns: parseInt(e.target.value) })}
                            />
                            <span className="text-xs text-gray">Exchanges per convo</span>
                        </div>
                        <div className="setting-row" title="Time in milliseconds between NPC movement attempts. Lower values mean more frequent movement.">
                            <label>NPC Movement Interval (ms)</label>
                            <input
                                type="range"
                                min="5000"
                                max="60000"
                                step="1000"
                                value={aiConfig.npcMovementInterval || 30000}
                                onChange={(e) => updateAIConfig({ npcMovementInterval: parseInt(e.target.value) })}
                            />
                            <span className="text-xs text-gray">{aiConfig.npcMovementInterval || 30000} ms</span>
                        </div>
                    </div>
                </div>

                {/* Rumor Mill Stats */}
                <div className="admin-card">
                    <div className="card-header">
                        <h3 className="text-neon-green">RUMOR MILL</h3>
                    </div>
                    <div className="card-body">
                        <div className="stat-row">
                            <span>Active Rumors:</span>
                            <span className="text-white">24</span>
                        </div>
                        <div className="stat-row">
                            <span>NPC Gossip Rate:</span>
                            <span className="text-white">15%</span>
                        </div>
                        <button className="admin-btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
                            FLUSH RUMOR CACHE
                        </button>
                    </div>
                </div>
            </div>

            {/* EDIT MODAL */}
            {editingNPC && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#111',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        width: '900px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '2rem',
                        position: 'relative',
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                    }}>
                        <button
                            onClick={() => setEditingNPC(null)}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'transparent',
                                border: 'none',
                                color: '#888',
                                fontSize: '1.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            ×
                        </button>

                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                            Editing: {editingNPC.name}
                        </h3>

                        <div style={{ display: 'flex', gap: '2rem' }}>
                            {/* Left Column: Form Fields */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Name</label>
                                    <input
                                        type="text"
                                        value={editingNPC.name}
                                        onChange={(e) => setEditingNPC({ ...editingNPC, name: e.target.value })}
                                        style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Description</label>
                                    <textarea
                                        value={editingNPC.description}
                                        onChange={(e) => setEditingNPC({ ...editingNPC, description: e.target.value })}
                                        style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem', minHeight: '80px' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Role</label>
                                        <select
                                            value={editingNPC.role || 'civilian'}
                                            onChange={(e) => setEditingNPC({ ...editingNPC, role: e.target.value })}
                                            style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                        >
                                            <option value="vendor">Vendor</option>
                                            <option value="guard">Guard</option>
                                            <option value="civilian">Civilian</option>
                                            <option value="mob">Mob</option>
                                            <option value="boss">Boss</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Faction</label>
                                        <input
                                            type="text"
                                            value={editingNPC.faction || ''}
                                            onChange={(e) => setEditingNPC({ ...editingNPC, faction: e.target.value })}
                                            style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Behavior</label>
                                    <select
                                        value={editingNPC.behavior || 'neutral'}
                                        onChange={(e) => setEditingNPC({ ...editingNPC, behavior: e.target.value })}
                                        style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                    >
                                        <option value="friendly">Friendly - Will not attack</option>
                                        <option value="neutral">Neutral - Defensive only</option>
                                        <option value="cautious">Cautious - Wary of strangers</option>
                                        <option value="elusive">Elusive - Avoids combat</option>
                                        <option value="aggressive">Aggressive - Attacks on sight</option>
                                    </select>
                                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                                        {editingNPC.behavior === 'aggressive' && '⚠️ Will auto-attack players'}
                                        {editingNPC.behavior === 'friendly' && '✓ Will never attack'}
                                        {editingNPC.behavior === 'neutral' && '⚔️ Only attacks if attacked first'}
                                    </div>
                                </div>

                                {/* Stats Section */}
                                <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                    <label style={{ display: 'block', color: '#00ffff', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Combat Stats</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Health</label>
                                            <input
                                                type="number"
                                                value={editingNPC.stats?.health || 100}
                                                onChange={(e) => setEditingNPC({
                                                    ...editingNPC,
                                                    stats: {
                                                        ...editingNPC.stats,
                                                        health: parseInt(e.target.value) || 0
                                                    }
                                                })}
                                                style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Attack</label>
                                            <input
                                                type="number"
                                                value={editingNPC.stats?.attack || 10}
                                                onChange={(e) => setEditingNPC({
                                                    ...editingNPC,
                                                    stats: {
                                                        ...editingNPC.stats,
                                                        attack: parseInt(e.target.value) || 0
                                                    }
                                                })}
                                                style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Defense</label>
                                            <input
                                                type="number"
                                                value={editingNPC.stats?.defense || 0}
                                                onChange={(e) => setEditingNPC({
                                                    ...editingNPC,
                                                    stats: {
                                                        ...editingNPC.stats,
                                                        defense: parseInt(e.target.value) || 0
                                                    }
                                                })}
                                                style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Portrait */}
                            <div style={{ width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ color: '#888', fontSize: '0.8rem' }}>Portrait</label>
                                <div style={{
                                    width: '200px',
                                    height: '200px',
                                    border: '1px solid #444',
                                    background: '#000',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    overflow: 'hidden'
                                }}>
                                    {editingNPC.portrait ? (
                                        <img
                                            src={editingNPC.portrait}
                                            alt={editingNPC.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <span style={{ color: '#444' }}>No Portrait</span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Portrait URL"
                                    value={editingNPC.portrait || ''}
                                    onChange={(e) => setEditingNPC({ ...editingNPC, portrait: e.target.value })}
                                    style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem', fontSize: '0.8rem' }}
                                />
                                {!editingNPC.portrait && (
                                    <button
                                        onClick={() => generatePortrait(editingNPC.id)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            background: '#00ffff',
                                            color: '#000',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            marginTop: '0.5rem'
                                        }}
                                    >
                                        GENERATE PORTRAIT
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* AI Status Section (if active) */}
                        {(() => {
                            const activeStatus = npcStatus.find(s => s.name === editingNPC.name);
                            if (!activeStatus) return null;

                            return (
                                <div style={{ marginTop: '2rem', borderTop: '2px solid #333', paddingTop: '1rem' }}>
                                    <h4 style={{ color: '#00ffff', marginBottom: '1rem' }}>Active AI Status (Live Instance)</h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                        <div>
                                            <h5 style={{ color: '#888', marginBottom: '0.5rem' }}>Personality & Agenda</h5>
                                            <div style={{ background: '#000', padding: '1rem', border: '1px solid #222', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                <div style={{ marginBottom: '0.5rem' }}><span style={{ color: '#00ffff' }}>Traits:</span> {activeStatus.personality?.traits.join(', ')}</div>
                                                <div style={{ marginBottom: '0.5rem' }}><span style={{ color: '#00ffff' }}>Voice:</span> {activeStatus.personality?.voice}</div>
                                                <div><span style={{ color: '#00ffff' }}>Agenda:</span> {activeStatus.personality?.agenda}</div>
                                            </div>

                                            <h5 style={{ color: '#888', marginTop: '1rem', marginBottom: '0.5rem' }}>Relationships</h5>
                                            <div style={{ background: '#000', padding: '1rem', border: '1px solid #222', borderRadius: '4px', fontSize: '0.85rem', maxHeight: '150px', overflowY: 'auto' }}>
                                                {activeStatus.relationships.length > 0 ? (
                                                    activeStatus.relationships.map(([playerId, data]: [string, any]) => (
                                                        <div key={playerId} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #111', paddingBottom: '0.25rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: '#fff' }}>{playerId}</span>
                                                                <span style={{ color: data.trust > 60 ? '#00ff00' : data.trust < 20 ? '#ff0000' : '#ffff00' }}>
                                                                    {data.status} ({data.trust})
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ color: '#444' }}>No relationships established.</div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                            <div>
                                                <h5 style={{ color: '#888', marginBottom: '0.5rem' }}>Recent Memory (Short Term)</h5>
                                                <div style={{ background: '#000', padding: '1rem', border: '1px solid #222', borderRadius: '4px', fontSize: '0.85rem', maxHeight: '300px', overflowY: 'auto' }}>
                                                    {activeStatus.memory?.shortTerm.length > 0 ? (
                                                        activeStatus.memory.shortTerm.map((m: any, i: number) => (
                                                            <div key={i} style={{ marginBottom: '0.8rem', borderLeft: '2px solid #00ffff', paddingLeft: '0.5rem', position: 'relative' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <div style={{ fontSize: '0.7rem', color: '#444' }}>{new Date(m.timestamp).toLocaleTimeString()}</div>
                                                                    <button
                                                                        onClick={() => deleteNPCMemory(editingNPC.id, i, 'short')}
                                                                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }}
                                                                        title="Delete Memory"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                                <div style={{ color: '#ccc' }}>{m.description}</div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ color: '#444' }}>No recent memories.</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h5 style={{ color: '#888', marginBottom: '0.5rem' }}>Important Memory (Long Term)</h5>
                                                <div style={{ background: '#000', padding: '1rem', border: '1px solid #222', borderRadius: '4px', fontSize: '0.85rem', maxHeight: '300px', overflowY: 'auto' }}>
                                                    {activeStatus.memory?.longTerm.length > 0 ? (
                                                        activeStatus.memory.longTerm.map((m: any, i: number) => (
                                                            <div key={i} style={{ marginBottom: '0.8rem', borderLeft: '2px solid #ff00ff', paddingLeft: '0.5rem', position: 'relative' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <div style={{ fontSize: '0.7rem', color: '#444' }}>{new Date(m.timestamp).toLocaleTimeString()}</div>
                                                                    <button
                                                                        onClick={() => deleteNPCMemory(editingNPC.id, i, 'long')}
                                                                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }}
                                                                        title="Delete Memory"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                                <div style={{ color: '#ccc' }}>{m.description}</div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ color: '#444' }}>No long-term memories.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn-reject"
                                onClick={() => setEditingNPC(null)}
                                style={{ padding: '0.5rem 1.5rem' }}
                            >
                                CANCEL
                            </button>
                            <button
                                className="btn-approve"
                                onClick={() => updateNPC(editingNPC.id, editingNPC)}
                                style={{ padding: '0.5rem 1.5rem' }}
                            >
                                SAVE CHANGES
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
