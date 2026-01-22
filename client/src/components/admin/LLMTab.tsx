import React from 'react';
import type { LLMProfile, LLMRole } from '../AdminDashboard';

interface LLMTabProps {
    llmProfiles: Record<string, LLMProfile>;
    addLlmProfile: () => void;
    updateLlmProfile: (id: string, field: string, value: any) => void;
    toggleRole: (profileId: string, role: LLMRole) => void;
    removeLlmProfile: (id: string) => void;
    finops?: {
        totalRequests: number;
        totalPromptTokens: number;
        totalCompletionTokens: number;
        requestsPerSecond: number;
        uptimeSeconds: number;
        projectedMonthlyCosts: Record<string, number>;
    };
}

export const LLMTab: React.FC<LLMTabProps> = ({ llmProfiles, addLlmProfile, updateLlmProfile, toggleRole, removeLlmProfile, finops }) => {
    const [showModelModal, setShowModelModal] = React.useState<string | null>(null);
    const [availableModels, setAvailableModels] = React.useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = React.useState(false);

    const handleDiscover = async (profileId: string) => {
        setIsLoadingModels(true);
        setShowModelModal(profileId);
        setAvailableModels([]);
        try {
            const res = await fetch(`http://localhost:3000/api/llm/models/${profileId}`);
            const data = await res.json();
            if (data.models && Array.isArray(data.models)) {
                setAvailableModels(data.models);
            } else {
                alert('No models found or invalid response.');
            }
        } catch (e) {
            alert('Failed to fetch models. Check server logs.');
        } finally {
            setIsLoadingModels(false);
        }
    };

    return (
        <div className="admin-card" style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* FinOps Tracker Section */}
            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0, 255, 255, 0.05)', border: '1px solid rgba(0, 255, 255, 0.2)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, color: '#00ffff', textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}>FinOps Tracker</h2>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        Uptime: {Math.floor((finops?.uptimeSeconds || 0) / 3600)}h {Math.floor(((finops?.uptimeSeconds || 0) % 3600) / 60)}m
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="stat-box" style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', borderLeft: '3px solid #00ffff' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Requests / Second</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(finops?.requestsPerSecond || 0).toFixed(3)}</div>
                    </div>
                    <div className="stat-box" style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', borderLeft: '3px solid #00ffff' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Total Requests</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{finops?.totalRequests || 0}</div>
                    </div>
                    <div className="stat-box" style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px', borderLeft: '3px solid #00ffff' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Total Tokens</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {((finops?.totalPromptTokens || 0) + (finops?.totalCompletionTokens || 0)).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#666' }}>
                            In: {(finops?.totalPromptTokens || 0).toLocaleString()} | Out: {(finops?.totalCompletionTokens || 0).toLocaleString()}
                        </div>
                    </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#aaa' }}>Projected Monthly Costs (Provider Comparison)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                    {finops && Object.entries(finops.projectedMonthlyCosts).sort((a, b) => a[1] - b[1]).map(([name, cost]) => (
                        <div key={name} style={{
                            padding: '0.5rem',
                            background: name.includes('5090') ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255,255,255,0.05)',
                            border: name.includes('5090') ? '1px solid rgba(0, 255, 0, 0.3)' : '1px solid transparent',
                            borderRadius: '4px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: '#888' }}>{name}</div>
                            <div style={{
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                color: cost === 0 ? '#44ff44' : (cost > 100 ? '#ff4444' : '#ffffff')
                            }}>
                                ${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    ))}
                </div>
                {!finops && <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>Waiting for usage data...</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>LLM Configuration</h2>
                <button className="action-btn" onClick={addLlmProfile}>ADD PROFILE</button>
            </div>

            <div className="llm-profiles-list">
                {Object.values(llmProfiles).map(profile => (
                    <div key={profile.id} className="llm-profile-card">
                        <div className="profile-header">
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => updateLlmProfile(profile.id, 'name', e.target.value)}
                                className="profile-name-input"
                                placeholder="Profile Name"
                            />
                            <button className="btn-delete-icon" title="Remove Profile" onClick={() => removeLlmProfile(profile.id)}>×</button>
                        </div>

                        <div className="profile-body">
                            <div className="setting-row">
                                <label>Provider</label>
                                <select
                                    value={profile.provider}
                                    onChange={(e) => updateLlmProfile(profile.id, 'provider', e.target.value)}
                                >
                                    <option value="local">Local (LM Studio/Ollama)</option>
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="pollinations">Pollinations.ai</option>
                                    <option value="stable-diffusion">Stable Diffusion (A1111)</option>
                                </select>
                            </div>

                            <div className="setting-row">
                                <label>Model ID</label>
                                <input
                                    type="text"
                                    value={profile.model}
                                    onChange={(e) => updateLlmProfile(profile.id, 'model', e.target.value)}
                                    placeholder="e.g. gemma-2b"
                                />
                            </div>

                            <div className="setting-row setting-row-full">
                                <label>Base URL</label>
                                <input
                                    type="text"
                                    value={profile.baseUrl}
                                    onChange={(e) => updateLlmProfile(profile.id, 'baseUrl', e.target.value)}
                                    placeholder="http://localhost:1234/v1"
                                />
                            </div>

                            <div className="setting-row setting-row-full">
                                <label>API Key</label>
                                <input
                                    type="password"
                                    value={profile.apiKey || ''}
                                    onChange={(e) => updateLlmProfile(profile.id, 'apiKey', e.target.value)}
                                    placeholder="Optional for local"
                                />
                            </div>

                            <div className="roles-section">
                                <label>Assigned Roles</label>
                                <div className="roles-tags" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {(['CREATIVE', 'LOGIC', 'IMAGE', 'DEFAULT'] as LLMRole[]).map(role => (
                                        <span
                                            key={role}
                                            className={`role-tag ${profile.roles.includes(role) ? 'role-active' : ''}`}
                                            onClick={() => toggleRole(profile.id, role)}
                                        >
                                            {role}
                                        </span>
                                    ))}
                                    {(profile.provider === 'stable-diffusion' || profile.provider === 'local' || profile.provider === 'openai' || profile.provider === 'gemini') && (
                                        <button
                                            className="action-btn"
                                            onClick={() => handleDiscover(profile.id)}
                                            title="Discover available models"
                                            style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '4px 8px' }}
                                        >
                                            DISCOVER
                                        </button>
                                    )}
                                </div>
                            </div>

                            {profile.provider === 'pollinations' && (
                                <div className="setting-row setting-row-full" style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                                    <label>Usage & Balance</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <button
                                            className="action-btn small"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`http://localhost:3000/api/llm/balance/${profile.id}`);
                                                    const data = await res.json();
                                                    alert(JSON.stringify(data, null, 2));
                                                } catch (e) {
                                                    alert('Failed to check balance');
                                                }
                                            }}
                                        >
                                            Check Balance
                                        </button>
                                        <span style={{ fontSize: '0.8em', color: '#888' }}>
                                            (Requires valid API Key)
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Model Selection Modal */}
            {showModelModal && (
                <div className="modal-overlay" onClick={() => setShowModelModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <h3>Select Model</h3>
                        {isLoadingModels ? (
                            <p>Loading models...</p>
                        ) : (
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {availableModels.length === 0 ? (
                                    <p>No models found.</p>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {availableModels.map(model => (
                                            <li
                                                key={model}
                                                style={{
                                                    padding: '8px',
                                                    borderBottom: '1px solid #333',
                                                    cursor: 'pointer',
                                                    background: '#1a1a1a'
                                                }}
                                                className="model-item"
                                                onClick={() => {
                                                    updateLlmProfile(showModelModal, 'model', model);
                                                    setShowModelModal(null);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
                                            >
                                                {model}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                        <button className="action-btn" style={{ marginTop: '1rem' }} onClick={() => setShowModelModal(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};
