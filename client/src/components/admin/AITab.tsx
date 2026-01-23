import React from 'react';
import { NPCEditModal } from './NPCEditModal';

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
                                                <div style={{ color: '#888', fontSize: '0.7rem' }}>{npc.memory?.longTerm.length || 0} rumors/intel</div>
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
                <NPCEditModal
                    npc={editingNPC}
                    onClose={() => setEditingNPC(null)}
                    onSave={updateNPC}
                    onGeneratePortrait={generatePortrait}
                    onDeleteMemory={deleteNPCMemory}
                    npcStatus={npcStatus}
                />
            )}
        </div>
    );
};
