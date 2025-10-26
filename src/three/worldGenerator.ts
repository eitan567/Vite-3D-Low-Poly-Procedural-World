import * as Assets from './assets';
export const windUniforms = Assets.windUniforms;

declare global {
    interface Window { THREE: any; }
}
const { THREE } = window;

/* ---------------  World Constants & Config  ----------------- */
const CHUNK_SIZE = 50;
const RENDER_DISTANCE = 4;

/* ---------------  Perlin Noise  ----------------- */
export const perlin = (() => {
    const p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t: number, a: number, b: number) => a + t * (b - a);
    const grad = (hash: number, x: number, y: number, z: number) => {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };
    return {
        noise: (x: number, y: number, z: number = 0) => {
            const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
            x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
            const u = fade(x), v = fade(y), w = fade(z);
            const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
            const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
            return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))), lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
        }
    };
})();

/* ---------------  Terrain Generation  ----------------- */
export function combinedNoise(x: number, z: number) {
    let base = 0, detail = 0, ridged = 0;
    let freq = 0.008, amp = 30;
    for(let i=0; i < 4; i++) { base += perlin.noise(x * freq, z * freq) * amp; amp *= 0.5; freq *= 2; }
    freq = 0.05; amp = 4;
    for(let i=0; i < 3; i++) { detail += perlin.noise(x * freq, z * freq) * amp; amp *= 0.5; freq *= 2; }
    freq = 0.02; amp = 15;
    for (let i = 0; i < 4; i++) { let n = 1.0 - Math.abs(perlin.noise(x * freq, z * freq)); ridged += n * amp; amp *= 0.5; freq *= 2; }
    const blendFactor = (perlin.noise(x * 0.003, z * 0.003) + 1) / 2;
    return base + detail + (ridged * Math.pow(blendFactor, 2));
}

const getNormalAt = (x: number, z: number) => {
    const e = 0.01;
    const df_dx = (combinedNoise(x + e, z) - combinedNoise(x - e, z)) / (2 * e);
    const df_dz = (combinedNoise(x, z + e) - combinedNoise(x, z - e)) / (2 * e);
    return new THREE.Vector3(-df_dx, 1, -df_dz).normalize();
};

const SAND_COLOR = { r: 0.9, g: 0.8, b: 0.5 }, LUSH_GRASS_COLOR = { r: 0.1, g: 0.4, b: 0.05 }, DRY_GRASS_COLOR = { r: 0.4, g: 0.5, b: 0.1 }, FOREST_FLOOR_COLOR = { r: 0.2, g: 0.3, b: 0.1 }, ROCK_COLOR = { r: 0.5, g: 0.45, b: 0.4 }, SNOW_COLOR = { r: 0.95, g: 0.95, b: 1.0 };
const lerpColor = (c1: any, c2: any, f: number) => ({ r: c1.r + (c2.r - c1.r) * f, g: c1.g + (c2.g - c1.g) * f, b: c1.b + (c2.b - c1.b) * f });

const getColor = (height: number, worldX: number, worldZ: number, normalY: number) => {
    const moisture = (perlin.noise(worldX * 0.005 + 50, worldZ * 0.005 + 50) + 1) / 2;
    const rockinessNoise = (perlin.noise(worldX * 0.05, worldZ * 0.05) + 1) / 2;
    const colorTintNoise = perlin.noise(worldX * 0.008, worldZ * 0.008);
    const grassColor = lerpColor(DRY_GRASS_COLOR, LUSH_GRASS_COLOR, moisture);
    let finalColor;
    if (height < 3) finalColor = SAND_COLOR;
    else if (height < 25) finalColor = lerpColor(grassColor, FOREST_FLOOR_COLOR, (height - 3) / 22);
    else if (height < 40) finalColor = lerpColor(FOREST_FLOOR_COLOR, ROCK_COLOR, (height - 25) / 15);
    else if (height < 55) finalColor = lerpColor(ROCK_COLOR, SNOW_COLOR, (height - 40) / 15);
    else finalColor = SNOW_COLOR;
    const slopeFactor = 1.0 - Math.min(1.0, normalY * 1.75); 
    finalColor = lerpColor(finalColor, ROCK_COLOR, Math.pow(slopeFactor, 2.0) + rockinessNoise * 0.2);
    if (colorTintNoise > 0) { finalColor.r += colorTintNoise * 0.08; finalColor.g += colorTintNoise * 0.04; } 
    else { finalColor.b -= colorTintNoise * 0.05; }
    const brightness = 0.9 + (perlin.noise(worldX * 0.08, worldZ * 0.08) + 1) / 2 * 0.2;
    const clamp = (v: number) => Math.max(0.0, Math.min(1.0, v));
    return [clamp(finalColor.r * brightness), clamp(finalColor.g * brightness), clamp(finalColor.b * brightness)];
};

function createTerrainChunk(chunkX: number, chunkZ: number) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [], colors: number[] = [], normals: number[] = [], uvs: number[] = [], indices = [];
    const resolution = 25, step = CHUNK_SIZE / resolution;
    for (let rz = 0; rz <= resolution; rz++) {
        for (let rx = 0; rx <= resolution; rx++) {
            const localX = rx * step, localZ = rz * step;
            const worldX = chunkX * CHUNK_SIZE + localX, worldZ = chunkZ * CHUNK_SIZE + localZ;
            const height = combinedNoise(worldX, worldZ);
            vertices.push(localX, height, localZ);
            const normal = getNormalAt(worldX, worldZ);
            normals.push(normal.x, normal.y, normal.z);
            colors.push(...getColor(height, worldX, worldZ, normal.y));
            uvs.push(rx / resolution, rz / resolution);
        }
    }
    for (let rz = 0; rz < resolution; rz++) {
        for (let rx = 0; rx < resolution; rx++) {
            const a = rx + (resolution + 1) * rz, b = rx + (resolution + 1) * (rz + 1), c = (rx + 1) + (resolution + 1) * rz, d = (rx + 1) + (resolution + 1) * (rz + 1);
            indices.push(a, b, c, b, d, c);
        }
    }
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geometry;
}

function createBottomCap(chunkX: number, chunkZ: number){
    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE), new THREE.MeshLambertMaterial({ color: 0x3a2e21 }));
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.set(chunkX * CHUNK_SIZE + CHUNK_SIZE / 2, -6, chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2);
    bottom.receiveShadow = true;
    return bottom;
}

/* ---------------  Vegetation Generation  ----------------- */
const pseudoRandom = (seed: number) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

function createRock() {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 0), new THREE.MeshLambertMaterial({ color: 0x696969 }));
    rock.position.y = 0.8; rock.castShadow = true;
    rock.scale.set(0.8 + Math.random() * 0.4, 0.6 + Math.random() * 0.6, 0.8 + Math.random() * 0.4);
    rock.userData.isRock = true;
    return rock;
}
const getLeafColor = (worldX: number, worldZ: number, seed: number) => {
    const autumnNoise = (perlin.noise(worldX * 0.02, worldZ * 0.02) + 1) / 2;
    const autumnColors = [0xffa500, 0xd2691e, 0x8b0000], greenColors = [0x228B22, 0x006400, 0x556b2f];
    const color = autumnNoise > 0.6 ? autumnColors[Math.floor(pseudoRandom(seed * 3) * autumnColors.length)] : greenColors[Math.floor(pseudoRandom(seed * 3) * greenColors.length)];
    const colorObj = new THREE.Color(color);
    colorObj.multiplyScalar(0.85 + pseudoRandom(seed * 2) * 0.3);
    return colorObj;
};

function createVegetationChunk(chunkX: number, chunkZ: number, vegetationDensity: number) {
    const group = new THREE.Group();
    let vegRandom = pseudoRandom(chunkX * 1000 + chunkZ);
    const defaultTreeMatrices = [], pineTreeMatrices = [], bushMatrices = [], flowerStemMatrices = [], flowerLeafMatrices = [], flowerHeadData: any[] = [];
    const tempObject = new THREE.Object3D(), tempColor = new THREE.Color();
    const flowerColors = [0xff69b4, 0xffff00, 0x9400d3, 0x1e90ff];

    const vegCount = Math.floor(50 * vegetationDensity);
    for (let i = 0; i < vegCount; i++) {
        vegRandom = pseudoRandom(vegRandom * 12.9898); const rx = vegRandom * CHUNK_SIZE;
        vegRandom = pseudoRandom(vegRandom * 12.9898); const rz = vegRandom * CHUNK_SIZE;
        const wx = chunkX * CHUNK_SIZE + rx, wz = chunkZ * CHUNK_SIZE + rz;
        const h = combinedNoise(wx, wz); if (h < 2) continue;
        const normal = getNormalAt(wx, wz), isSteep = normal.y < 0.7;
        const ef = Math.max(0.3, Math.min(1, h / 15));
        vegRandom = pseudoRandom(vegRandom * 12.9898);

        if (isSteep && vegRandom < 0.6) {
            for (let j = 0; j < 2 + Math.floor(pseudoRandom(vegRandom * 12.9898) * 4); j++) {
                const rock = createRock();
                vegRandom = pseudoRandom(vegRandom * 12.9898); const offsetX = (vegRandom - 0.5) * 5;
                vegRandom = pseudoRandom(vegRandom * 12.9898); const offsetZ = (vegRandom - 0.5) * 5;
                const rockH = combinedNoise(wx + offsetX, wz + offsetZ); if (Math.abs(rockH - h) > 2.5) continue;
                rock.position.set(wx + offsetX, rockH, wz + offsetZ);
                vegRandom = pseudoRandom(vegRandom * 12.9898); rock.rotation.y = vegRandom * Math.PI * 2;
                vegRandom = pseudoRandom(vegRandom * 12.9898); rock.scale.setScalar(0.7 + vegRandom * 0.8);
                group.add(rock);
            }
        } else if (vegRandom < 0.3 * ef && !isSteep) { // Tree
            tempObject.position.set(wx, h, wz);
            vegRandom = pseudoRandom(vegRandom * 12.9898); tempObject.rotation.y = vegRandom * Math.PI * 2;
            vegRandom = pseudoRandom(vegRandom * 12.9898); const scaleY = 0.7 + vegRandom * 0.6;
            vegRandom = pseudoRandom(vegRandom * 12.9898); const scaleXZ = 0.8 + vegRandom * 0.4;
            tempObject.scale.set(scaleXZ, scaleY, scaleXZ);
            tempObject.updateMatrix();
            (vegRandom < 0.7 ? defaultTreeMatrices : pineTreeMatrices).push({matrix: tempObject.matrix.clone(), wx, wz, seed: vegRandom * i});
        } else if (vegRandom < 0.6 * ef && !isSteep) { // Bush
            vegRandom = pseudoRandom(vegRandom * 12.9898); tempObject.scale.setScalar(0.8 + vegRandom * 0.8);
            tempObject.position.set(wx, h, wz); tempObject.updateMatrix(); bushMatrices.push(tempObject.matrix.clone());
        } else if (vegRandom < 0.7 * ef && !isSteep) { // Flower
            vegRandom = pseudoRandom(vegRandom * 12.9898); const clusterColor = new THREE.Color(flowerColors[Math.floor(vegRandom * flowerColors.length)]);
            for (let j = 0; j < 3 + Math.floor(pseudoRandom(vegRandom * 12.9898) * 5); j++) {
                vegRandom = pseudoRandom(vegRandom * 12.9898); const offsetX = (vegRandom - 0.5) * 2;
                vegRandom = pseudoRandom(vegRandom * 12.9898); const offsetZ = (vegRandom - 0.5) * 2;
                const flowerH = combinedNoise(wx + offsetX, wz + offsetZ); if (Math.abs(flowerH - h) > 1.0) continue;
                vegRandom = pseudoRandom(vegRandom * 12.9898); tempObject.scale.setScalar(0.7 + vegRandom * 0.6);
                tempObject.position.set(wx + offsetX, flowerH, wz + offsetZ); tempObject.updateMatrix();
                flowerStemMatrices.push(tempObject.matrix.clone());
                flowerHeadData.push({ matrix: tempObject.matrix.clone(), color: clusterColor.clone().multiplyScalar(1.0 + (pseudoRandom(vegRandom * 12.9898) - 0.5) * 0.2)});
                for (let k = 0; k < 1 + Math.floor(pseudoRandom(pseudoRandom(vegRandom * 12.9898)) * 2); k++) {
                    const leafMatrix = tempObject.matrix.clone().multiply(new THREE.Matrix4().makeRotationY((pseudoRandom(vegRandom * k * 13.37) * Math.PI * 2)));
                    flowerLeafMatrices.push(leafMatrix);
                }
            }
        } else if (vegRandom < 0.8 * ef) { // Single rock
             const rock = createRock(); rock.position.set(wx, h, wz); group.add(rock);
        }
    }

    if (defaultTreeMatrices.length > 0) {
        const trunks = new THREE.InstancedMesh(Assets.TRUNK_GEOMETRY, Assets.TRUNK_MATERIAL, defaultTreeMatrices.length);
        const leaves = new THREE.InstancedMesh(Assets.LEAVES_GEOMETRY, Assets.LEAVES_MATERIAL, defaultTreeMatrices.length);
        trunks.castShadow = leaves.castShadow = true;
        defaultTreeMatrices.forEach((d, i) => {
            trunks.setMatrixAt(i, d.matrix); leaves.setMatrixAt(i, d.matrix);
            trunks.setColorAt(i, tempColor.setHex(0x8B4513).multiplyScalar(0.9 + pseudoRandom(d.seed) * 0.2));
            leaves.setColorAt(i, getLeafColor(d.wx, d.wz, d.seed));
        });
        if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
        group.add(trunks, leaves);
    }
    if (pineTreeMatrices.length > 0) {
        const trunks = new THREE.InstancedMesh(Assets.PINE_TRUNK_GEOMETRY, Assets.TRUNK_MATERIAL, pineTreeMatrices.length);
        const leaves1 = new THREE.InstancedMesh(Assets.PINE_LEAVES1_GEOMETRY, Assets.PINE_LEAVES_MATERIAL, pineTreeMatrices.length);
        const leaves2 = new THREE.InstancedMesh(Assets.PINE_LEAVES2_GEOMETRY, Assets.PINE_LEAVES_MATERIAL, pineTreeMatrices.length);
        const leaves3 = new THREE.InstancedMesh(Assets.PINE_LEAVES3_GEOMETRY, Assets.PINE_LEAVES_MATERIAL, pineTreeMatrices.length);
        [trunks, leaves1, leaves2, leaves3].forEach(p => p.castShadow = true);
        pineTreeMatrices.forEach((d, i) => {
            const leafColor = getLeafColor(d.wx, d.wz, d.seed);
            [trunks, leaves1, leaves2, leaves3].forEach(p => {
                p.setMatrixAt(i, d.matrix);
                p.setColorAt(i, p === trunks ? tempColor.setHex(0x654321) : leafColor);
            });
        });
        [trunks, leaves1, leaves2, leaves3].forEach(p => { if (p.instanceColor) p.instanceColor.needsUpdate = true; group.add(p); });
    }
    if (bushMatrices.length > 0) {
        const bushes = new THREE.InstancedMesh(Assets.BUSH_GEOMETRY, Assets.BUSH_MATERIAL, bushMatrices.length);
        bushes.castShadow = true;
        bushMatrices.forEach((m, i) => { bushes.setMatrixAt(i, m); bushes.setColorAt(i, tempColor.setHex(0x2e4432).multiplyScalar(0.9 + pseudoRandom(i) * 0.2)); });
        if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true; group.add(bushes);
    }
    if (flowerStemMatrices.length > 0) {
        const stems = new THREE.InstancedMesh(Assets.FLOWER_STEM_GEOMETRY, Assets.FLOWER_STEM_MATERIAL, flowerStemMatrices.length);
        const heads = new THREE.InstancedMesh(Assets.FLOWER_HEAD_GEOMETRY, Assets.FLOWER_HEAD_MATERIAL, flowerHeadData.length);
        const leaves = new THREE.InstancedMesh(Assets.FLOWER_LEAF_GEOMETRY, Assets.FLOWER_LEAF_MATERIAL, flowerLeafMatrices.length);
        stems.castShadow = heads.castShadow = leaves.castShadow = true;
        flowerStemMatrices.forEach((m, i) => stems.setMatrixAt(i, m));
        flowerHeadData.forEach((d, i) => { heads.setMatrixAt(i, d.matrix); heads.setColorAt(i, d.color); });
        flowerLeafMatrices.forEach((m, i) => leaves.setMatrixAt(i, m));
        if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
        group.add(stems, heads, leaves);
    }
    return group;
}

/* ---------------  Chunk Manager  ----------------- */
const getKey = (x: number, z: number) => `${x},${z}`;
export function updateChunks(camera: any, scene: any, terrainMaterial: any, chunksRef: { chunks: Map<any, any>, vegetationChunks: Map<any, any>, bottomCaps: Map<any, any> }, groundParams: { vegetationDensity: number }) {
    const pcx = Math.floor(camera.position.x / CHUNK_SIZE);
    const pcz = Math.floor(camera.position.z / CHUNK_SIZE);
    const keep = new Set();
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const cx = pcx + x, cz = pcz + z, key = getKey(cx, cz);
            keep.add(key);

            // Generate terrain if it doesn't exist
            if (!chunksRef.chunks.has(key)) {
                const mesh = new THREE.Mesh(createTerrainChunk(cx, cz), terrainMaterial);
                mesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
                mesh.receiveShadow = true;
                scene.add(mesh); chunksRef.chunks.set(key, mesh);
                const bottom = createBottomCap(cx, cz); scene.add(bottom); chunksRef.bottomCaps.set(key, bottom);
            }
            
            // Generate vegetation if it doesn't exist (it could have been cleared)
            if (!chunksRef.vegetationChunks.has(key)) {
                const veg = createVegetationChunk(cx, cz, groundParams.vegetationDensity);
                scene.add(veg);
                chunksRef.vegetationChunks.set(key, veg);
            }
        }
    }
    chunksRef.chunks.forEach((m, k) => { if (!keep.has(k)) { scene.remove(m); m.geometry.dispose(); chunksRef.chunks.delete(k); } });
    chunksRef.bottomCaps.forEach((m, k) => { if (!keep.has(k)) { scene.remove(m); m.geometry.dispose(); if (m.material) m.material.dispose(); chunksRef.bottomCaps.delete(k); } });
    chunksRef.vegetationChunks.forEach((g, k) => {
        if (!keep.has(k)) {
            scene.remove(g);
            g.traverse((o: any) => {
                if (o.isMesh && o.userData.isRock) {
                    o.geometry.dispose();
                    o.material.dispose();
                }
            });
            chunksRef.vegetationChunks.delete(k);
        }
    });
}