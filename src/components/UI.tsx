import React, { useState } from 'react';
import type { BloomParams, CloudParams, GroundParams, WindParams, Stats } from '../types';

interface UIProps {
    stats: Stats;
    isMobile: boolean;
    bloomParams: BloomParams;
    setBloomParams: React.Dispatch<React.SetStateAction<BloomParams>>;
    cloudParams: CloudParams;
    setCloudParams: React.Dispatch<React.SetStateAction<CloudParams>>;
    ambientIntensity: number;
    setAmbientIntensity: React.Dispatch<React.SetStateAction<number>>;
    groundParams: GroundParams;
    setGroundParams: React.Dispatch<React.SetStateAction<GroundParams>>;
    windParams: WindParams;
    setWindParams: React.Dispatch<React.SetStateAction<WindParams>>;
}

const UI: React.FC<UIProps> = ({
    stats, isMobile, bloomParams, setBloomParams, cloudParams, setCloudParams, 
    ambientIntensity, setAmbientIntensity, groundParams, setGroundParams, windParams, setWindParams
}) => {
    const [showControls, setShowControls] = useState(true);

    // Add a simple effect to listen for the Tab key to toggle controls
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                setShowControls(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            {showControls && (
                <>
                    <div id="info">
                        <strong>Low Poly Procedural World</strong><br />
                        FPS: <span id="fps">{stats.fps}</span><br />
                        Position: <span id="position">{stats.position}</span><br />
                        Chunks: <span id="chunks">{stats.chunkCount}</span>
                    </div>
                    <div id="controls">
                        WASD - Move<br />
                        Mouse - Look<br />
                        Shift - Boost<br />
                        Space - Up<br />
                        Ctrl - Down<br/>
                        Tab - Toggle Panels
                    </div>
                    <div id="terrain-controls" className="controls-panel">
                        <strong>Terrain Controls</strong>
                        <div>
                            <label>Tex Scale</label>
                            <input type="range" min="1" max="100" step="1" value={groundParams.scale} onChange={(e) => setGroundParams(p => ({ ...p, scale: parseInt(e.target.value) }))} />
                            <span>{groundParams.scale}</span>
                        </div>
                         <div>
                            <label>Texture</label>
                            <input className="w-5 h-5 accent-sky-500" type="checkbox" checked={groundParams.showTexture} onChange={(e) => setGroundParams(p => ({ ...p, showTexture: e.target.checked }))} />
                            <div className="flex-grow"></div>
                            <span />
                        </div>
                        <div>
                            <label>Veg Density</label>
                            <input type="range" min="0" max="2" step="0.1" value={groundParams.vegetationDensity} onChange={(e) => setGroundParams(p => ({ ...p, vegetationDensity: parseFloat(e.target.value) }))} />
                            <span>{groundParams.vegetationDensity.toFixed(1)}</span>
                        </div>
                    </div>
                    <div id="cloud-controls" className="controls-panel">
                        <strong>Cloud Controls</strong>
                        <p className="text-xs text-gray-400 mt-1 mb-2">Note: High counts may impact performance.</p>
                        <div>
                            <label>Count</label>
                            <input type="range" min="0" max="1000" step="1" value={cloudParams.count} onChange={(e) => setCloudParams(p => ({ ...p, count: parseInt(e.target.value) }))} />
                            <span>{cloudParams.count}</span>
                        </div>
                        <div>
                            <label>Speed</label>
                            <input type="range" min="0" max="15" step="0.1" value={cloudParams.speed} onChange={(e) => setCloudParams(p => ({ ...p, speed: parseFloat(e.target.value) }))} />
                            <span>{cloudParams.speed.toFixed(1)}</span>
                        </div>
                    </div>
                    <div id="wind-controls" className="controls-panel">
                        <strong>Wind Controls</strong>
                        <div>
                            <label>Strength</label>
                            <input type="range" min="0" max="1" step="0.01" value={windParams.strength} onChange={(e) => setWindParams(p => ({ ...p, strength: parseFloat(e.target.value) }))} />
                            <span>{windParams.strength.toFixed(2)}</span>
                        </div>
                    </div>
                    <div id="bloom-controls" className="controls-panel">
                        <strong>Bloom & Light Controls</strong>
                        <div>
                            <label>Threshold</label>
                            <input type="range" min="0" max="1" step="0.01" value={bloomParams.threshold} onChange={(e) => setBloomParams(p => ({ ...p, threshold: parseFloat(e.target.value) }))} />
                            <span>{bloomParams.threshold.toFixed(2)}</span>
                        </div>
                        <div>
                            <label>Strength</label>
                            <input type="range" min="0" max="3" step="0.1" value={bloomParams.strength} onChange={(e) => setBloomParams(p => ({ ...p, strength: parseFloat(e.target.value) }))} />
                            <span>{bloomParams.strength.toFixed(1)}</span>
                        </div>
                        <div>
                            <label>Radius</label>
                            <input type="range" min="0" max="1" step="0.01" value={bloomParams.radius} onChange={(e) => setBloomParams(p => ({ ...p, radius: parseFloat(e.target.value) }))} />
                            <span>{bloomParams.radius.toFixed(2)}</span>
                        </div>
                        <div>
                            <label>Ambient</label>
                            <input type="range" min="0" max="2" step="0.1" value={ambientIntensity} onChange={(e) => setAmbientIntensity(parseFloat(e.target.value))} />
                            <span>{ambientIntensity.toFixed(1)}</span>
                        </div>
                    </div>
                </>
            )}
            {isMobile && (
                <>
                    <div id="joystick-container">
                        <div id="joystick-handle"></div>
                    </div>
                    <div id="action-buttons">
                        <div id="action-up" className="action-btn">▲</div>
                        <div id="action-down" className="action-btn">▼</div>
                        <div id="action-boost" className="action-btn">🚀</div>
                    </div>
                </>
            )}
        </>
    );
};

export default UI;