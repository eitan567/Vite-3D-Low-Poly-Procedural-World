export interface BloomParams {
    threshold: number;
    strength: number;
    radius: number;
}
export interface CloudParams {
    count: number;
    speed: number;
}
export interface GroundParams {
    scale: number;
    showTexture: boolean;
    vegetationDensity: number;
}
export interface WindParams {
    strength: number;
}
export interface Stats {
    fps: number;
    position: string;
    chunkCount: number;
}