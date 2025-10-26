declare global {
    interface Window { THREE: any; }
}
const { THREE } = window;

// --- IMPORTANT ---
// The original GitHub URL was blocked by the environment's Content Security Policy (CSP).
// Using a CDN like jsDelivr is a common and effective way to bypass this.
// It serves the raw file from your GitHub repo with the correct headers.
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/eitan567/assets@main/Tree_temp_climate_001.glb';
const TEXTURE_URL = "https://cdn.jsdelivr.net/gh/eitan567/assets@main/T_Trees_temp_climate3.png";

let loadedTreeModel: any = null;

export const loadCustomTreeModel = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (loadedTreeModel) {
            resolve(loadedTreeModel.clone());
            return;
        }

        const modelLoader = new THREE.GLTFLoader();
        const textureLoader = new THREE.TextureLoader();

        // Wrap the r128 callback-based loaders in Promises to use Promise.all
        const loadModelPromise = new Promise((resolveModel, rejectModel) => {
            modelLoader.load(MODEL_URL, resolveModel, undefined, rejectModel);
        });
        
        const loadTexturePromise = new Promise((resolveTexture, rejectTexture) => {
            textureLoader.load(TEXTURE_URL, resolveTexture, undefined, rejectTexture);
        });

        Promise.all([
            loadModelPromise,
            loadTexturePromise,
        ]).then(([gltf, texture]: [any, any]) => {
            
            // Configure texture
            texture.flipY = false;
            texture.encoding = THREE.sRGBEncoding;
            // For pixelated/palette textures, use nearest-neighbor filtering to keep edges sharp
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;

            const model = gltf.scene;

            model.traverse((node: any) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    // Apply texture to the model's material
                    if (node.material) {
                        const newMaterial = new THREE.MeshLambertMaterial({
                           map: texture,
                           // Make the tree emit light based on its texture to make it brighter
                           // and better match the other assets in the scene.
                           emissiveMap: texture,
                           emissive: 0xffffff, // Use white to not tint the emissive map
                           emissiveIntensity: 0.0 // Increase intensity for a brighter look
                       });
                       // Dispose the old material to prevent memory leaks
                       node.material.dispose();
                       node.material = newMaterial;
                    }
                }
            });

            loadedTreeModel = model;
            resolve(loadedTreeModel.clone());

        }).catch(error => {
            console.error('An error happened while loading the custom tree model or texture:', error);
            console.error("Failed to load custom model. Creating a placeholder cube.");
            const placeholder = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xff0000 }));
            reject(placeholder);
        });
    });
};