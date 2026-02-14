import { create } from 'zustand'
import { solverApi, SolverInfo, OptimizationRun } from '../api'

interface SolverState {
  availableSolvers: SolverInfo[]
  selectedSolver: string
  isRunning: boolean
  currentJobId: string | null
  lastResult: OptimizationRun | null
  solverOutput: string
  error: string | null

  // Actions
  fetchSolvers: () => Promise<void>
  setSelectedSolver: (solver: string) => void
  runSolver: (modelId: number, dataFileId?: number, options?: Record<string, unknown>) => Promise<void>
  checkStatus: () => Promise<void>
  cancelJob: () => Promise<void>
  clearResult: () => void
}

export const useSolverStore = create<SolverState>((set, get) => ({
  availableSolvers: [],
  selectedSolver: 'highs',
  isRunning: false,
  currentJobId: null,
  lastResult: null,
  solverOutput: '',
  error: null,

  fetchSolvers: async () => {
    try {
      const response = await solverApi.listSolvers()
      set({ availableSolvers: response.data })
      // Set first available solver as default
      const firstAvailable = response.data.find(s => s.available)
      if (firstAvailable) {
        set({ selectedSolver: firstAvailable.name })
      }
    } catch (error) {
      set({ error: 'Failed to fetch solvers' })
    }
  },

  setSelectedSolver: (solver) => set({ selectedSolver: solver }),

  runSolver: async (modelId: number, dataFileId?: number, options?: Record<string, unknown>) => {
    const { selectedSolver } = get()
    set({ isRunning: true, error: null, solverOutput: '' })

    try {
      const response = await solverApi.run({
        model_id: modelId,
        data_file_id: dataFileId,
        solver: selectedSolver,
        options,
      })

      set({ currentJobId: response.data.job_id })

      // Poll for status
      const pollStatus = async () => {
        const { currentJobId, isRunning } = get()
        if (!currentJobId || !isRunning) return

        try {
          const statusResponse = await solverApi.getStatus(currentJobId)
          const status = statusResponse.data

          if (status.progress) {
            set({ solverOutput: status.progress.message || '' })
          }

          if (status.status === 'completed' && status.result_id !== null) {
            const resultResponse = await solverApi.getResult(status.result_id)
            set({
              isRunning: false,
              lastResult: resultResponse.data,
              solverOutput: 'Optimization completed successfully!',
              currentJobId: null,
            })
          } else if (status.status === 'failed') {
            set({
              isRunning: false,
              error: status.error || 'Solver failed',
              currentJobId: null,
            })
          } else if (status.status === 'cancelled') {
            set({
              isRunning: false,
              solverOutput: 'Solver job cancelled.',
              currentJobId: null,
            })
          } else {
            // Continue polling
            setTimeout(pollStatus, 1000)
          }
        } catch {
          setTimeout(pollStatus, 1000)
        }
      }

      pollStatus()
    } catch (error) {
      set({ isRunning: false, error: 'Failed to start solver' })
    }
  },

  checkStatus: async () => {
    const { currentJobId } = get()
    if (!currentJobId) return

    try {
      const response = await solverApi.getStatus(currentJobId)
      if (response.data.status === 'completed' && response.data.result_id !== null) {
        const resultResponse = await solverApi.getResult(response.data.result_id)
        set({ lastResult: resultResponse.data })
      }
    } catch (error) {
      set({ error: 'Failed to check status' })
    }
  },

  cancelJob: async () => {
    const { currentJobId } = get()
    if (!currentJobId) return

    try {
      await solverApi.cancel(currentJobId)
      set({ isRunning: false, currentJobId: null })
    } catch (error) {
      set({ error: 'Failed to cancel job' })
    }
  },

  clearResult: () => set({ lastResult: null, solverOutput: '', error: null }),
}))
