import React from 'react';
import { NPCEditModal } from './NPCEditModal';

interface NPCsTabProps {
    npcs: any[];
    npcStatus: any[];
    npcSearch: string;
    setNpcSearch: (search: string) => void;
    npcFilter: string | null;
    setNpcFilter: (filter: string | null) => void;
    editingNPC: any | null;
    setEditingNPC: (npc: any | null) => void;
    updateNPC: (id: string, updates: any) => void;
    deleteNPC: (id: string) => void;
    spawnRoamingNPC: (id: string) => void;
    generatePortrait: (id: string) => void;
    deleteNPCMemory: (npcId: string, index: number, type: 'short' | 'long') => void;
}

export const NPCsTab: React.FC<NPCsTabProps> = ({
    npcs, npcStatus, npcSearch, setNpcSearch, npcFilter, setNpcFilter,
    editingNPC, setEditingNPC, updateNPC, deleteNPC, spawnRoamingNPC, generatePortrait, deleteNPCMemory
}) => {
    return (
        <div className="admin-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>NPC Registry ({npcs.length})</h2>
                    <input
                        type="text"
                        placeholder="Search NPCs..."
                        value={npcSearch}
                        onChange={(e) => setNpcSearch(e.target.value)}
                        style={{
                            background: '#222',
                            border: '1px solid #444',
                            color: '#fff',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            width: '300px'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['vendor', 'guard', 'civilian', 'mob', 'boss', 'generated'].map(type => (
                        <button
                            key={type}
                            onClick={() => setNpcFilter(npcFilter === type ? null : type)}
                            style={{
                                padding: '0.3rem 0.8rem',
                                background: npcFilter === type ? '#00ffff' : '#222',
                                color: npcFilter === type ? '#000' : '#888',
                                border: '1px solid #444',
                                borderRadius: '15px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #333', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem', color: '#888', width: '50px' }}></th>
                            <th style={{ padding: '0.5rem', color: '#888' }}>ID</th>
                            <th style={{ padding: '0.5rem', color: '#888' }}>Name</th>
                            <th style={{ padding: '0.5rem', color: '#888' }}>Role</th>
                            <th style={{ padding: '0.5rem', color: '#888' }}>Faction</th>
                            <th style={{ padding: '0.5rem', color: '#888', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {npcs
                            .filter(npc => {
                                const matchesSearch = npc.name.toLowerCase().includes(npcSearch.toLowerCase()) || npc.id.toLowerCase().includes(npcSearch.toLowerCase());
                                const matchesFilter = npcFilter === 'generated'
                                    ? !!npc.generatedBy
                                    : npcFilter ? (npc.role || '').toLowerCase() === npcFilter.toLowerCase() : true;
                                return matchesSearch && matchesFilter;
                            })
                            .map(npc => (
                                <tr key={npc.id} style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '0.5rem' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '4px',
                                            background: '#000',
                                            border: '1px solid #333',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}>
                                            {npc.portrait ? (
                                                <img
                                                    src={npc.portrait}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{ fontSize: '0.6rem', color: '#333' }}>N/A</div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#666' }}>{npc.id}</td>
                                    <td style={{ padding: '0.5rem', color: '#fff' }}>{npc.name}</td>
                                    <td style={{ padding: '0.5rem', color: '#00ffff' }}>{npc.role}</td>
                                    <td style={{ padding: '0.5rem', color: '#ffd700' }}>{npc.faction || '-'}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => spawnRoamingNPC(npc.id)}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid #00ff00',
                                                color: '#00ff00',
                                                padding: '0.2rem 0.5rem',
                                                marginRight: '0.5rem',
                                                cursor: 'pointer',
                                                borderRadius: '3px'
                                            }}
                                            title="Spawn Roaming NPC"
                                        >
                                            ROAM
                                        </button>
                                        <button
                                            onClick={() => setEditingNPC(npc)}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid #444',
                                                color: '#fff',
                                                padding: '0.2rem 0.5rem',
                                                marginRight: '0.5rem',
                                                cursor: 'pointer',
                                                borderRadius: '3px'
                                            }}
                                        >
                                            EDIT
                                        </button>
                                        <button
                                            onClick={() => deleteNPC(npc.id)}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid #ff4444',
                                                color: '#ff4444',
                                                padding: '0.2rem 0.5rem',
                                                cursor: 'pointer',
                                                borderRadius: '3px'
                                            }}
                                        >
                                            DEL
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
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
