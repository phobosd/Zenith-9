import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import './AuthOverlay.css';

interface AuthOverlayProps {
    socket: Socket;
    archetypes: string[];
    externalError?: string;
    connectionError?: string;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ socket, archetypes, externalError, connectionError }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedArchetype, setSelectedArchetype] = useState('');
    const [localError, setLocalError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (mode === 'login') {
            socket.emit('auth:login', { username, password });
        } else if (mode === 'register') {
            socket.emit('auth:register', { username, password, archetype: selectedArchetype });
        }
    };

    // Auto-switch to login on registration success
    React.useEffect(() => {
        if (externalError && externalError.includes('successful')) {
            setMode('login');
            setUsername('');
            setPassword('');
        }
    }, [externalError]);

    const displayError = connectionError || externalError || localError;

    return (
        <div className="auth-overlay">
            <div className="auth-window">
                <div className="auth-header">
                    <div className="auth-title">
                        {mode === 'login' && 'NEURAL-LINK LOGIN'}
                        {mode === 'register' && 'CITIZEN REGISTRATION'}
                    </div>
                    <div className="auth-status" style={{ color: connectionError ? '#ff0000' : undefined }}>
                        {connectionError ? 'CONNECTION OFFLINE' : 'ENCRYPTED CONNECTION'}
                    </div>
                </div>

                <form className="auth-content" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">CITIZEN NAME</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    {mode === 'register' && (
                        <div className="input-group">
                            <label htmlFor="archetype">ARCHETYPE</label>
                            <select
                                id="archetype"
                                value={selectedArchetype}
                                onChange={(e) => setSelectedArchetype(e.target.value)}
                                required
                            >
                                <option value="" disabled>SELECT ARCHETYPE</option>
                                {archetypes.map(a => (
                                    <option key={a} value={a}>
                                        {a.replace('_', ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            <div className="archetype-info">
                                {selectedArchetype === 'street_samurai' && "High physical prowess. Chrome and steel."}
                                {selectedArchetype === 'netrunner' && "Digital ghost. Master of the machine."}
                                {selectedArchetype === 'gutter_punk' && "Sprawl survivor. Street-smart and tough."}
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="password">PASS-KEY</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {displayError && <div className={`auth-error ${displayError.includes('successful') ? 'success' : ''}`}>{displayError}</div>}

                    <button type="submit" className="auth-submit" disabled={!!connectionError}>
                        {mode === 'login' && 'ESTABLISH LINK'}
                        {mode === 'register' && 'CREATE NEW CITIZEN'}
                    </button>
                </form>

                <div className="auth-footer">
                    {mode === 'login' && (
                        <span onClick={() => setMode('register')}>New here? Create New Citizen.</span>
                    )}
                    {mode === 'register' && (
                        <span onClick={() => setMode('login')}>Existing Citizen? Login here.</span>
                    )}
                </div>
            </div>
            <div className="auth-background-glitch"></div>
        </div>
    );
};
