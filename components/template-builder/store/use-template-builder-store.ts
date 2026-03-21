import { create } from 'zustand';
import {
  DEFAULT_TEMPLATE_ATTRIBUTES,
  DEFAULT_TEMPLATE_PAGE_SETTINGS,
} from '@/components/template-builder/defaults';
import type {
  FabricTemplateScene,
  InsertionPreset,
  SelectedObjectState,
  AttributeDataType,
  TemplateAttribute,
  TemplateBuilderSidebarSection,
  TemplatePageSettings,
  CanvasCommand,
} from '@/components/template-builder/types';

type RuntimeCanvas = {
  loadFromJSON: (json: Record<string, unknown>, callback?: () => void) => void;
  requestRenderAll: () => void;
};

type RuntimeCanvasObject = Record<string, unknown>;

interface HistoryState {
  past: string[];
  future: string[];
}

interface TemplateBuilderState {
  templateId: string;
  mode: 'edit' | 'preview';
  canvas: RuntimeCanvas | null;
  activeObjects: RuntimeCanvasObject[];
  scene: FabricTemplateScene;
  activeSidebarSection: TemplateBuilderSidebarSection;
  pageSettings: TemplatePageSettings;
  zoom: number;
  pan: { x: number; y: number };
  selectedObject: SelectedObjectState | null;
  pendingInsertion: InsertionPreset | null;
  pendingAttributeId: string | null;
  pendingCanvasCommand: CanvasCommand | null;
  attributes: TemplateAttribute[];
  dirty: boolean;
  history: HistoryState;
  setTemplateId: (templateId: string) => void;
  toggleMode: () => void;
  initCanvas: (canvas: RuntimeCanvas | null) => void;
  setActiveObjects: (objects: RuntimeCanvasObject[]) => void;
  setScene: (scene: FabricTemplateScene) => void;
  setActiveSidebarSection: (section: TemplateBuilderSidebarSection) => void;
  setPageSettings: (changes: Partial<TemplatePageSettings>) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  markSaved: () => void;
  setSelectedObject: (selected: SelectedObjectState | null) => void;
  queueInsertion: (preset: InsertionPreset) => void;
  consumeInsertion: () => void;
  queueAttributeInsertion: (attributeId: string) => void;
  consumeAttributeInsertion: () => void;
  queueCanvasCommand: (command: CanvasCommand) => void;
  consumeCanvasCommand: () => void;
  addCustomAttribute: (input: {
    label: string;
    key?: string;
    category: 'evento' | 'titular' | 'sistema';
    dataType: AttributeDataType;
  }) => void;
  markAttributeInUse: (attributeId: string) => void;
  updateSelectedStyle: (changes: Partial<SelectedObjectState>) => void;
  saveHistorySnapshot: (snapshot: string) => void;
  clearHistory: () => void;
  pushHistory: (nextScene: FabricTemplateScene) => void;
  undo: () => void;
  redo: () => void;
}

const EMPTY_SCENE: FabricTemplateScene = {
  objects: [],
  background: '#ffffff',
  page: DEFAULT_TEMPLATE_PAGE_SETTINGS,
};

function scenesAreEqual(left: FabricTemplateScene, right: FabricTemplateScene): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function safeParseScene(snapshot: string): FabricTemplateScene | null {
  try {
    const parsed = JSON.parse(snapshot) as FabricTemplateScene;
    if (!parsed || !Array.isArray(parsed.objects)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeAttributeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const useTemplateBuilderStore = create<TemplateBuilderState>((set, get) => ({
  templateId: '',
  mode: 'edit',
  canvas: null,
  activeObjects: [],
  scene: EMPTY_SCENE,
  activeSidebarSection: 'plantillas',
  pageSettings: DEFAULT_TEMPLATE_PAGE_SETTINGS,
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectedObject: null,
  pendingInsertion: null,
  pendingAttributeId: null,
  pendingCanvasCommand: null,
  attributes: DEFAULT_TEMPLATE_ATTRIBUTES,
  dirty: false,
  history: {
    past: [],
    future: [],
  },
  setTemplateId: (templateId) => set({ templateId }),
  toggleMode: () =>
    set((state) => ({
      mode: state.mode === 'edit' ? 'preview' : 'edit',
    })),
  initCanvas: (canvas) => set({ canvas }),
  setActiveObjects: (activeObjects) => set({ activeObjects }),
  setScene: (scene) =>
    set((state) => ({
      scene,
      pageSettings: {
        ...state.pageSettings,
        ...(scene.page ?? {}),
      },
    })),
  setActiveSidebarSection: (activeSidebarSection) => set({ activeSidebarSection }),
  setPageSettings: (changes) =>
    set((state) => ({
      pageSettings: {
        ...state.pageSettings,
        ...changes,
      },
    })),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  markSaved: () => set({ dirty: false }),
  setSelectedObject: (selectedObject) => set({ selectedObject }),
  queueInsertion: (pendingInsertion) => set({ pendingInsertion }),
  consumeInsertion: () => set({ pendingInsertion: null }),
  queueAttributeInsertion: (pendingAttributeId) => set({ pendingAttributeId }),
  consumeAttributeInsertion: () => set({ pendingAttributeId: null }),
  queueCanvasCommand: (pendingCanvasCommand) => set({ pendingCanvasCommand }),
  consumeCanvasCommand: () => set({ pendingCanvasCommand: null }),
  addCustomAttribute: ({ label, key, category, dataType }) =>
    set((state) => {
      const normalizedKey = normalizeAttributeKey(key && key.length > 0 ? key : label);
      if (!normalizedKey) {
        return state;
      }

      const exists = state.attributes.some((attribute) => attribute.key === normalizedKey);
      if (exists) {
        return state;
      }

      const nextAttribute: TemplateAttribute = {
        id: `attr-${normalizedKey}-${Date.now()}`,
        key: normalizedKey,
        label: label.trim(),
        category,
        dataType,
        custom: true,
      };

      return {
        attributes: [...state.attributes, nextAttribute],
      };
    }),
  markAttributeInUse: (attributeId) =>
    set((state) => ({
      attributes: state.attributes.map((attribute) =>
        attribute.id === attributeId
          ? {
              ...attribute,
              inUse: true,
            }
          : attribute,
      ),
    })),
  updateSelectedStyle: (changes) =>
    set((state) => {
      if (!state.selectedObject) {
        return state;
      }

      return {
        selectedObject: {
          ...state.selectedObject,
          ...changes,
        },
      };
    }),
  saveHistorySnapshot: (snapshot) =>
    set((state) => {
      const lastPast = state.history.past[state.history.past.length - 1];
      if (lastPast === snapshot) {
        return state;
      }

      return {
        history: {
          past: [...state.history.past, snapshot],
          future: [],
        },
      };
    }),
  clearHistory: () => set({ history: { past: [], future: [] } }),
  pushHistory: (nextScene) =>
    set((state) => {
      if (scenesAreEqual(state.scene, nextScene)) {
        return state;
      }

      const snapshot = JSON.stringify(nextScene);
      const lastPast = state.history.past[state.history.past.length - 1];
      const past = lastPast === snapshot ? state.history.past : [...state.history.past, snapshot];

      return {
        scene: nextScene,
        dirty: true,
        history: {
          past,
          future: [],
        },
      };
    }),
  undo: () => {
    const state = get();
    const previousSnapshot = state.history.past[state.history.past.length - 1];

    if (!previousSnapshot) {
      return;
    }

    const previousScene = safeParseScene(previousSnapshot);
    if (!previousScene) {
      return;
    }

    const currentSnapshot = JSON.stringify(state.scene);
    state.canvas?.loadFromJSON(previousScene as Record<string, unknown>, () => {
      state.canvas?.requestRenderAll();
    });

    set({
      scene: previousScene,
      dirty: true,
      history: {
        past: state.history.past.slice(0, -1),
        future: [currentSnapshot, ...state.history.future],
      },
    });
  },
  redo: () => {
    const state = get();
    const nextSnapshot = state.history.future[0];

    if (!nextSnapshot) {
      return;
    }

    const nextScene = safeParseScene(nextSnapshot);
    if (!nextScene) {
      return;
    }

    const currentSnapshot = JSON.stringify(state.scene);
    state.canvas?.loadFromJSON(nextScene as Record<string, unknown>, () => {
      state.canvas?.requestRenderAll();
    });

    set({
      scene: nextScene,
      dirty: true,
      history: {
        past: [...state.history.past, currentSnapshot],
        future: state.history.future.slice(1),
      },
    });
  },
}));

export const useEditorStore = useTemplateBuilderStore;
