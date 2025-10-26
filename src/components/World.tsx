import React, { useRef, useEffect } from 'react';
import { usePlayerControls } from '../hooks/usePlayerControls';
import * as Assets from '../three/assets';
import * as Entities from '../three/entities';
import { loadCustomTreeModel } from '../three/customTree';
import { updateChunks, windUniforms, perlin, combinedNoise } from '../three/worldGenerator';
import type { BloomParams, CloudParams, GroundParams, WindParams, Stats } from '../types';

declare global {
    interface Window { THREE: any; }
}

interface WorldProps {
    setStats: React.Dispatch<React.SetStateAction<Stats>>;
    isMobile: boolean;
    bloomParams: BloomParams;
    cloudParams: CloudParams;
    ambientIntensity: number;
    groundParams: GroundParams;
    windParams: WindParams;
}

const World: React.FC<WorldProps> = ({ setStats, isMobile, bloomParams, cloudParams, ambientIntensity, groundParams, windParams }) => {
    const mountRef = useRef<HTMLDivElement>(null);

    // Use refs for state that changes in the animation loop to avoid re-renders
    const playerMove = usePlayerControls(mountRef);
    const bloomPassRef = useRef<any>(null);
    const waterRef = useRef<any>(null);
    const fishRef = useRef<any>({ data: [], mesh: null });
    const cloudRef = useRef<any>({ data: [], mesh: null });
    const ambientLightRef = useRef<any>(null);
    const groundTextureRef = useRef<any>(null);
    const terrainMaterialRef = useRef<any>(null);
    const chunksRef = useRef<any>({ chunks: new Map(), vegetationChunks: new Map(), bottomCaps: new Map() });
    const sceneRef = useRef<any>(null);

    // Create refs for props that are used inside the animation loop.
    // We update .current on each render, which is a safe way to pass
    // the latest props to the animation loop's closure.
    const windParamsRef = useRef(windParams);
    windParamsRef.current = windParams;
    const cloudParamsRef = useRef(cloudParams);
    cloudParamsRef.current = cloudParams;
    const groundParamsRef = useRef(groundParams);
    groundParamsRef.current = groundParams;
    
    // Effect for dynamically updating scene parameters from props
    useEffect(() => {
        if (bloomPassRef.current) {
            bloomPassRef.current.threshold = bloomParams.threshold;
            bloomPassRef.current.strength = bloomParams.strength;
            bloomPassRef.current.radius = bloomParams.radius;
        }
        if (ambientLightRef.current) {
            ambientLightRef.current.intensity = ambientIntensity;
        }
        if (groundTextureRef.current) {
            groundTextureRef.current.repeat.set(groundParams.scale, groundParams.scale);
        }
        if (terrainMaterialRef.current && groundTextureRef.current) {
            terrainMaterialRef.current.map = groundParams.showTexture ? groundTextureRef.current : null;
            terrainMaterialRef.current.needsUpdate = true;
        }
        if (cloudRef.current.mesh) {
            cloudRef.current.mesh.count = cloudParams.count;
        }
    }, [bloomParams, ambientIntensity, groundParams, cloudParams]);


    // Effect for regenerating vegetation when density changes
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (!chunksRef.current || !sceneRef.current) return;

        // Clear existing vegetation
        chunksRef.current.vegetationChunks.forEach((g: any) => {
            sceneRef.current.remove(g);
            g.traverse((o: any) => {
                if (o.isMesh && o.userData.isRock) {
                    o.geometry.dispose();
                    o.material.dispose();
                }
            });
        });
        chunksRef.current.vegetationChunks.clear();
        // The animation loop will regenerate the visible chunks with the new density
    }, [groundParams.vegetationDensity]);


    useEffect(() => {
        const THREE = window.THREE;
        if (!mountRef.current || !THREE) {
             console.error("Three.js not loaded or mount point not found");
            return;
        }
        
        Assets.initAssets();
        if (!Assets.isLoaded()) {
             console.error("Base geometries failed to initialize");
            return;
        }

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.Fog(0x87CEEB, 200, 800);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(25, 15, 25);
        const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x87CEEB);
        mountRef.current.appendChild(renderer.domElement);
        
        const composer = new THREE.EffectComposer(renderer);
        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);
        const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPassRef.current = bloomPass;
        composer.addPass(bloomPass);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        ambientLightRef.current = ambientLight;
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(100, 200, 100);
        directionalLight.castShadow = true;
        Object.assign(directionalLight.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 0.1, far: 500 });
        Object.assign(directionalLight.shadow.mapSize, { width: 2048, height: 2048 });
        scene.add(directionalLight);

        scene.add(Entities.createSun(directionalLight.position));
        
        const cloudEntities = Entities.createClouds(1000, 3000);
        cloudRef.current = { mesh: cloudEntities.mesh, data: cloudEntities.data };
        scene.add(cloudEntities.mesh);

        const water = Entities.createWater(scene, directionalLight.position);
        waterRef.current = water;
        scene.add(water);

        const fishEntities = Entities.createFish(50);
        fishRef.current = { mesh: fishEntities.mesh, data: fishEntities.data };
        scene.add(fishEntities.mesh);

        // Load Custom Tree Model
        loadCustomTreeModel().then(model => {
            console.log("Custom tree model loaded and textured:", model);

            // Place the model directly in front of the camera's initial position
            const treePosition = new THREE.Vector3(25, 0, 5);
            treePosition.y = combinedNoise(treePosition.x, treePosition.z);
            
            model.position.copy(treePosition);
            
            // The original model has a very large scale. Reduce it significantly.
            model.scale.set(0.04, 0.04, 0.04);
            
            scene.add(model);
        }).catch(placeholder => {
            console.error("Failed to load custom tree model, adding placeholder.");
            const treePosition = new THREE.Vector3(25, 0, 5);
            treePosition.y = combinedNoise(treePosition.x, treePosition.z) + 1; // Elevate placeholder slightly
            placeholder.position.copy(treePosition);
            placeholder.scale.set(5, 5, 5);
            scene.add(placeholder);
        });

        const terrainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
        terrainMaterialRef.current = terrainMaterial;
        new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg', (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            groundTextureRef.current = texture;
            terrainMaterial.map = texture;
            terrainMaterial.needsUpdate = true;
            texture.repeat.set(6, 6);
        });
        
        let frame = 0, last = performance.now();
        let animationFrameId: number;

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            const now = performance.now();
            const timeSeconds = now * 0.001;
            const { lookVec, speed } = playerMove.current;
            
            camera.lookAt(camera.position.clone().add(lookVec));
            const dir = new THREE.Vector3();
            if (playerMove.current.forward) dir.add(lookVec.clone().setY(0).normalize());
            if (playerMove.current.backward) dir.sub(lookVec.clone().setY(0).normalize());
            const sideVec = new THREE.Vector3().crossVectors(lookVec, camera.up).setY(0).normalize();
            if (playerMove.current.left) dir.sub(sideVec);
            if (playerMove.current.right) dir.add(sideVec);
            if (playerMove.current.up) dir.y += 1;
            if (playerMove.current.down) dir.y -= 1;
            camera.position.add(dir.normalize().multiplyScalar(speed));

            updateChunks(camera, scene, terrainMaterial, chunksRef.current, groundParamsRef.current);
            
            if (waterRef.current) waterRef.current.material.uniforms['time'].value += 1.0 / 60.0;

            windUniforms.uTime.value = timeSeconds;
            
            // Read from refs to get the latest prop values inside the animation loop.
            const baseStrength = windParamsRef.current.strength;
            windUniforms.uWindStrength.value = baseStrength * (0.8 + perlin.noise(timeSeconds * 0.1, 0) * 0.2);

            Entities.animateClouds(cloudRef.current, cloudParamsRef.current.speed);
            Entities.animateFish(fishRef.current);
            
            frame++;
            if (now - last >= 1000) {
                setStats({
                    fps: frame,
                    position: `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`,
                    chunkCount: chunksRef.current.chunks.size
                });
                frame = 0;
                last = now;
            }
            composer.render();
        }

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        updateChunks(camera, scene, terrainMaterial, chunksRef.current, groundParams);
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            // Add comprehensive cleanup
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                     if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            terrainMaterial.dispose();
            groundTextureRef.current?.dispose();
            Assets.disposeAll();
            renderer.dispose();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={mountRef} className="w-full h-full" />;
};

export default World;