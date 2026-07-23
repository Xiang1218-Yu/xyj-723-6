import { create } from 'zustand';
import { AppState, AppActions, Fabric, ModelSettings, GarmentSettings, ToolType, CameraState } from '../types';
import { fabrics } from '../data/fabrics';

const defaultModelSettings: ModelSettings = {
  bodyType: 'standard',
  pose: 'standing',
  measurements: {
    height: 175,
    bust: 90,
    waist: 65,
    hips: 95,
    shoulder: 40,
  },
  rotation: 0,
};

const defaultGarmentSettings: GarmentSettings = {
  garmentType: 'tshirt',
  fit: 'regular',
  length: 50,
  sleeveLength: 25,
};

const defaultCameraState: CameraState = {
  position: [0, 0.5, 3.5],
  target: [0, 0, 0],
};

interface HistoryState {
  modelSettings: ModelSettings;
  garmentSettings: GarmentSettings;
  selectedFabric: Fabric | null;
}

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

type StoreState = AppState & AppActions & {
  history: HistoryState[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: (newState: Partial<HistoryState>) => void;
  undo: () => void;
  redo: () => void;
};

const createInitialState = () => ({
  currentProject: null,
  selectedFabric: fabrics[0],
  modelSettings: deepClone(defaultModelSettings),
  garmentSettings: deepClone(defaultGarmentSettings),
  activeTool: 'select' as ToolType,
  isPlaying: false,
  showWireframe: false,
  cameraState: defaultCameraState,
  history: [{
    modelSettings: deepClone(defaultModelSettings),
    garmentSettings: deepClone(defaultGarmentSettings),
    selectedFabric: fabrics[0],
  }],
  historyIndex: 0,
  canUndo: false,
  canRedo: false,
});

export const useStore = create<StoreState>((set, get) => ({
  ...createInitialState(),

  saveToHistory: (newState: Partial<HistoryState>) => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({
      modelSettings: newState.modelSettings ? deepClone(newState.modelSettings) : deepClone(state.modelSettings),
      garmentSettings: newState.garmentSettings ? deepClone(newState.garmentSettings) : deepClone(state.garmentSettings),
      selectedFabric: newState.selectedFabric !== undefined ? newState.selectedFabric : state.selectedFabric,
    });
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;

    const newIndex = state.historyIndex - 1;
    const historyState = state.history[newIndex];
    set({
      modelSettings: deepClone(historyState.modelSettings),
      garmentSettings: deepClone(historyState.garmentSettings),
      selectedFabric: historyState.selectedFabric,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const newIndex = state.historyIndex + 1;
    const historyState = state.history[newIndex];
    set({
      modelSettings: deepClone(historyState.modelSettings),
      garmentSettings: deepClone(historyState.garmentSettings),
      selectedFabric: historyState.selectedFabric,
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < state.history.length - 1,
    });
  },

  setSelectedFabric: (fabric: Fabric) => {
    get().saveToHistory({ selectedFabric: fabric });
    set({ selectedFabric: fabric });
  },

  setModelSettings: (settings: Partial<ModelSettings>) => {
    const state = get();
    const newSettings = { ...deepClone(state.modelSettings), ...settings };
    state.saveToHistory({ modelSettings: newSettings });
    set({ modelSettings: newSettings });
  },

  setGarmentSettings: (settings: Partial<GarmentSettings>) => {
    const state = get();
    const newSettings = { ...deepClone(state.garmentSettings), ...settings };
    state.saveToHistory({ garmentSettings: newSettings });
    set({ garmentSettings: newSettings });
  },

  setActiveTool: (tool: ToolType) => set({ activeTool: tool }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  toggleWireframe: () => set((state) => ({ showWireframe: !state.showWireframe })),

  setCameraState: (cameraState: CameraState) => set({ cameraState }),

  resetSettings: () => {
    const state = get();
    state.saveToHistory({
      modelSettings: defaultModelSettings,
      garmentSettings: defaultGarmentSettings,
      selectedFabric: fabrics[0],
    });
    set({
      modelSettings: deepClone(defaultModelSettings),
      garmentSettings: deepClone(defaultGarmentSettings),
      selectedFabric: fabrics[0],
      cameraState: defaultCameraState,
    });
  },
}));
