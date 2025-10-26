import React, { useState } from 'react';
import World from './src/components/World';
import UI from './src/components/UI';
import type { BloomParams, CloudParams, GroundParams, WindParams, Stats } from './src/types';

const App: React.FC = () => {
    const [stats, setStats] = useState<Stats>({ fps: 0, position: '0, 0, 0', chunkCount: 0 });
    const [isMobile] = useState(() => window.innerWidth <= 768);

    const [bloomParams, setBloomParams] = useState<BloomParams>({ threshold: 0.97, strength: 3.0, radius: 1.0 });
    const [cloudParams, setCloudParams] = useState<CloudParams>({ count: 1000, speed: 1.0 });
    const [ambientIntensity, setAmbientIntensity] = useState(0.6);
    const [groundParams, setGroundParams] = useState<GroundParams>({ scale: 6, showTexture: true, vegetationDensity: 1.0 });
    const [windParams, setWindParams] = useState<WindParams>({ strength: 0.2 });

    const worldProps = {
        setStats, isMobile, bloomParams, cloudParams, ambientIntensity, groundParams, windParams
    };
    
    const uiProps = {
        stats, isMobile, bloomParams, setBloomParams, cloudParams, setCloudParams, ambientIntensity, setAmbientIntensity, groundParams, setGroundParams, windParams, setWindParams
    };

    return (
        <div className="w-screen h-screen relative">
            <World {...worldProps} />
            <UI {...uiProps} />
        </div>
    );
};

export default App;