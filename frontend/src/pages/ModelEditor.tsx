import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Play, FileText, Settings, Plus, Trash2 } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import AMPLEditor from '../components/editor/AMPLEditor'
import SolverPanel from '../components/solver/SolverPanel'
import ResultsPanel from '../components/solver/ResultsPanel'
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
    updateModelContent,
  } = useModelStore()

  const { isRunning, lastResult, runSolver } = useSolverStore()

  const [modelName, setModelName] = useState('Untitled Model')
  const [modelContent, setModelContent] = useState('')
  const [dataContent, setDataContent] = useState('')
  const [activeTab, setActiveTab] = useState<'model' | 'data'>('model')
  const [isSaving, setIsSaving] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [dataFiles, setDataFiles] = useState<any[]>([])

  useEffect(() => {
    if (modelId) {
      fetchModel(parseInt(modelId))
      modelsApi.getDataFiles(parseInt(modelId)).then(res => {
        setDataFiles(res.data)
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

  useEffect(() => {
    if (lastResult) {
      setShowResults(true)
    }
  }, [lastResult])

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
  }

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
          <Button onClick={handleRun} isLoading={isRunning}>
            <Play size={18} />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0">
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

        {/* Side Panel */}
        <div className="w-80 flex flex-col gap-4 min-h-0">
          {/* Solver Panel */}
          <SolverPanel onRun={handleRun} />

          {/* Results Panel */}
          {showResults && lastResult && (
            <Card className="flex-1 overflow-auto">
              <ResultsPanel resultId={lastResult.id} />
            </Card>
          )}
        </div>
      </div>
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
