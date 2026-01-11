import React, { useEffect, useState } from 'react';

const RAT_ASCII = [
    "      ,▄▄▄▄▄,",
    "  ,▄▀▀▀     ▀▀▄,",
    " ▐▀  ▄▄     ▄▄ ▀▌",
    " ▐  ▐██▌   ▐██▌ ▌",
    "  ▌  ▀▀     ▀▀  ▐",
    "  █,   ▄▄▄▄▄   ,█",
    "   ▀▄ ▀▀▀▀▀▀▀ ▄▀",
    "     ▀▀▄▄▄▄▄▀▀",
    "      ▄▀   ▀▄",
    "     ▐       ▌",
    "    ,█       █,",
    "   ,█         █,",
    "   █           █"
];

export const GiantRatPortrait: React.FC = () => {
    const [eyeBrightness, setEyeBrightness] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setEyeBrightness(prev => {
                if (prev >= 1) return 0.5;
                return 1;
            });
        }, 1000); // Blink every second

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            lineHeight: '1.2',
            color: '#888', // Grey body
            textShadow: '0 0 5px rgba(100, 100, 100, 0.5)'
        }}>
            {RAT_ASCII.map((line, i) => {
                // Eye rows are roughly 2 and 3 (0-indexed)
                // " ▐  ▐██▌   ▐██▌ ▌" is line 3
                if (i === 3) {
                    const leftEyeStart = line.indexOf("▐██▌");
                    const rightEyeStart = line.lastIndexOf("▐██▌");

                    if (leftEyeStart !== -1 && rightEyeStart !== -1) {
                        const pre = line.substring(0, leftEyeStart);
                        const leftEye = line.substring(leftEyeStart, leftEyeStart + 4);
                        const mid = line.substring(leftEyeStart + 4, rightEyeStart);
                        const rightEye = line.substring(rightEyeStart, rightEyeStart + 4);
                        const post = line.substring(rightEyeStart + 4);

                        return (
                            <div key={i}>
                                {pre}
                                <span style={{
                                    color: '#0f0',
                                    textShadow: `0 0 10px rgba(0, 255, 0, ${eyeBrightness})`,
                                    transition: 'text-shadow 0.5s ease-in-out'
                                }}>{leftEye}</span>
                                {mid}
                                <span style={{
                                    color: '#0f0',
                                    textShadow: `0 0 10px rgba(0, 255, 0, ${eyeBrightness})`,
                                    transition: 'text-shadow 0.5s ease-in-out'
                                }}>{rightEye}</span>
                                {post}
                            </div>
                        );
                    }
                }
                return <div key={i}>{line}</div>;
            })}
        </div>
    );
};
