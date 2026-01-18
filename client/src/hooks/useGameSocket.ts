import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TerminalLine } from '../components/TerminalLineItem';

const SOCKET_URL = 'http://localhost:3000';

export const useGameSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [lines, setLines] = useState<TerminalLine[]>([]);
    const [playerStats, setPlayerStats] = useState<any>(null);
    const [autocompleteData, setAutocompleteData] = useState<{
        spawnables: string[];
        roomObjects: string[];
        roomItems: string[];
        roomNPCs: string[];
        inventory: string[];
        containers: string[];
        equipped: string[];
        stats: string[];
        skills: string[];
        archetypes: string[];
    }>({ spawnables: [], roomObjects: [], roomItems: [], roomNPCs: [], inventory: [], containers: [], equipped: [], stats: [], skills: [], archetypes: [] });

    const [terminalData, setTerminalData] = useState<any>(null);
    const [guideContent, setGuideContent] = useState<string | null>(null);
    const [isMatrixMode, setIsMatrixMode] = useState(false);
    const [miniMapData, setMiniMapData] = useState<any>(null);

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('zenith_token'));
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('zenith_token'));
    const [hasCharacter, setHasCharacter] = useState(false);
    const [authError, setAuthError] = useState('');

    const addLine = useCallback((newLine: TerminalLine) => {
        setLines(prev => {
            const newLines = [...prev, newLine];
            if (newLines.length > 1000) {
                return newLines.slice(newLines.length - 1000);
            }
            return newLines;
        });
    }, []);

    const addSystemLine = useCallback((text: string) => {
        addLine({ id: Date.now().toString() + Math.random(), text, type: 'system' });
    }, [addLine]);

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            addSystemLine('Connected to Zenith-9 Server...');

            const savedToken = localStorage.getItem('zenith_token');
            if (savedToken) {
                newSocket.emit('auth:verify', { token: savedToken });
            }
        });

        newSocket.on('disconnect', () => {
            addSystemLine('Disconnected from server.');
            setIsAuthenticated(false);
        });

        // --- AUTH HANDLERS ---
        newSocket.on('auth:login_result', (result: any) => {
            console.log('Auth login result:', result);
            if (result.success) {
                setToken(result.token);
                setUser(result.user);
                setHasCharacter(result.hasCharacter);
                setIsAuthenticated(true);
                setAuthError('');
                localStorage.setItem('zenith_token', result.token);

                if (result.hasCharacter) {
                    newSocket.emit('game:start', { token: result.token });
                }
            } else {
                // If verification failed, clear everything so user can log in again
                setAuthError(result.message || 'Login failed');
                setIsAuthenticated(false);
                setToken(null);
                setUser(null);
                setHasCharacter(false);
                localStorage.removeItem('zenith_token');
            }
        });

        newSocket.on('auth:register_result', (result: any) => {
            console.log('Auth register result:', result);
            if (result.success) {
                setAuthError('');
                // Signal success to UI (handled via authError being empty? No, need explicit success)
                // We can reuse authError to send a success message if we want, or add a new state.
                // Let's use a specific event or state.
                // For now, let's just set a temporary success flag or message.
                setAuthError('Registration successful! Please login.');
                // Wait, authError is displayed as error. 
            } else {
                setAuthError(result.message || 'Registration failed');
            }
        });

        newSocket.on('char:create_result', (result: any) => {
            console.log('Char create result:', result);
            if (result.success) {
                setHasCharacter(true);
                setAuthError('');
                const savedToken = localStorage.getItem('zenith_token');
                if (savedToken) {
                    newSocket.emit('game:start', { token: savedToken });
                }
            } else {
                setAuthError(result.message || 'Character creation failed');
            }
        });

        newSocket.on('auth:logout', () => {
            console.log('Logout signal received from server.');
            localStorage.removeItem('zenith_token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setHasCharacter(false);
            addSystemLine('Neural link severed. Logged out safely.');
        });

        newSocket.on('message', (message: string | any) => {
            if (typeof message === 'string') {
                addSystemLine(message);
            } else {
                if (message.type === 'map' && message.payload) {
                    setMiniMapData(message.payload);
                    return;
                }
                addLine({
                    id: (message.timestamp || Date.now()).toString() + Math.random(),
                    text: message.content,
                    type: message.type,
                    data: message.payload
                });
            }
        });

        newSocket.on('autocomplete-data', (data: any) => {
            setAutocompleteData(prev => ({
                ...prev,
                spawnables: data.spawnables,
                stats: data.stats || [],
                skills: data.skills || [],
                archetypes: data.archetypes || []
            }));
        });

        newSocket.on('autocomplete-update', (data: any) => {
            if (data.type === 'room') {
                setAutocompleteData(prev => ({
                    ...prev,
                    roomObjects: data.objects || [],
                    roomItems: data.items || [],
                    roomNPCs: data.npcs || []
                }));
            } else if (data.type === 'inventory') {
                setAutocompleteData(prev => ({
                    ...prev,
                    inventory: data.items || [],
                    containers: data.containers || [],
                    equipped: data.equipped || []
                }));
            }
        });

        newSocket.on('stats-update', (data: any) => {
            console.log('Stats update received:', data);
            setPlayerStats(data);
            setHasCharacter(true); // Ensure overlay is gone if we have stats
        });

        newSocket.on('terminal-data', (data: any) => {
            setTerminalData(data);
        });

        newSocket.on('sheet-data', (data: any) => {
            addLine({ id: Date.now().toString(), text: '', type: 'sheet', data });
        });

        newSocket.on('score-data', (data: any) => {
            addLine({ id: Date.now().toString(), text: '', type: 'score', data });
        });

        newSocket.on('inventory-data', (data: any) => {
            addLine({ id: Date.now().toString(), text: '', type: 'inventory', data });
        });

        newSocket.on('open-guide', (data: { content: string }) => {
            setGuideContent(data.content);
        });

        newSocket.on('cyberspace-state', (data: { active: boolean }) => {
            setIsMatrixMode(data.active);
            newSocket.emit('command', 'map');
        });

        newSocket.on('position-update', () => {
            newSocket.emit('command', 'map');
        });

        return () => {
            newSocket.disconnect();
        };
    }, [addLine, addSystemLine]);

    return {
        socket,
        lines,
        playerStats,
        autocompleteData,
        terminalData,
        guideContent,
        isMatrixMode,
        miniMapData,
        isAuthenticated,
        user,
        token,
        hasCharacter,
        authError,
        addLine,
        addSystemLine,
        setTerminalData,
        setGuideContent
    };
};
