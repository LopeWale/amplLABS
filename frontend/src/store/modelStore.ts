import { create } from 'zustand'
import { AMPLModel, DataFile, modelsApi } from '../api'

interface ModelState {
  models: AMPLModel[]
  currentModel: AMPLModel | null
  currentDataFile: DataFile | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchModels: () => Promise<void>
  fetchModel: (id: number) => Promise<void>
  createModel: (data: Partial<AMPLModel>) => Promise<AMPLModel>
  updateModel: (id: number, data: Partial<AMPLModel>) => Promise<void>
  deleteModel: (id: number) => Promise<void>
  setCurrentModel: (model: AMPLModel | null) => void
  setCurrentDataFile: (dataFile: DataFile | null) => void
  updateModelContent: (content: string) => void
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  currentModel: null,
  currentDataFile: null,
  isLoading: false,
  error: null,

  fetchModels: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await modelsApi.list()
      set({ models: response.data, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch models', isLoading: false })
    }
  },

  fetchModel: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const response = await modelsApi.get(id)
      set({ currentModel: response.data, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch model', isLoading: false })
    }
  },

  createModel: async (data: Partial<AMPLModel>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await modelsApi.create(data)
      const models = get().models
      set({ models: [...models, response.data], isLoading: false })
      return response.data
    } catch (error) {
      set({ error: 'Failed to create model', isLoading: false })
      throw error
    }
  },

  updateModel: async (id: number, data: Partial<AMPLModel>) => {
    set({ isLoading: true, error: null })
    try {
      const response = await modelsApi.update(id, data)
      const models = get().models.map(m => (m.id === id ? response.data : m))
      set({
        models,
        currentModel: get().currentModel?.id === id ? response.data : get().currentModel,
        isLoading: false,
      })
    } catch (error) {
      set({ error: 'Failed to update model', isLoading: false })
    }
  },

  deleteModel: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      await modelsApi.delete(id)
      const models = get().models.filter(m => m.id !== id)
      set({
        models,
        currentModel: get().currentModel?.id === id ? null : get().currentModel,
        isLoading: false,
      })
    } catch (error) {
      set({ error: 'Failed to delete model', isLoading: false })
    }
  },

  setCurrentModel: (model) => set({ currentModel: model }),
  setCurrentDataFile: (dataFile) => set({ currentDataFile: dataFile }),

  updateModelContent: (content: string) => {
    const currentModel = get().currentModel
    if (currentModel) {
      set({ currentModel: { ...currentModel, model_content: content } })
    }
  },
}))
