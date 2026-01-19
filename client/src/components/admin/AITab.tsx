import React from 'react';

interface AITabProps {
    innerThoughts: { timestamp: number, thought: string }[];
    npcStatus: any[];
}

export const AITab: React.FC<AITabProps> = ({ innerThoughts, npcStatus }) => {
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
                    <div className="card-header">
                        <h3 className="text-neon-green">ACTIVE NPC AGENTS</h3>
                        <span className="text-gray text-xs">Live personality and memory status</span>
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
                                </tr>
                            </thead>
                            <tbody>
                                {npcStatus.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#444' }}>No active NPC agents found in the world.</td>
                                    </tr>
                                )}
                                {npcStatus.map(npc => (
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
                                    </tr>
                                ))}
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
                        <div className="setting-row">
                            <label>Ambient Dialogue Frequency</label>
                            <input type="range" min="0" max="100" defaultValue="30" />
                            <span className="text-xs text-gray">30% chance per tick</span>
                        </div>
                        <div className="setting-row">
                            <label>LLM Context Window (Short-term)</label>
                            <input type="number" defaultValue="10" />
                            <span className="text-xs text-gray">Messages remembered</span>
                        </div>
                        <div className="setting-row">
                            <label>Relationship Decay Rate</label>
                            <input type="range" min="0" max="100" defaultValue="5" />
                            <span className="text-xs text-gray">5% per game day</span>
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
        </div>
    );
};
