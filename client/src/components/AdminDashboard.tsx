import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// Types (mirrored from server)
interface LogEntry {
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    context?: any;
}

interface Proposal {
    id: string;
    type: string;
    status: string;
    payload: any;
    flavor?: { rationale?: string };
}

interface PersonalityTrait {
    value: number;
    enabled: boolean;
}

type LLMRole = 'CREATIVE' | 'LOGIC' | 'DEFAULT';

interface LLMProfile {
    id: string;
    name: string;
    provider: 'local' | 'gemini' | 'openai';
    baseUrl: string;
    apiKey?: string;
    model: string;
    roles: LLMRole[];
}

interface DirectorStatus {
    paused: boolean;
    personality: {
        chaos: PersonalityTrait;
        aggression: PersonalityTrait;
        expansion: PersonalityTrait;
    };
    guardrails?: {
        budgets: Record<string, number>;
        features: {
            requireHumanApproval: boolean;
            autoSnapshotHighRisk: boolean;
            enableNPCs: boolean;
            enableItems: boolean;
            enableQuests: boolean;
            enableExpansions: boolean;
            restrictedToGlitchArea: boolean;
        };
        llmProfiles: Record<string, LLMProfile>;
    };
    proposals: Proposal[];
    glitchConfig: {
        mobCount: number;
        itemCount: number;
        legendaryChance: number;
    };
}

const BUDGET_TOOLTIPS: Record<string, string> = {
    maxWeaponDamage: "Maximum damage value any generated weapon can have.",
    maxArmorDefense: "Maximum defense value any generated armor can have.",
    maxGoldDrop: "Maximum amount of credits an NPC or container can drop.",
    maxItemValue: "Maximum market value for any generated item.",
    maxNPCHealth: "Maximum health points for any generated NPC.",
    maxNPCAttack: "Maximum base attack value for any generated NPC.",
    maxNPCDefense: "Maximum base defense value for any generated NPC.",
    maxQuestXPReward: "Maximum experience points awarded for completing a generated quest."
};

type AdminTab = 'director' | 'approvals' | 'snapshots' | 'llm' | 'logs' | 'world' | 'items' | 'npcs' | 'glitch';

export const AdminDashboard: React.FC = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>('director');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [paused, setPaused] = useState(true);

    // Personality State
    const [chaos, setChaos] = useState<PersonalityTrait>({ value: 0.2, enabled: true });
    const [aggression, setAggression] = useState<PersonalityTrait>({ value: 0.3, enabled: true });
    const [expansion, setExpansion] = useState<PersonalityTrait>({ value: 0.1, enabled: true });

    // Glitch Door State
    const [glitchConfig, setGlitchConfig] = useState({
        mobCount: 5,
        itemCount: 5,
        legendaryChance: 0.05
    });

    // Guardrails State
    const [requireApproval, setRequireApproval] = useState(true);
    const [autoSnapshot, setAutoSnapshot] = useState(true);
    const [enableNPCs, setEnableNPCs] = useState(true);
    const [enableItems, setEnableItems] = useState(true);
    const [enableQuests, setEnableQuests] = useState(true);
    const [enableExpansions, setEnableExpansions] = useState(true);
    const [restrictedToGlitchArea, setRestrictedToGlitchArea] = useState(false);
    const [budgets, setBudgets] = useState<Record<string, number>>({});
    const [llmProfiles, setLlmProfiles] = useState<Record<string, LLMProfile>>({});

    // Snapshot State
    const [snapshots, setSnapshots] = useState<string[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'delete', id: string, step: number } | null>(null);
    const [generatedChunks, setGeneratedChunks] = useState<string[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [npcs, setNpcs] = useState<any[]>([]);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editingNPC, setEditingNPC] = useState<any | null>(null);
    const [itemFilter, setItemFilter] = useState<string | null>(null);
    const [npcFilter, setNpcFilter] = useState<string | null>(null);
    const [mapDeleteMode, setMapDeleteMode] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [npcSearch, setNpcSearch] = useState('');

    useEffect(() => {
        const newSocket = io('http://localhost:3000/admin', {
            transports: ['websocket']
        });

        newSocket.on('connect', () => {
            console.log('Connected to Admin Stream');
            addLog('success', 'Connected to World Director');
            newSocket.emit('snapshot:list');
            newSocket.emit('snapshot:list');
            newSocket.emit('director:get_chunks');
            newSocket.emit('director:get_items');
            newSocket.emit('director:get_npcs');
        });

        newSocket.on('director:log', (entry: LogEntry) => {
            addLog(entry.level, entry.message, entry.context);
        });

        newSocket.on('director:status', (status: DirectorStatus) => {
            setPaused(status.paused);
            if (status.personality) {
                setChaos(status.personality.chaos);
                setAggression(status.personality.aggression);
                setExpansion(status.personality.expansion);
            }
            if (status.guardrails) {
                setRequireApproval(status.guardrails.features.requireHumanApproval);
                setAutoSnapshot(status.guardrails.features.autoSnapshotHighRisk);
                setEnableNPCs(status.guardrails.features.enableNPCs);
                setEnableItems(status.guardrails.features.enableItems);
                setEnableQuests(status.guardrails.features.enableQuests);
                setEnableExpansions(status.guardrails.features.enableExpansions);
                setRestrictedToGlitchArea(status.guardrails.features.restrictedToGlitchArea);
                setBudgets(status.guardrails.budgets);
                if (status.guardrails.llmProfiles) {
                    setLlmProfiles(status.guardrails.llmProfiles);
                }
            }
            if (status.proposals) {
                setProposals(status.proposals);
            }
            if (status.glitchConfig) {
                setGlitchConfig(status.glitchConfig);
            }
        });

        newSocket.on('director:proposals_update', (list: Proposal[]) => {
            setProposals(list);
        });

        newSocket.on('snapshot:list_update', (list: string[]) => {
            setSnapshots(list);
        });

        newSocket.on('director:chunks_update', (list: string[]) => {
            setGeneratedChunks(list);
        });

        newSocket.on('director:items_update', (list: any[]) => {
            setItems(list);
        });

        newSocket.on('director:npcs_update', (list: any[]) => {
            setNpcs(list);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const addLog = (level: LogEntry['level'], message: string, context?: any) => {
        setLogs(prev => [{ timestamp: Date.now(), level, message, context }, ...prev].slice(0, 500));
    };

    const togglePause = () => {
        if (!socket) return;
        const newState = !paused;
        setPaused(newState);
        socket.emit(newState ? 'director:pause' : 'director:resume');
        addLog('warn', newState ? 'EMERGENCY STOP ACTIVATED' : 'Resuming Automation...');
    };

    const updatePersonality = (key: string, update: Partial<PersonalityTrait>) => {
        if (!socket) return;
        socket.emit('director:update_personality', { [key]: update });
    };

    const updateGuardrail = (update: any) => {
        if (!socket) return;
        socket.emit('director:update_guardrail', update);
    };

    const approveProposal = (id: string) => {
        socket?.emit('director:approve_proposal', id);
    };

    const rejectProposal = (id: string) => {
        socket?.emit('director:reject_proposal', id);
    };

    const triggerManualGen = (type: string) => {
        if (!socket) return;
        socket.emit('director:manual_trigger', { type });
        addLog('info', `Manual trigger sent: ${type}`);
    };

    const createSnapshot = () => {
        if (!socket) return;
        const name = prompt('Enter snapshot name (optional):');
        socket.emit('snapshot:create', name);
    };

    const handleSnapshotAction = (type: 'restore' | 'delete', id: string) => {
        if (confirmAction?.id === id && confirmAction?.type === type && confirmAction?.step === 2) {
            if (type === 'restore') socket?.emit('snapshot:restore', id);
            if (type === 'delete') socket?.emit('snapshot:delete', id);
            setConfirmAction(null);
        } else if (confirmAction?.id === id && confirmAction?.type === type && confirmAction?.step === 1) {
            setConfirmAction({ type, id, step: 2 });
        } else {
            setConfirmAction({ type, id, step: 1 });
        }
    };

    const editBudget = (key: string, current: number) => {
        const val = prompt(`Enter new value for ${key.replace('max', '')}:`, current.toString());
        if (val !== null) {
            const num = parseInt(val);
            if (!isNaN(num)) {
                updateGuardrail({ budgets: { [key]: num } });
            }
        }
    };

    const addLlmProfile = () => {
        const id = `profile_${Math.random().toString(36).substring(7)}`;
        const newProfile: LLMProfile = {
            id,
            name: 'New Profile',
            provider: 'local',
            baseUrl: 'http://localhost:1234/v1',
            model: 'llama-3-8b-instruct',
            roles: []
        };
        updateGuardrail({ llmProfiles: { ...llmProfiles, [id]: newProfile } });
    };

    const removeLlmProfile = (id: string) => {
        const newProfiles = { ...llmProfiles };
        delete newProfiles[id];
        updateGuardrail({ llmProfiles: newProfiles });
    };

    const updateLlmProfile = (id: string, field: string, value: any) => {
        const newProfiles = { ...llmProfiles };
        newProfiles[id] = { ...newProfiles[id], [field]: value };
        updateGuardrail({ llmProfiles: newProfiles });
    };

    const toggleRole = (profileId: string, role: LLMRole) => {
        const profile = llmProfiles[profileId];
        let newRoles = [...profile.roles];
        if (newRoles.includes(role)) {
            newRoles = newRoles.filter(r => r !== role);
        } else {
            newRoles.push(role);
        }
        updateLlmProfile(profileId, 'roles', newRoles);
    };

    const generateChunk = (x: number, y: number) => {
        if (!socket) return;
        if (mapDeleteMode) {
            if (generatedChunks.includes(`${x},${y}`)) {
                if (confirm(`Delete chunk ${x},${y}? This will reset it.`)) {
                    socket.emit('director:delete_chunk', { x, y });
                }
            }
            return;
        }
        if (generatedChunks.includes(`${x},${y}`)) return;
        socket.emit('director:generate_chunk', { x, y });
    };

    const deleteItem = (id: string) => {
        if (confirm(`Are you sure you want to delete item: ${id}?`)) {
            socket?.emit('director:delete_item', id);
        }
    };

    const updateItem = (id: string, updates: any) => {
        socket?.emit('director:update_item', { id, updates });
        setEditingItem(null);
    };

    const deleteNPC = (id: string) => {
        if (confirm(`Are you sure you want to delete NPC: ${id}?`)) {
            socket?.emit('director:delete_npc', id);
        }
    };

    const updateNPC = (id: string, updates: any) => {
        socket?.emit('director:update_npc', { id, updates });
        setEditingNPC(null);
    };

    return (
        <div className="admin-container">
            {/* Confirmation Overlay */}
            {confirmAction && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <div className="confirm-title">
                            {confirmAction.step === 1 ? 'ARE YOU SURE?' : 'FINAL WARNING!'}
                        </div>
                        <div className="confirm-msg">
                            {confirmAction.type === 'restore'
                                ? `Restoring snapshot "${confirmAction.id}" will WIPE all current game state. This cannot be undone.`
                                : `Deleting snapshot "${confirmAction.id}" will permanently remove this backup.`
                            }
                            <br /><br />
                            {confirmAction.step === 2 && <strong>THIS IS THE LAST CHANCE TO CANCEL.</strong>}
                        </div>
                        <div className="confirm-btns">
                            <button className="confirm-btn confirm-btn-yes" onClick={() => handleSnapshotAction(confirmAction.type, confirmAction.id)}>
                                {confirmAction.step === 1 ? 'YES, PROCEED' : 'I AM ABSOLUTELY SURE'}
                            </button>
                            <button className="confirm-btn confirm-btn-no" onClick={() => setConfirmAction(null)}>CANCEL</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="admin-header">
                <h1 className="text-neon-blue">Ouroboro World Director</h1>
                <div className="status-indicator">
                    <div className={`dot ${socket?.connected ? 'dot-online' : 'dot-offline'}`} />
                    <span>{socket?.connected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-container">
                <button className={`tab-btn ${activeTab === 'director' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('director')}>DIRECTOR</button>
                <button className={`tab-btn ${activeTab === 'approvals' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('approvals')}>
                    APPROVALS {proposals.length > 0 && <span style={{ color: '#ffcc00' }}>({proposals.length})</span>}
                </button>
                <button className={`tab-btn ${activeTab === 'world' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('world')}>WORLD MAP</button>
                <button className={`tab-btn ${activeTab === 'items' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('items')}>ITEMS</button>
                <button className={`tab-btn ${activeTab === 'npcs' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('npcs')}>NPCS</button>
                <button className={`tab-btn ${activeTab === 'glitch' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('glitch')}>GLITCH DOOR</button>
                <button className={`tab-btn ${activeTab === 'snapshots' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('snapshots')}>SNAPSHOTS</button>
                <button className={`tab-btn ${activeTab === 'llm' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('llm')}>LLM</button>
                <button className={`tab-btn ${activeTab === 'logs' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('logs')}>LOGS</button>
            </div>

            {/* Tab Content */}
            {activeTab === 'glitch' && (
                <div className="admin-grid">
                    <div className="admin-card">
                        <h2 style={{ marginBottom: '1.5rem' }}>Glitch Door Configuration</h2>
                        <p style={{ marginBottom: '1.5rem', color: '#888' }}>
                            Configure the parameters for the procedural dungeon generation triggered by the Glitch Door.
                            Changes are applied immediately for the next run.
                        </p>

                        <div className="setting-row">
                            <label>Mob Count: <span className="text-neon-blue">{glitchConfig.mobCount}</span></label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={glitchConfig.mobCount}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setGlitchConfig(prev => ({ ...prev, mobCount: val }));
                                    socket?.emit('director:update_glitch_config', { mobCount: val });
                                }}
                            />
                        </div>

                        <div className="setting-row">
                            <label>Item Count: <span className="text-neon-blue">{glitchConfig.itemCount}</span></label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={glitchConfig.itemCount}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setGlitchConfig(prev => ({ ...prev, itemCount: val }));
                                    socket?.emit('director:update_glitch_config', { itemCount: val });
                                }}
                            />
                        </div>

                        <div className="setting-row">
                            <label>Legendary Chance: <span className="text-neon-purple">{(glitchConfig.legendaryChance * 100).toFixed(0)}%</span></label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={glitchConfig.legendaryChance * 100}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) / 100;
                                    setGlitchConfig(prev => ({ ...prev, legendaryChance: val }));
                                    socket?.emit('director:update_glitch_config', { legendaryChance: val });
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'director' && (
                <div className="admin-grid">
                    {/* Master Control */}
                    <div className="admin-card master-control-card">
                        <h2 style={{ marginBottom: '1rem' }}>Master Control</h2>
                        <button
                            onClick={togglePause}
                            className={`stop-go-btn ${paused ? 'btn-resume' : 'btn-stop'}`}
                        >
                            {paused ? 'RESUME' : 'STOP'}
                        </button>
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>
                            {paused ? 'System Halted. Safe to edit.' : 'System Active. Monitoring...'}
                        </p>
                    </div>

                    {/* Personality Sliders */}
                    <div className="admin-card">
                        <h2 style={{ marginBottom: '1.5rem' }}>Director Personality</h2>
                        <div className="slider-group">
                            <Slider
                                label="Chaos"
                                value={chaos.value}
                                enabled={chaos.enabled}
                                onToggle={(e: boolean) => updatePersonality('chaos', { enabled: e })}
                                onChange={(v: number) => updatePersonality('chaos', { value: v })}
                                color="text-neon-purple"
                                tooltip="Controls randomness. High Chaos triggers frequent anomalies, bizarre NPC behavior, and unexpected world shifts."
                            />
                            <Slider
                                label="Aggression"
                                value={aggression.value}
                                enabled={aggression.enabled}
                                onToggle={(e: boolean) => updatePersonality('aggression', { enabled: e })}
                                onChange={(v: number) => updatePersonality('aggression', { value: v })}
                                color="text-neon-green"
                                tooltip="Controls combat difficulty. High Aggression spawns elite mobs, triggers frequent invasions, and increases boss lethality."
                            />
                            <Slider
                                label="Expansion"
                                value={expansion.value}
                                enabled={expansion.enabled}
                                onToggle={(e: boolean) => updatePersonality('expansion', { enabled: e })}
                                onChange={(v: number) => updatePersonality('expansion', { value: v })}
                                color="text-neon-blue"
                                tooltip="Controls growth speed. High Expansion rapidly constructs new streets, buildings, and dungeons based on player activity."
                            />
                        </div>
                    </div>

                    {/* Manual Actions */}
                    <div className="admin-card">
                        <div className="slider-row">
                            <h2 style={{ marginBottom: '1rem' }}>Manual Actions</h2>
                            <div className="tooltip-icon" style={{ marginLeft: '0.5rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                                </svg>
                                <div className="tooltip-popup">Force the Director to generate specific content immediately. These bypass the normal autonomous cycle.</div>
                            </div>
                        </div>
                        <div className="action-btn-group">
                            <button className="action-btn" onClick={() => triggerManualGen('NPC')}>Generate NPC</button>
                            <button className="action-btn" style={{ borderColor: '#ff4444', color: '#ff4444' }} onClick={() => triggerManualGen('MOB')}>Generate Mob</button>
                            <button className="action-btn" onClick={() => triggerManualGen('ITEM')}>Generate Item</button>
                            <button className="action-btn" onClick={() => triggerManualGen('QUEST')}>Generate Quest</button>
                            <button className="action-btn" onClick={() => triggerManualGen('WORLD_EXPANSION')}>Generate Room</button>
                        </div>
                    </div>

                    {/* Autonomous Toggles */}
                    <div className="admin-card">
                        <h2 style={{ marginBottom: '1rem' }}>Autonomous Toggles</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <ToggleRow label="NPCs" checked={enableNPCs} onChange={(e: boolean) => updateGuardrail({ enableNPCs: e })} tooltip="Enable/Disable autonomous NPC generation." />
                            <ToggleRow label="Items" checked={enableItems} onChange={(e: boolean) => updateGuardrail({ enableItems: e })} tooltip="Enable/Disable autonomous Item generation." />
                            <ToggleRow label="Quests" checked={enableQuests} onChange={(e: boolean) => updateGuardrail({ enableQuests: e })} tooltip="Enable/Disable autonomous Quest generation." />
                            <ToggleRow label="Expansions" checked={enableExpansions} onChange={(e: boolean) => updateGuardrail({ enableExpansions: e })} tooltip="Enable/Disable autonomous World Expansion." />
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            <ToggleRow label="Restrict to Glitch Area" checked={restrictedToGlitchArea} onChange={(e: boolean) => updateGuardrail({ restrictedToGlitchArea: e })} tooltip="If enabled, the Director will only generate content within the designated Glitch Door regions." />
                        </div>
                    </div>

                    {/* Safety Features (Guardrails) */}
                    <div className="admin-card">
                        <h2 style={{ marginBottom: '1.5rem' }}>Safety Features</h2>
                        <ToggleRow label="Require Approval" checked={requireApproval} onChange={(e: boolean) => updateGuardrail({ requireHumanApproval: e })} tooltip="If enabled, the Director will wait for your manual approval before publishing any generated content." />
                        <ToggleRow label="Auto-Snapshot" checked={autoSnapshot} onChange={(e: boolean) => updateGuardrail({ autoSnapshotHighRisk: e })} tooltip="If enabled, the system will automatically create a snapshot before performing high-risk operations like world expansion." />
                    </div>

                    {/* Global Budgets (Guardrails) */}
                    <div className="admin-card">
                        <h2 style={{ marginBottom: '1.5rem' }}>Global Budgets (Click to Edit)</h2>
                        <div className="budget-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                            {Object.entries(budgets).map(([key, val]) => (
                                <div key={key} className="budget-item" style={{ position: 'relative', cursor: 'pointer', padding: '0.75rem', background: '#1a1a1a', borderRadius: '4px' }} onClick={() => editBudget(key, val)}>
                                    <div className="slider-row">
                                        <span className="budget-label">{key.replace('max', '')}</span>
                                        <div className="tooltip-icon" style={{ marginLeft: '0.2rem' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                                            </svg>
                                            <div className="tooltip-popup">{BUDGET_TOOLTIPS[key] || "Maximum limit for this parameter."}</div>
                                        </div>
                                    </div>
                                    <span className="budget-value" style={{ fontSize: '1rem' }}>{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'world' && (
                <div className="admin-card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 style={{ marginBottom: '1rem' }}>World Expansion Map</h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <p style={{ color: '#888', margin: 0 }}>
                            {mapDeleteMode
                                ? <span style={{ color: '#ff4444' }}>DELETE MODE: Click a green cell to delete/reset it.</span>
                                : "Click on a grid cell to generate a new 20x20 chunk. Green cells are already generated."
                            }
                        </p>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={mapDeleteMode}
                                onChange={(e) => setMapDeleteMode(e.target.checked)}
                            />
                            <span style={{ color: mapDeleteMode ? '#ff4444' : '#fff' }}>Delete Mode</span>
                        </label>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(11, 40px)',
                        gap: '4px',
                        background: '#111',
                        padding: '1rem',
                        borderRadius: '8px'
                    }}>
                        {/* Generate a 11x11 grid centered on 0,0 (from -5 to +5) */}
                        {Array.from({ length: 11 * 11 }).map((_, i) => {
                            const x = (i % 11) - 5;
                            const y = Math.floor(i / 11) - 5;
                            const isGenerated = generatedChunks.includes(`${x},${y}`);
                            const isCenter = x === 0 && y === 0;

                            return (
                                <div
                                    key={`${x},${y}`}
                                    onClick={() => generateChunk(x, y)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        background: isGenerated ? '#00ff0033' : '#333',
                                        border: isCenter ? '2px solid #fff' : '1px solid #444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.6rem',
                                        color: isGenerated ? '#00ff00' : '#666',
                                        cursor: isGenerated ? 'default' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    title={`Chunk ${x},${y}`}
                                >
                                    {x},{y}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'items' && (
                <div className="admin-card" style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0 }}>Item Registry ({items.length})</h2>
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
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
                            {['item', 'ammo', 'armor', 'container', 'cyberware', 'consumable'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setItemFilter(itemFilter === type ? null : type)}
                                    style={{
                                        padding: '0.3rem 0.8rem',
                                        background: itemFilter === type ? '#00ffff' : '#222',
                                        color: itemFilter === type ? '#000' : '#888',
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
                    <div className="log-content" style={{
                        overflowY: 'auto',
                        flex: 1,
                        maxHeight: 'calc(100vh - 220px)',
                        paddingRight: '10px'
                    }}>
                        {editingItem ? (
                            <div className="edit-form-container" style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>Editing Item: {editingItem.id}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn-approve" onClick={() => updateItem(editingItem.id, editingItem)}>SAVE CHANGES</button>
                                        <button className="btn-reject" onClick={() => setEditingItem(null)}>CANCEL</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Name</label>
                                        <input
                                            type="text"
                                            value={editingItem.name}
                                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                            style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Description</label>
                                        <textarea
                                            value={editingItem.description}
                                            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                            style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem', minHeight: '80px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Cost</label>
                                            <input
                                                type="number"
                                                value={editingItem.cost}
                                                onChange={(e) => setEditingItem({ ...editingItem, cost: parseInt(e.target.value) })}
                                                style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Weight</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={editingItem.weight}
                                                onChange={(e) => setEditingItem({ ...editingItem, weight: parseFloat(e.target.value) })}
                                                style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Rarity</label>
                                            <select
                                                value={editingItem.rarity || 'common'}
                                                onChange={(e) => setEditingItem({ ...editingItem, rarity: e.target.value })}
                                                style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                            >
                                                <option value="common">Common</option>
                                                <option value="uncommon">Uncommon</option>
                                                <option value="rare">Rare</option>
                                                <option value="epic">Epic</option>
                                                <option value="legendary">Legendary</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Type Specific Fields */}
                                    {editingItem.type === 'weapon' && (
                                        <div style={{ padding: '1rem', background: '#222', borderRadius: '4px' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#ff4444' }}>Weapon Stats</h4>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Damage</label>
                                                    <input
                                                        type="number"
                                                        value={editingItem.extraData?.damage || 0}
                                                        onChange={(e) => setEditingItem({
                                                            ...editingItem,
                                                            extraData: { ...editingItem.extraData, damage: parseInt(e.target.value) }
                                                        })}
                                                        style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.5rem' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Range</label>
                                                    <input
                                                        type="number"
                                                        value={editingItem.extraData?.range || 0}
                                                        onChange={(e) => setEditingItem({
                                                            ...editingItem,
                                                            extraData: { ...editingItem.extraData, range: parseInt(e.target.value) }
                                                        })}
                                                        style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.5rem' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {editingItem.type === 'armor' && (
                                        <div style={{ padding: '1rem', background: '#222', borderRadius: '4px' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#4444ff' }}>Armor Stats</h4>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Defense</label>
                                                    <input
                                                        type="number"
                                                        value={editingItem.extraData?.defense || 0}
                                                        onChange={(e) => setEditingItem({
                                                            ...editingItem,
                                                            extraData: { ...editingItem.extraData, defense: parseInt(e.target.value) }
                                                        })}
                                                        style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.5rem' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Penalty</label>
                                                    <input
                                                        type="number"
                                                        value={editingItem.extraData?.penalty || 0}
                                                        onChange={(e) => setEditingItem({
                                                            ...editingItem,
                                                            extraData: { ...editingItem.extraData, penalty: parseInt(e.target.value) }
                                                        })}
                                                        style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.5rem' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #444', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem' }}>ID</th>
                                        <th style={{ padding: '0.75rem' }}>Name</th>
                                        <th style={{ padding: '0.75rem' }}>Type</th>
                                        <th style={{ padding: '0.75rem' }}>Stats</th>
                                        <th style={{ padding: '0.75rem' }}>Cost</th>
                                        <th style={{ padding: '0.75rem' }}>Rarity</th>
                                        <th style={{ padding: '0.75rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.filter(item => {
                                        if (itemFilter && item.type !== itemFilter) return false;
                                        if (!itemSearch) return true;
                                        const search = itemSearch.toLowerCase();
                                        const str = JSON.stringify(item).toLowerCase();
                                        return str.includes(search);
                                    }).map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '0.75rem', color: '#666' }}>{item.id}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.description?.substring(0, 50)}...</div>
                                            </td>
                                            <td style={{ padding: '0.75rem', color: '#00ffff' }}>{item.type}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {item.type === 'weapon' && item.extraData && (
                                                    <div style={{ fontSize: '0.85rem', color: '#ff4444' }}>
                                                        DMG: {item.extraData.damage} | RNG: {item.extraData.range}
                                                    </div>
                                                )}
                                                {item.type === 'armor' && item.extraData && (
                                                    <div style={{ fontSize: '0.85rem', color: '#4444ff' }}>
                                                        DEF: {item.extraData.defense} | PEN: {item.extraData.penalty}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem', color: '#ffcc00' }}>{item.cost}</td>
                                            <td style={{ padding: '0.75rem', textTransform: 'capitalize', color: item.rarity === 'legendary' ? '#ffaa00' : item.rarity === 'epic' ? '#a335ee' : item.rarity === 'rare' ? '#0070dd' : item.rarity === 'uncommon' ? '#1eff00' : '#9d9d9d' }}>
                                                {item.rarity || 'Common'}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn-approve" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setEditingItem(item)}>EDIT</button>
                                                    <button className="btn-reject" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => deleteItem(item.id)}>DEL</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'npcs' && (
                <div className="admin-card" style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {['neutral', 'aggressive'].map(behavior => (
                                <button
                                    key={behavior}
                                    onClick={() => setNpcFilter(npcFilter === behavior ? null : behavior)}
                                    style={{
                                        padding: '0.3rem 0.8rem',
                                        background: npcFilter === behavior ? (behavior === 'aggressive' ? '#ff4444' : '#fff') : '#222',
                                        color: npcFilter === behavior ? '#000' : (behavior === 'aggressive' ? '#ff4444' : '#fff'),
                                        border: '1px solid #444',
                                        borderRadius: '15px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {behavior}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="log-content" style={{
                        overflowY: 'auto',
                        flex: 1,
                        maxHeight: 'calc(100vh - 220px)',
                        paddingRight: '10px'
                    }}>
                        {editingNPC ? (
                            <div className="edit-form-container" style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>Editing NPC: {editingNPC.id}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn-approve" onClick={() => updateNPC(editingNPC.id, editingNPC)}>SAVE CHANGES</button>
                                        <button className="btn-reject" onClick={() => setEditingNPC(null)}>CANCEL</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gap: '1rem' }}>
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
                                    <div>
                                        <label style={{ display: 'block', color: '#888', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Faction</label>
                                        <input
                                            type="text"
                                            value={editingNPC.faction || ''}
                                            onChange={(e) => setEditingNPC({ ...editingNPC, faction: e.target.value })}
                                            style={{ width: '100%', background: '#222', border: '1px solid #444', color: '#fff', padding: '0.5rem' }}
                                        />
                                    </div>

                                    <div style={{ padding: '1rem', background: '#222', borderRadius: '4px' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Combat Stats</h4>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', color: '#ff4444', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Health</label>
                                                <input
                                                    type="number"
                                                    value={editingNPC.stats?.health || 0}
                                                    onChange={(e) => setEditingNPC({
                                                        ...editingNPC,
                                                        stats: { ...editingNPC.stats, health: parseInt(e.target.value) }
                                                    })}
                                                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.5rem' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', color: '#44ff44', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Attack</label>
                                                <input
                                                    type="number"
                                                    value={editingNPC.stats?.attack || 0}
                                                    onChange={(e) => setEditingNPC({
                                                        ...editingNPC,
                                                        stats: { ...editingNPC.stats, attack: parseInt(e.target.value) }
                                                    })}
                                                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.5rem' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', color: '#4444ff', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Defense</label>
                                                <input
                                                    type="number"
                                                    value={editingNPC.stats?.defense || 0}
                                                    onChange={(e) => setEditingNPC({
                                                        ...editingNPC,
                                                        stats: { ...editingNPC.stats, defense: parseInt(e.target.value) }
                                                    })}
                                                    style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '0.5rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #444', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem' }}>ID</th>
                                        <th style={{ padding: '0.75rem' }}>Name</th>
                                        <th style={{ padding: '0.75rem' }}>Faction</th>
                                        <th style={{ padding: '0.75rem' }}>Behavior</th>
                                        <th style={{ padding: '0.75rem' }}>Stats</th>
                                        <th style={{ padding: '0.75rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {npcs.filter(npc => {
                                        if (npcFilter && (npc.behavior || 'neutral') !== npcFilter) return false;
                                        if (!npcSearch) return true;
                                        const search = npcSearch.toLowerCase();
                                        const str = JSON.stringify(npc).toLowerCase();
                                        return str.includes(search);
                                    }).map(npc => (
                                        <tr key={npc.id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '0.75rem', color: '#666' }}>{npc.id}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ fontWeight: 'bold' }}>{npc.name}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#888' }}>{npc.description?.substring(0, 50)}...</div>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>{npc.faction || 'Neutral'}</td>
                                            <td style={{ padding: '0.75rem', color: npc.behavior === 'aggressive' ? '#ff4444' : '#fff' }}>
                                                {npc.behavior || 'neutral'}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {npc.stats && (
                                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                        <span style={{ color: '#ff4444' }}>HP:{npc.stats.health}</span>
                                                        <span style={{ color: '#44ff44' }}>ATK:{npc.stats.attack}</span>
                                                        <span style={{ color: '#4444ff' }}>DEF:{npc.stats.defense}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn-approve" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setEditingNPC(npc)}>EDIT</button>
                                                    <button className="btn-reject" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => deleteNPC(npc.id)}>DEL</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'approvals' && (
                <div className="admin-card" style={{ minHeight: '400px' }}>
                    <div className="log-header" style={{ background: 'transparent', padding: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span>Pending Proposals</span>
                            <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '1rem' }}>{proposals.length} items waiting for review</span>
                        </div>
                    </div>
                    <div className="log-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {proposals.length === 0 ? (
                            <div className="empty-state">No pending proposals.</div>
                        ) : (
                            proposals.map(p => (
                                <div key={p.id} className="proposal-card">
                                    <div className="proposal-header">
                                        <span className={`proposal-type type-${p.type.toLowerCase()}`}>{p.type}</span>
                                        <span style={{ fontSize: '0.7rem', color: '#555' }}>{p.id}</span>
                                    </div>
                                    <div className="proposal-body">
                                        <strong>{p.payload.name || p.payload.title}</strong>
                                        <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                                            {p.flavor?.rationale || "No rationale provided."}
                                        </p>

                                        {/* Stats Display */}
                                        <div className="proposal-stats" style={{ marginTop: '1rem', padding: '0.5rem', background: '#111', borderRadius: '4px', fontSize: '0.8rem' }}>
                                            {p.type === 'NPC' && p.payload.stats && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                                    <div style={{ color: '#ff4444' }}>HP: {p.payload.stats.health}</div>
                                                    <div style={{ color: '#44ff44' }}>ATK: {p.payload.stats.attack}</div>
                                                    <div style={{ color: '#4444ff' }}>DEF: {p.payload.stats.defense}</div>
                                                    <div style={{ color: '#888', gridColumn: 'span 3', marginTop: '0.25rem' }}>
                                                        Behavior: <span style={{ color: p.payload.behavior === 'aggressive' ? '#ff4444' : '#fff', fontWeight: p.payload.behavior === 'aggressive' ? 'bold' : 'normal' }}>{p.payload.behavior || 'neutral'}</span>
                                                    </div>
                                                    <div style={{ color: '#888', gridColumn: 'span 3' }}>
                                                        Roaming: <span style={{ color: p.payload.canMove ? '#44ff44' : '#ff4444' }}>{p.payload.canMove ? 'ENABLED' : 'DISABLED'}</span>
                                                    </div>
                                                    <div style={{ color: '#888', gridColumn: 'span 3' }}>
                                                        Dialogue: <span style={{ color: '#00ffff' }}>{p.payload.dialogue?.length || 0} barks generated</span>
                                                    </div>
                                                </div>
                                            )}
                                            {p.type === 'ITEM' && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <div style={{ color: '#888', gridColumn: 'span 2' }}>Type: <span style={{ color: '#00ffff' }}>{p.payload.type}</span></div>
                                                    {p.payload.attributes?.slot && <div style={{ color: '#888', gridColumn: 'span 2' }}>Slot: <span style={{ color: '#fff' }}>{p.payload.attributes.slot}</span></div>}

                                                    {p.payload.attributes?.damage > 0 && <div style={{ color: '#ff4444' }}>Damage: {p.payload.attributes.damage}</div>}
                                                    {p.payload.attributes?.defense > 0 && <div style={{ color: '#44ff44' }}>Defense: {p.payload.attributes.defense}</div>}

                                                    {p.payload.attributes?.modifiers && Object.entries(p.payload.attributes.modifiers).map(([k, v]) => (
                                                        <div key={k} style={{ color: '#00ffff', gridColumn: 'span 2' }}>{k}: {v as any}</div>
                                                    ))}

                                                    <div style={{ color: '#ffcc00', marginTop: '0.25rem' }}>Cost: {p.payload.cost}</div>
                                                    <div style={{ color: '#888', marginTop: '0.25rem' }}>Rarity: {p.payload.rarity}</div>
                                                    <div style={{ color: '#888' }}>Weight: {p.payload.weight}kg</div>
                                                </div>
                                            )}
                                            {p.type === 'QUEST' && p.payload.rewards && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <div style={{ color: '#ffcc00' }}>Credits: {p.payload.rewards.gold}</div>
                                                    <div style={{ color: '#00ffff' }}>XP: {p.payload.rewards.xp}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="proposal-btns">
                                        <button className="btn-approve" onClick={() => approveProposal(p.id)}>Approve</button>
                                        <button className="btn-reject" onClick={() => rejectProposal(p.id)}>Reject</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'snapshots' && (
                <div className="admin-card" style={{ minHeight: '400px' }}>
                    <div className="slider-row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>Snapshot Utility</h2>
                        <button className="action-btn action-btn-primary" style={{ padding: '0.4rem 1rem' }} onClick={createSnapshot}>Create New Snapshot</button>
                    </div>
                    <div className="snapshot-list" style={{ maxHeight: 'none' }}>
                        {snapshots.length === 0 ? (
                            <div className="empty-state">No snapshots found.</div>
                        ) : (
                            snapshots.map(id => (
                                <div key={id} className="snapshot-item">
                                    <div className="snapshot-info">
                                        <span className="snapshot-name">{id.split('_').slice(1).join('_')}</span>
                                        <span className="snapshot-date">{id.split('_')[0]}</span>
                                    </div>
                                    <div className="snapshot-actions">
                                        <button className="snap-btn snap-btn-restore" onClick={() => handleSnapshotAction('restore', id)}>Restore</button>
                                        <button className="snap-btn snap-btn-delete" onClick={() => handleSnapshotAction('delete', id)}>Delete</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'llm' && (
                <div className="admin-card" style={{ minHeight: '400px' }}>
                    <div className="slider-row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>LLM Routing Profiles</h2>
                        <button className="action-btn action-btn-primary" onClick={addLlmProfile}>+ Add Profile</button>
                    </div>

                    <div className="llm-profiles-list" style={{ display: 'grid', gap: '2rem' }}>
                        {Object.values(llmProfiles).length === 0 ? (
                            <div className="empty-state">No LLM profiles configured. The system will use hardcoded defaults.</div>
                        ) : (
                            Object.values(llmProfiles).map(profile => (
                                <div key={profile.id} className="llm-profile-card" style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
                                    <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                        <input
                                            type="text"
                                            value={profile.name}
                                            onChange={(e) => updateLlmProfile(profile.id, 'name', e.target.value)}
                                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #444', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', width: '60%' }}
                                        />
                                        <button className="btn-reject" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => removeLlmProfile(profile.id)}>Remove</button>
                                    </div>

                                    <div className="llm-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div className="config-item">
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.8rem' }}>Provider</label>
                                            <select
                                                value={profile.provider}
                                                onChange={(e) => updateLlmProfile(profile.id, 'provider', e.target.value)}
                                                style={{ width: '100%', padding: '0.6rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '4px' }}
                                            >
                                                <option value="local">Local (LM Studio / Ollama)</option>
                                                <option value="gemini">Google Gemini</option>
                                                <option value="openai">OpenAI</option>
                                            </select>
                                        </div>
                                        <div className="config-item">
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.8rem' }}>Model Name</label>
                                            <input
                                                type="text"
                                                value={profile.model}
                                                onChange={(e) => updateLlmProfile(profile.id, 'model', e.target.value)}
                                                placeholder="llama-3-8b-instruct"
                                                style={{ width: '100%', padding: '0.6rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '4px' }}
                                            />
                                        </div>
                                        <div className="config-item">
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.8rem' }}>Base URL</label>
                                            <input
                                                type="text"
                                                value={profile.baseUrl}
                                                onChange={(e) => updateLlmProfile(profile.id, 'baseUrl', e.target.value)}
                                                placeholder="http://localhost:1234/v1"
                                                style={{ width: '100%', padding: '0.6rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '4px' }}
                                            />
                                        </div>
                                        <div className="config-item">
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.8rem' }}>API Key</label>
                                            <input
                                                type="password"
                                                value={profile.apiKey || ''}
                                                onChange={(e) => updateLlmProfile(profile.id, 'apiKey', e.target.value)}
                                                placeholder="sk-..."
                                                style={{ width: '100%', padding: '0.6rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '4px' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="roles-section" style={{ marginTop: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.75rem', color: '#888', fontSize: '0.8rem' }}>Assigned Roles</label>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            {(['DEFAULT', 'CREATIVE', 'LOGIC'] as LLMRole[]).map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => toggleRole(profile.id, role)}
                                                    className={`role-chip ${profile.roles.includes(role) ? 'role-chip-active' : ''}`}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '20px',
                                                        fontSize: '0.7rem',
                                                        border: '1px solid #444',
                                                        background: profile.roles.includes(role) ? '#00ffff22' : 'transparent',
                                                        color: profile.roles.includes(role) ? '#00ffff' : '#888',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="admin-card" style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
                    <div className="log-header" style={{ background: 'transparent', padding: '0 0 1rem 0' }}>Live System Stream</div>
                    <div className="log-content" style={{ flex: 1, overflowY: 'auto' }}>
                        {logs.map((log, i) => (
                            <div key={i} className="log-entry">
                                <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className={`log-msg-${log.level}`}>{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ToggleRow = ({ label, checked, onChange, tooltip }: { label: string, checked: boolean, onChange: (v: boolean) => void, tooltip: string }) => (
    <div className="toggle-row" style={{ position: 'relative' }}>
        <div className="slider-row">
            <span>{label}</span>
            <div className="tooltip-icon" style={{ marginLeft: '0.5rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                </svg>
                <div className="tooltip-popup">{tooltip}</div>
            </div>
        </div>
        <label className="switch">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <span className="slider-toggle"></span>
        </label>
    </div>
);

const Slider = ({ label, value, enabled, onToggle, onChange, color, tooltip }: { label: string, value: number, enabled: boolean, onToggle: (v: boolean) => void, onChange: (v: number) => void, color: string, tooltip: string }) => (
    <div className="slider-row">
        <div className="slider-label">
            <span className={enabled ? color : ''} style={{ color: enabled ? undefined : '#444' }}>{label}</span>
            <div className="tooltip-popup">{tooltip}</div>
        </div>
        <div className="tooltip-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
        </div>
        <label className="switch" style={{ marginRight: '1rem' }}>
            <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
            <span className="slider-toggle"></span>
        </label>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={value}
            disabled={!enabled}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="slider-input"
            style={{ opacity: enabled ? 1 : 0.3 }}
        />
        <span className="slider-value" style={{ opacity: enabled ? 1 : 0.3 }}>{Math.round(value * 100)}%</span>
    </div>
);
