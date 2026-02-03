import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api

// Types
export interface AMPLModel {
  id: number
  name: string
  description: string | null
  model_content: string
  problem_type: string | null
  tags: string[]
  is_template: boolean
  created_at: string
  updated_at: string
}

export interface DataFile {
  id: number
  model_id: number
  name: string
  file_content: string
  file_type: string
  source_excel_path: string | null
  created_at: string
  updated_at: string
}

export interface OptimizationRun {
  id: number
  model_id: number
  data_file_id: number | null
  solver_name: string
  solver_options: Record<string, unknown>
  status: 'pending' | 'queued' | 'running' | 'optimal' | 'infeasible' | 'error' | 'cancelled'
  objective_value: number | null
  solve_time: number | null
  iterations: number | null
  nodes: number | null  // For MIP problems
  gap: number | null    // MIP optimality gap
  solver_output: string | null
  sensitivity_data: Record<string, unknown> | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface SolverJobResponse {
  job_id: string
  status: string
  message: string
}

export interface SolverJobStatus {
  job_id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: { status: string; message: string } | null
  result_id: number | null
  error: string | null
}

export interface SolverInfo {
  name: string
  available: boolean
  description: string
  supports: string[]
}

// API Functions
export const modelsApi = {
  list: () => api.get<AMPLModel[]>('/models'),
  get: (id: number) => api.get<AMPLModel>(`/models/${id}`),
  create: (data: Partial<AMPLModel>) => api.post<AMPLModel>('/models', data),
  update: (id: number, data: Partial<AMPLModel>) => api.put<AMPLModel>(`/models/${id}`, data),
  delete: (id: number) => api.delete(`/models/${id}`),
  validate: (id: number) => api.post(`/models/${id}/validate`),
  getInfo: (id: number) => api.get(`/models/${id}/info`),
  getDataFiles: (modelId: number) => api.get<DataFile[]>(`/models/${modelId}/data-files`),
  createDataFile: (modelId: number, data: Partial<DataFile>) =>
    api.post<DataFile>(`/models/${modelId}/data-files`, data),
}

export const solverApi = {
  listSolvers: () => api.get<SolverInfo[]>('/solver/solvers'),
  run: (data: { model_id: number; data_file_id?: number; solver: string; options?: Record<string, unknown>; timeout?: number }) =>
    api.post<SolverJobResponse>('/solver/run', data),
  getStatus: (jobId: string) => api.get<SolverJobStatus>(`/solver/status/${jobId}`),
  cancel: (jobId: string) => api.post(`/solver/cancel/${jobId}`),
}

export const dataApi = {
  importExcel: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/data/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  exportExcel: (resultId: number) =>
    api.post(`/data/export/excel?result_id=${resultId}`, null, {
      responseType: 'blob',
    }),
  getTemplates: () => api.get('/data/templates'),
}

export const learningApi = {
  listModules: () => api.get('/learning/modules'),
  getModule: (moduleId: string) => api.get(`/learning/modules/${moduleId}`),
  getProgress: () => api.get('/learning/progress'),
  updateProgress: (moduleId: string, lessonId: string, status: string) =>
    api.post(`/learning/progress/${moduleId}/${lessonId}?status=${status}`),
}

export const visualizationApi = {
  getNetworkData: (resultId: number) => api.get(`/visualization/network/${resultId}`),
  getSensitivityData: (resultId: number) => api.get(`/visualization/sensitivity/${resultId}`),
  getComparison: (resultIds: number[]) =>
    api.get(`/visualization/comparison?result_ids=${resultIds.join(',')}`),
  getVariablesData: (resultId: number, variableName?: string) =>
    api.get(`/visualization/variables/${resultId}${variableName ? `?variable_name=${variableName}` : ''}`),
}

export const filesApi = {
  importMod: (file: File, name?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (name) formData.append('name', name)
    return api.post('/files/import/mod', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  importDat: (modelId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/files/import/dat/${modelId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  importBundle: (modFile: File, datFile?: File, name?: string) => {
    const formData = new FormData()
    formData.append('mod_file', modFile)
    if (datFile) formData.append('dat_file', datFile)
    if (name) formData.append('name', name)
    return api.post('/files/import/bundle', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  exportMod: (modelId: number) => api.get(`/files/export/mod/${modelId}`, { responseType: 'blob' }),
  exportDat: (dataFileId: number) => api.get(`/files/export/dat/${dataFileId}`, { responseType: 'blob' }),
  exportBundle: (modelId: number) => api.get(`/files/export/bundle/${modelId}`, { responseType: 'blob' }),
}

export const tutorApi = {
  ask: (message: string, context?: string, topic?: string) =>
    api.post('/tutor/ask', { message, context, topic }),
  listTopics: () => api.get('/tutor/topics'),
  getTopic: (topicId: string) => api.get(`/tutor/topic/${topicId}`),
  explainCode: (code: string) => api.post('/tutor/explain-code', { code }),
}
