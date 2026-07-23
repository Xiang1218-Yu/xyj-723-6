export type FabricCategory = 'cotton' | 'silk' | 'wool' | 'linen' | 'synthetic' | 'denim';

export type BodyType = 'slim' | 'standard' | 'athletic' | 'curvy';

export type ToolType = 'select' | 'move' | 'rotate' | 'scale' | 'pen' | 'measure';

export interface PhysicalParams {
  stiffness: number;
  drape: number;
  wrinkle: number;
  elasticity: number;
  thickness: number;
  friction: number;
}

export interface MaterialProps {
  color: string;
  roughness: number;
  metalness: number;
  normalScale: number;
  aoIntensity: number;
}

export interface Fabric {
  id: string;
  name: string;
  nameZh: string;
  category: FabricCategory;
  color: string;
  physicalParams: PhysicalParams;
  materialProps: MaterialProps;
  description: string;
}

export interface ModelMeasurements {
  height: number;
  bust: number;
  waist: number;
  hips: number;
  shoulder: number;
}

export interface ModelSettings {
  bodyType: BodyType;
  pose: string;
  measurements: ModelMeasurements;
  rotation: number;
}

export interface GarmentSettings {
  garmentType: 'tshirt' | 'dress' | 'jacket' | 'skirt' | 'pants';
  fit: 'tight' | 'regular' | 'loose';
  length: number;
  sleeveLength: number;
}

export interface DesignProject {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnail: string;
  fabricId: string;
  model: ModelSettings;
  garment: GarmentSettings;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface AppState {
  currentProject: DesignProject | null;
  selectedFabric: Fabric | null;
  modelSettings: ModelSettings;
  garmentSettings: GarmentSettings;
  activeTool: ToolType;
  isPlaying: boolean;
  showWireframe: boolean;
  cameraState: CameraState;
}

export interface AppActions {
  setSelectedFabric: (fabric: Fabric) => void;
  setModelSettings: (settings: Partial<ModelSettings>) => void;
  setGarmentSettings: (settings: Partial<GarmentSettings>) => void;
  setActiveTool: (tool: ToolType) => void;
  togglePlay: () => void;
  toggleWireframe: () => void;
  setCameraState: (state: CameraState) => void;
  resetSettings: () => void;
}
