import { create } from 'zustand'

export type TutorAnalysisFocus = 'network' | 'sensitivity' | 'variables' | 'overall'

export interface TutorResultContext {
  resultId: number
  analysisFocus: TutorAnalysisFocus
}

interface TutorState {
  isOpen: boolean
  seedMessage: string | null
  resultContext: TutorResultContext | null
  open: () => void
  close: () => void
  setSeedMessage: (message: string | null) => void
  openWithResultContext: (context: TutorResultContext, seedMessage?: string) => void
  clearResultContext: () => void
}

export const useTutorStore = create<TutorState>((set) => ({
  isOpen: false,
  seedMessage: null,
  resultContext: null,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, seedMessage: null, resultContext: null }),
  setSeedMessage: (seedMessage) => set({ seedMessage }),

  openWithResultContext: (resultContext, seedMessage) =>
    set({
      isOpen: true,
      resultContext,
      seedMessage: seedMessage ?? null,
    }),

  clearResultContext: () => set({ resultContext: null }),
}))
