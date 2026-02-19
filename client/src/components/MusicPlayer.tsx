import React, { useEffect, useRef, useState } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const MusicPlayer: React.FC = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playlist, setPlaylist] = useState<string[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [initialVolume] = useState(0.3);

    // Fetch playlist on mount
    useEffect(() => {
        const fetchMusic = async () => {
            try {
                const response = await fetch(`${SERVER_URL}/api/music`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.tracks && Array.isArray(data.tracks)) {
                        // Map filenames to full server URLs
                        // The server serves ../client/public/assets at /assets
                        const tracks = data.tracks.map((filename: string) => `${SERVER_URL}/assets/music/${filename}`);
                        console.log('Music playlist loaded:', tracks);
                        setPlaylist(tracks);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch music playlist:', error);
            }
        };

        fetchMusic();
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.volume = initialVolume;
        }

        const handleInteraction = () => {
            if (!hasInteracted && audioRef.current && playlist.length > 0) {
                audioRef.current.play().catch(e => console.log("Audio play failed (waiting for interaction):", e));
                setHasInteracted(true);
            }
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, [hasInteracted, initialVolume, playlist]);

    // Handle track changes
    useEffect(() => {
        if (hasInteracted && audioRef.current && playlist.length > 0) {
            audioRef.current.src = playlist[currentTrackIndex];
            audioRef.current.play().catch(e => console.error("Failed to play track:", e));
        }
    }, [currentTrackIndex, playlist, hasInteracted]);

    const handleTrackEnd = () => {
        if (playlist.length > 0) {
            setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
        }
    };

    const handleNext = () => {
        if (playlist.length > 0) {
            setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
        }
    };

    const handlePrev = () => {
        if (playlist.length > 0) {
            setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    if (playlist.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '60px',
            right: '25px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '6px 10px',
            borderRadius: '4px',
            border: '1px solid #333',
            fontFamily: 'monospace',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}>
            <audio
                ref={audioRef}
                // Initial src is set by effect, but safety check here
                src={playlist.length > 0 ? playlist[currentTrackIndex] : undefined}
                onEnded={handleTrackEnd}
            />

            <button
                onClick={handlePrev}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f0',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 4px'
                }}
                title="Previous Track"
            >
                ⏮
            </button>

            <button
                onClick={toggleMute}
                style={{
                    background: 'none',
                    border: 'none',
                    color: isMuted ? '#666' : '#0f0',
                    cursor: 'pointer',
                    fontSize: '14px',
                    minWidth: '160px',
                    textAlign: 'center'
                }}
            >
                {isMuted ? '[🔇 MUTED]' : `[🔊 TRACK ${currentTrackIndex + 1}/${playlist.length}]`}
            </button>

            <button
                onClick={handleNext}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f0',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 4px'
                }}
                title="Next Track"
            >
                ⏭
            </button>
        </div>
    );
};
