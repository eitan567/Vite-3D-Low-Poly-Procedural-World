import * as Assets from './assets';
declare global {
    interface Window { THREE: any; }
}

export const createSun = (position: any) => {
    const THREE = window.THREE;
    if (!THREE) return null;
    const sun = new THREE.Mesh(
        new THREE.SphereGeometry(20, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xFFFF99 })
    );
    sun.position.copy(position);
    return sun;
};

export const createWater = (scene: any, sunDirection: any) => {
    const THREE = window.THREE;
    if (!THREE) return null;
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    const waterNormals = new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', function (texture: any) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });

    const water = new THREE.Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormals,
        sunDirection: sunDirection.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: 0x36A2EB,
        distortionScale: 1.0,
        fog: scene.fog !== undefined
    });
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.0;
    return water;
};

export const createClouds = (count: number, areaSize: number) => {
    const THREE = window.THREE;
    if (!THREE) return { mesh: null, data: [] };
    const mesh = new THREE.InstancedMesh(Assets.CLOUD_GEOMETRY, Assets.CLOUD_MATERIAL, count);
    const data = [];
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * areaSize;
        const y = 90 + Math.random() * 50;
        const z = (Math.random() - 0.5) * areaSize;
        
        tempObject.position.set(x, y, z);
        tempObject.rotation.y = Math.random() * Math.PI * 2;
        tempObject.scale.setScalar(0.8 + Math.random() * 2.5);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);

        const randomBrightness = 0.85 + Math.random() * 0.3;
        tempColor.setScalar(randomBrightness);
        mesh.setColorAt(i, tempColor);

        data.push({ x, y, z, speed: 0.05 + Math.random() * 0.1, z_speed: (Math.random() - 0.5) * 0.05, areaSize });
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    return { mesh, data };
};

export const animateClouds = (cloudData: { mesh: any, data: any[] }, speed: number) => {
    const THREE = window.THREE;
    if (!THREE || !cloudData.mesh || cloudData.data.length === 0) return;
    const tempCloudObject = new THREE.Object3D();
    cloudData.data.forEach((cloud, i) => {
        cloud.x += cloud.speed * speed * 0.1;
        cloud.z += cloud.z_speed * speed * 0.1;
        
        if (cloud.x > cloud.areaSize / 2) cloud.x = -cloud.areaSize / 2;
        else if (cloud.x < -cloud.areaSize / 2) cloud.x = cloud.areaSize / 2;
        if (cloud.z > cloud.areaSize / 2) cloud.z = -cloud.areaSize / 2;
        else if (cloud.z < -cloud.areaSize / 2) cloud.z = cloud.areaSize / 2;
        
        cloudData.mesh.getMatrixAt(i, tempCloudObject.matrix);
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        tempCloudObject.matrix.decompose(position, quaternion, scale);
        position.x = cloud.x;
        position.z = cloud.z;
        tempCloudObject.matrix.compose(position, quaternion, scale);
        cloudData.mesh.setMatrixAt(i, tempCloudObject.matrix);
    });
    cloudData.mesh.instanceMatrix.needsUpdate = true;
};


export const createFish = (count: number) => {
    const THREE = window.THREE;
    if (!THREE) return { mesh: null, data: [] };
    const mesh = new THREE.InstancedMesh(Assets.FISH_GEOMETRY, Assets.FISH_MATERIAL, count);
    const data = [];
    const tempObject = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.8) * 5 - 2;
        const z = (Math.random() - 0.5) * 100;
        
        tempObject.position.set(x, y, z);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
        
        data.push({
            position: new THREE.Vector3(x, y, z),
            velocity: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.1)
        });
    }
    return { mesh, data };
};

const swimBounds = { radius: 150, top: -1, bottom: -15 };

export const animateFish = (fishData: { mesh: any, data: any[] }) => {
    const THREE = window.THREE;
    if (!THREE || !fishData.mesh || fishData.data.length === 0) return;

    const schoolCenter = new THREE.Vector3();
    const tempFishObject = new THREE.Object3D();

    schoolCenter.set(0,0,0);
    fishData.data.forEach(fish => schoolCenter.add(fish.position));
    schoolCenter.divideScalar(fishData.data.length);

    fishData.data.forEach((fish: any, i: number) => {
        const toCenter = schoolCenter.clone().sub(fish.position).normalize().multiplyScalar(0.001);
        fish.velocity.add(toCenter);

        const distFromCenter = fish.position.length();
        if (distFromCenter > swimBounds.radius) {
            fish.velocity.add(fish.position.clone().multiplyScalar(-0.002));
        }
        if (fish.position.y > swimBounds.top) fish.velocity.y -= 0.01;
        if (fish.position.y < swimBounds.bottom) fish.velocity.y += 0.01;

        fish.velocity.clampLength(0.05, 0.15);
        fish.position.add(fish.velocity);

        tempFishObject.position.copy(fish.position);
        tempFishObject.lookAt(fish.position.clone().add(fish.velocity));
        tempFishObject.updateMatrix();
        fishData.mesh.setMatrixAt(i, tempFishObject.matrix);
    });
    fishData.mesh.instanceMatrix.needsUpdate = true;
};