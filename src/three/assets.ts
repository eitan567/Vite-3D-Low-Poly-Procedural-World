declare global {
    interface Window { THREE: any; }
}

// --- Wind Shader Logic ---
export const windUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: 0.2 },
};

const createWindyMaterialCompiler = (height: number, swayFactor: number) => (shader: any) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    shader.vertexShader = 'uniform float uTime;\nuniform float uWindStrength;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec4 windWorldPosition = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float windIntensity = pow(max(0.0, position.y / ${height.toFixed(1)}), 2.0);
        float timeOffset = windWorldPosition.x + windWorldPosition.z;
        float sway = sin(uTime * 1.5 + timeOffset * 0.5) * windIntensity * uWindStrength * ${swayFactor.toFixed(2)};
        vec3 transformed = vec3(position);
        transformed.x += sway;
        transformed.z += sway * 0.5;
        `
    );
};
const createFlowerHeadWindyMaterialCompiler = (swayPointY: number, height: number, swayFactor: number) => (shader: any) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    shader.vertexShader = 'uniform float uTime;\nuniform float uWindStrength;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec4 windWorldPosition = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float windIntensity = pow(max(0.0, ${swayPointY.toFixed(1)} / ${height.toFixed(1)}), 2.0); 
        float timeOffset = windWorldPosition.x + windWorldPosition.z;
        float sway = sin(uTime * 1.5 + timeOffset * 0.5) * windIntensity * uWindStrength * ${swayFactor.toFixed(2)};
        vec3 transformed = vec3(position);
        transformed.x += sway;
        transformed.z += sway * 0.5;
        `
    );
};

// --- Geometries ---
export let TRUNK_GEOMETRY: any, LEAVES_GEOMETRY: any, PINE_TRUNK_GEOMETRY: any, PINE_LEAVES1_GEOMETRY: any, PINE_LEAVES2_GEOMETRY: any, PINE_LEAVES3_GEOMETRY: any, BUSH_GEOMETRY: any, FLOWER_STEM_GEOMETRY: any, FLOWER_HEAD_GEOMETRY: any, FLOWER_LEAF_GEOMETRY: any, FISH_GEOMETRY: any, CLOUD_GEOMETRY: any;

// --- Materials ---
export let TRUNK_MATERIAL: any, LEAVES_MATERIAL: any, PINE_LEAVES_MATERIAL: any, BUSH_MATERIAL: any, FLOWER_STEM_MATERIAL: any, FLOWER_HEAD_MATERIAL: any, FLOWER_LEAF_MATERIAL: any, FISH_MATERIAL: any, CLOUD_MATERIAL: any;

let allGeometries: any[] = [];
let allMaterials: any[] = [];
let loaded = false;

export function initAssets() {
    if (loaded || !window.THREE) return;
    const THREE = window.THREE;

    TRUNK_GEOMETRY = new THREE.CylinderGeometry(0.8, 1.2, 6, 6);
    TRUNK_GEOMETRY.translate(0, 6 / 2, 0);
    LEAVES_GEOMETRY = new THREE.ConeGeometry(3.5, 7, 6);
    LEAVES_GEOMETRY.translate(0, 6 + 7 / 2, 0);

    PINE_TRUNK_GEOMETRY = new THREE.CylinderGeometry(0.6, 0.9, 8, 5);
    PINE_TRUNK_GEOMETRY.translate(0, 8 / 2, 0);
    PINE_LEAVES1_GEOMETRY = new THREE.ConeGeometry(3, 5, 6);
    PINE_LEAVES1_GEOMETRY.translate(0, 8.5, 0);
    PINE_LEAVES2_GEOMETRY = new THREE.ConeGeometry(2.5, 5, 6);
    PINE_LEAVES2_GEOMETRY.translate(0, 8.5 + 2, 0);
    PINE_LEAVES3_GEOMETRY = new THREE.ConeGeometry(2, 5, 6);
    PINE_LEAVES3_GEOMETRY.translate(0, 8.5 + 4, 0);

    const puffGeom = new THREE.IcosahedronGeometry(1, 0);
    const geoms = Array.from({ length: 5 }, () => {
        const puff = puffGeom.clone();
        const scale = 0.5 + Math.random() * 0.5;
        puff.scale(scale, scale, scale);
        puff.translate((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 1.5);
        return puff;
    });
    BUSH_GEOMETRY = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, false);
    BUSH_GEOMETRY.translate(0, 0.5, 0);
    puffGeom.dispose();

    FLOWER_STEM_GEOMETRY = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 3);
    FLOWER_STEM_GEOMETRY.translate(0, 0.25, 0);
    FLOWER_HEAD_GEOMETRY = new THREE.IcosahedronGeometry(0.2, 0);
    FLOWER_HEAD_GEOMETRY.translate(0, 0.55, 0);
    FLOWER_LEAF_GEOMETRY = new THREE.PlaneGeometry(0.2, 0.2);
    FLOWER_LEAF_GEOMETRY.rotateX(-Math.PI / 4);
    FLOWER_LEAF_GEOMETRY.translate(0.1, 0.25, 0);

    FISH_GEOMETRY = new THREE.BoxGeometry(1.2, 0.4, 0.3);

    const basePuffGeometry = new THREE.IcosahedronGeometry(1, 0);
    const cloudGeoms = Array.from({ length: 5 + Math.floor(Math.random() * 5) }, () => {
        const puff = basePuffGeometry.clone();
        const scale = 2.5 + Math.random() * 3;
        puff.scale(scale, scale, scale);
        puff.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 8);
        return puff;
    });
    CLOUD_GEOMETRY = THREE.BufferGeometryUtils.mergeBufferGeometries(cloudGeoms, false);
    basePuffGeometry.dispose();

    TRUNK_MATERIAL = new THREE.MeshLambertMaterial({ emissive: 0x1a110a, emissiveIntensity: 0.2 });
    TRUNK_MATERIAL.onBeforeCompile = createWindyMaterialCompiler(8.0, 0.1);
    LEAVES_MATERIAL = new THREE.MeshLambertMaterial({ emissive: 0x112211, emissiveIntensity: 0.3 });
    LEAVES_MATERIAL.onBeforeCompile = createWindyMaterialCompiler(15.0, 1.0);
    PINE_LEAVES_MATERIAL = new THREE.MeshLambertMaterial({ emissive: 0x102010, emissiveIntensity: 0.25 });
    PINE_LEAVES_MATERIAL.onBeforeCompile = createWindyMaterialCompiler(15.0, 1.0);
    BUSH_MATERIAL = new THREE.MeshLambertMaterial({ emissive: 0x152515, emissiveIntensity: 0.2 });
    BUSH_MATERIAL.onBeforeCompile = createWindyMaterialCompiler(2.0, 0.5);
    FLOWER_STEM_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x33691e });
    FLOWER_STEM_MATERIAL.onBeforeCompile = createWindyMaterialCompiler(0.5, 1.5);
    FLOWER_HEAD_MATERIAL = new THREE.MeshLambertMaterial({ emissiveIntensity: 0.4 });
    FLOWER_HEAD_MATERIAL.onBeforeCompile = createFlowerHeadWindyMaterialCompiler(0.5, 0.5, 1.5);
    FLOWER_LEAF_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x4caf50, side: THREE.DoubleSide });
    FLOWER_LEAF_MATERIAL.onBeforeCompile = createWindyMaterialCompiler(0.5, 2.0);
    FISH_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xffa500 });
    CLOUD_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 0.1 });

    allGeometries = [TRUNK_GEOMETRY, LEAVES_GEOMETRY, PINE_TRUNK_GEOMETRY, PINE_LEAVES1_GEOMETRY, PINE_LEAVES2_GEOMETRY, PINE_LEAVES3_GEOMETRY, BUSH_GEOMETRY, FLOWER_STEM_GEOMETRY, FLOWER_HEAD_GEOMETRY, FLOWER_LEAF_GEOMETRY, FISH_GEOMETRY, CLOUD_GEOMETRY];
    allMaterials = [TRUNK_MATERIAL, LEAVES_MATERIAL, PINE_LEAVES_MATERIAL, BUSH_MATERIAL, FLOWER_STEM_MATERIAL, FLOWER_HEAD_MATERIAL, FLOWER_LEAF_MATERIAL, FISH_MATERIAL, CLOUD_MATERIAL];
    
    loaded = true;
}

export const isLoaded = () => loaded;

export const disposeAll = () => {
    allGeometries.forEach(g => g?.dispose());
    allMaterials.forEach(m => m?.dispose());
    allGeometries = [];
    allMaterials = [];
    loaded = false;
};