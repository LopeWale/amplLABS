import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Save, Play, FileText, Settings, X, GripVertical, CheckCircle, XCircle, BarChart3, Download, ExternalLink, Zap, Square } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import AMPLEditor from '../components/editor/AMPLEditor'
import { useModelStore } from '../store/modelStore'
import { useSolverStore } from '../store/solverStore'
import { modelsApi } from '../api'

export default function ModelEditor() {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const {
    currentModel,
    currentDataFile,
    fetchModel,
    createModel,
    updateModel,
    setCurrentModel,
    setCurrentDataFile,
  } = useModelStore()

  const {
    availableSolvers,
    selectedSolver,
    isRunning,
    lastResult,
    solverOutput,
    error,
    fetchSolvers,
    setSelectedSolver,
    cancelJob,
    runSolver,
  } = useSolverStore()

  const [modelName, setModelName] = useState('Untitled Model')
  const [modelContent, setModelContent] = useState('')
  const [dataContent, setDataContent] = useState('')
  const [activeTab, setActiveTab] = useState<'model' | 'data'>('model')
  const [isSaving, setIsSaving] = useState(false)

  // Solver modal state
  const [showSolverModal, setShowSolverModal] = useState(false)

  // Resizable panel state
  const [editorWidth, setEditorWidth] = useState(60) // percentage
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSolvers()
  }, [fetchSolvers])

  useEffect(() => {
    if (modelId) {
      fetchModel(parseInt(modelId))
      modelsApi.getDataFiles(parseInt(modelId)).then(res => {
        if (res.data.length > 0) {
          setDataContent(res.data[0].file_content)
          setCurrentDataFile(res.data[0])
        }
      })
    } else {
      // New model
      setCurrentModel(null)
      setModelContent(getDefaultModelTemplate())
      setDataContent(getDefaultDataTemplate())
    }
  }, [modelId, fetchModel, setCurrentModel, setCurrentDataFile])

  useEffect(() => {
    if (currentModel) {
      setModelName(currentModel.name)
      setModelContent(currentModel.model_content)
    }
  }, [currentModel])

  // Handle resize
  const handleMouseDown = useCallback(() => {
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return

    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100

    // Clamp between 30% and 80%
    setEditorWidth(Math.min(80, Math.max(30, newWidth)))
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (currentModel) {
        await updateModel(currentModel.id, {
          name: modelName,
          model_content: modelContent,
        })
      } else {
        const newModel = await createModel({
          name: modelName,
          model_content: modelContent,
          problem_type: 'LP',
        })
        navigate(`/editor/${newModel.id}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleRun = async () => {
    // Save first if needed
    if (!currentModel) {
      const newModel = await createModel({
        name: modelName,
        model_content: modelContent,
        problem_type: 'LP',
      })

      // Create data file if there's data content
      if (dataContent.trim()) {
        await modelsApi.createDataFile(newModel.id, {
          name: 'data.dat',
          file_content: dataContent,
        })
      }

      navigate(`/editor/${newModel.id}`)
      await runSolver(newModel.id, undefined)
    } else {
      // Update model content
      await updateModel(currentModel.id, { model_content: modelContent })

      // Update or create data file
      if (dataContent.trim()) {
        if (currentDataFile) {
          // Would need an update endpoint
        } else {
          const newDataFile = await modelsApi.createDataFile(currentModel.id, {
            name: 'data.dat',
            file_content: dataContent,
          })
          setCurrentDataFile(newDataFile.data)
        }
      }

      await runSolver(currentModel.id, currentDataFile?.id)
    }

    // Close modal after starting run
    setShowSolverModal(false)
  }

  const resultStatus = lastResult?.status ?? 'unknown'
  const isOptimal = resultStatus === 'optimal'
  const statusLabel = resultStatus.charAt(0).toUpperCase() + resultStatus.slice(1)

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            placeholder="Model name..."
          />
          {currentModel && (
            <span className="text-sm text-gray-500">
              Last saved: {new Date(currentModel.updated_at).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} isLoading={isSaving}>
            <Save size={18} />
            Save
          </Button>
          <Button variant="outline" onClick={() => setShowSolverModal(true)}>
            <Settings size={18} />
            Solver
          </Button>
          <Button onClick={handleRun} isLoading={isRunning}>
            <Play size={18} />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Main Content - Horizontal Resizable Panels */}
      <div
        ref={containerRef}
        className="flex-1 flex min-h-0"
      >
        {/* Editor Panel */}
        <div
          className="flex flex-col min-w-0"
          style={{ width: `${editorWidth}%` }}
        >
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => setActiveTab('model')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === 'model'
                  ? 'bg-white text-primary-600 border border-b-0 border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={16} />
              Model (.mod)
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === 'data'
                  ? 'bg-white text-primary-600 border border-b-0 border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings size={16} />
              Data (.dat)
            </button>
          </div>

          {/* Editor */}
          <Card padding="none" className="flex-1 overflow-hidden">
            <AMPLEditor
              value={activeTab === 'model' ? modelContent : dataContent}
              onChange={activeTab === 'model' ? setModelContent : setDataContent}
              language={activeTab === 'model' ? 'ampl' : 'ampl-data'}
            />
          </Card>
        </div>

        {/* Resizable Divider */}
        <div
          className={`w-2 flex items-center justify-center cursor-col-resize hover:bg-primary-100 transition-colors mx-1 ${
            isResizing ? 'bg-primary-200' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          <GripVertical size={16} className="text-gray-400" />
        </div>

        {/* Results Panel */}
        <div
          className="flex flex-col min-w-0"
          style={{ width: `calc(${100 - editorWidth}% - 1rem)` }}
        >
          <div className="flex items-center gap-2 mb-2 h-[42px]">
            <h3 className="text-sm font-medium text-gray-700">Results</h3>
            {lastResult && (
              <Link to={`/visualization/${lastResult.id}`}>
                <Button variant="ghost" size="sm">
                  <BarChart3 size={14} />
                  Visualize
                </Button>
              </Link>
            )}
          </div>

          <Card className="flex-1 overflow-auto">
            {!lastResult ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Play size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No results yet</p>
                <p className="text-sm">Run your model to see optimization results</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Status Header */}
                <div className={`flex items-center gap-3 p-4 rounded-lg mb-4 ${
                  isOptimal ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {isOptimal ? (
                    <CheckCircle className="text-green-500" size={24} />
                  ) : (
                    <XCircle className="text-red-500" size={24} />
                  )}
                  <div>
                    <span className={`font-semibold text-lg ${isOptimal ? 'text-green-700' : 'text-red-700'}`}>
                      {statusLabel}
                    </span>
                    <p className="text-sm text-gray-500">
                      Solver: {lastResult.solver_name?.toUpperCase() || selectedSolver.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {lastResult.objective_value !== null && lastResult.objective_value !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Objective Value</p>
                      <p className="text-2xl font-mono font-bold text-gray-900">
                        {typeof lastResult.objective_value === 'number'
                          ? lastResult.objective_value.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })
                          : lastResult.objective_value}
                      </p>
                    </div>
                  )}

                  {lastResult.solve_time !== null && lastResult.solve_time !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Solve Time</p>
                      <p className="text-2xl font-mono font-bold text-gray-900">
                        {typeof lastResult.solve_time === 'number'
                          ? `${lastResult.solve_time.toFixed(3)}s`
                          : lastResult.solve_time}
                      </p>
                    </div>
                  )}

                  {lastResult.iterations !== null && lastResult.iterations !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Iterations</p>
                      <p className="text-2xl font-mono font-bold text-gray-900">
                        {lastResult.iterations}
                      </p>
                    </div>
                  )}

                  {lastResult.gap !== null && lastResult.gap !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">MIP Gap</p>
                      <p className="text-2xl font-mono font-bold text-gray-900">
                        {(lastResult.gap * 100).toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Solver Output */}
                {(lastResult.solver_output || solverOutput || error) && (
                  <div className="flex-1 min-h-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Solver Output</p>
                    <div className={`h-full max-h-[300px] overflow-auto p-4 rounded-lg font-mono text-sm ${
                      error ? 'bg-red-50 text-red-700' : 'bg-gray-900 text-green-400'
                    }`}>
                      <pre className="whitespace-pre-wrap">
                        {error || lastResult.solver_output || solverOutput}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  <Link to={`/visualization/${lastResult.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <ExternalLink size={16} />
                      View Details
                    </Button>
                  </Link>
                  <Button variant="outline">
                    <Download size={16} />
                    Export
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Solver Modal */}
      {showSolverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-primary-600" />
                <h2 className="text-lg font-semibold">Solver Configuration</h2>
              </div>
              <button
                onClick={() => setShowSolverModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Solver Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Solver
                </label>
                <select
                  value={selectedSolver}
                  onChange={(e) => setSelectedSolver(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base"
                  disabled={isRunning}
                >
                  {availableSolvers.map((solver) => (
                    <option
                      key={solver.name}
                      value={solver.name}
                      disabled={!solver.available}
                    >
                      {solver.name.toUpperCase()}
                      {!solver.available && ' (not available)'}
                    </option>
                  ))}
                </select>
                {selectedSolver && (
                  <p className="text-sm text-gray-500 mt-2">
                    {availableSolvers.find((s) => s.name === selectedSolver)?.description}
                  </p>
                )}
              </div>

              {/* Solver Capabilities */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Supports:</p>
                <div className="flex flex-wrap gap-2">
                  {availableSolvers
                    .find((s) => s.name === selectedSolver)
                    ?.supports.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full font-medium"
                      >
                        {type}
                      </span>
                    ))}
                </div>
              </div>

              {/* Status/Output */}
              {(solverOutput || error) && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-2">Status</p>
                  <div
                    className={`p-3 rounded-lg text-sm font-mono ${
                      error
                        ? 'bg-red-50 text-red-700'
                        : isRunning
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {error || solverOutput}
                  </div>
                </div>
              )}

              {/* Quick Tips */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Zap size={16} className="text-yellow-500" />
                  Quick Tips
                </div>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Use HiGHS for fast LP/MIP solving</li>
                  <li>• Gurobi/CPLEX for large-scale problems</li>
                  <li>• Check solver output for infeasibility hints</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowSolverModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              {isRunning ? (
                <Button
                  variant="danger"
                  onClick={cancelJob}
                  className="flex-1"
                >
                  <Square size={16} />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={handleRun}
                  className="flex-1"
                >
                  <Play size={16} />
                  Run Optimization
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getDefaultModelTemplate(): string {
  return `# AMPL Model
# DSA 5113 - Advanced Analytics and Metaheuristics

# Sets
set NODES;

# Parameters
param cost {NODES, NODES} >= 0;

# Decision Variables
var x {i in NODES, j in NODES} >= 0;

# Objective
minimize TotalCost:
    sum {i in NODES, j in NODES} cost[i,j] * x[i,j];

# Constraints
subject to Example {i in NODES}:
    sum {j in NODES} x[i,j] <= 100;
`
}

function getDefaultDataTemplate(): string {
  return `# AMPL Data File

set NODES := A B C;

param cost:
        A   B   C :=
    A   0   10  20
    B   10  0   15
    C   20  15  0;
`
}
