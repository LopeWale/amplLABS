import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
  NodeTypes,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Play, Save, Trash2, Database, Cpu, BarChart3, FileText, Settings, AlertCircle, CheckCircle } from 'lucide-react'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import { modelsApi, solverApi, AMPLModel, DataFile, SolverInfo } from '../api'

interface WorkflowExecutionState {
  status: 'idle' | 'running' | 'completed' | 'error'
  currentStep: string
  jobId?: string
  resultId?: number
  error?: string
}

// Custom Node Components
const ModelNode = ({ data }: { data: { label: string; file: string; modelId?: number } }) => (
  <div className="bg-white border-2 border-blue-500 rounded-xl p-4 min-w-[180px] shadow-lg">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
    <div className="flex items-center gap-2 mb-2">
      <FileText className="text-blue-500" size={18} />
      <span className="font-semibold text-sm">Model</span>
    </div>
    <p className="text-xs text-gray-600 truncate">{data.label || 'AMPL Model'}</p>
    <p className="text-xs text-gray-400 mt-1">{data.modelId ? `ID: ${data.modelId}` : 'Select a model'}</p>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
  </div>
)

const DataNode = ({ data }: { data: { label: string; source: string; dataFileId?: number } }) => (
  <div className="bg-white border-2 border-green-500 rounded-xl p-4 min-w-[180px] shadow-lg">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500" />
    <div className="flex items-center gap-2 mb-2">
      <Database className="text-green-500" size={18} />
      <span className="font-semibold text-sm">Data</span>
    </div>
    <p className="text-xs text-gray-600 truncate">{data.label || 'Data File'}</p>
    <p className="text-xs text-gray-400 mt-1">{data.dataFileId ? `ID: ${data.dataFileId}` : 'No data'}</p>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
  </div>
)

const SolverNode = ({ data }: { data: { solver: string; timeout: number } }) => (
  <div className="bg-white border-2 border-purple-500 rounded-xl p-4 min-w-[180px] shadow-lg">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />
    <div className="flex items-center gap-2 mb-2">
      <Cpu className="text-purple-500" size={18} />
      <span className="font-semibold text-sm">Solver</span>
    </div>
    <p className="text-xs text-gray-600">{data.solver || 'HiGHS'}</p>
    <p className="text-xs text-gray-400 mt-1">
      Timeout: {data.timeout || 300}s
    </p>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
  </div>
)

const VisualizationNode = ({ data }: { data: { type: string } }) => (
  <div className="bg-white border-2 border-orange-500 rounded-xl p-4 min-w-[180px] shadow-lg">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
    <div className="flex items-center gap-2 mb-2">
      <BarChart3 className="text-orange-500" size={18} />
      <span className="font-semibold text-sm">Visualize</span>
    </div>
    <p className="text-xs text-gray-600">{data.type || 'Network Graph'}</p>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
  </div>
)

const TransformNode = ({ data }: { data: { operation: string } }) => (
  <div className="bg-white border-2 border-yellow-500 rounded-xl p-4 min-w-[180px] shadow-lg">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-yellow-500" />
    <div className="flex items-center gap-2 mb-2">
      <Settings className="text-yellow-500" size={18} />
      <span className="font-semibold text-sm">Transform</span>
    </div>
    <p className="text-xs text-gray-600">{data.operation || 'Filter Results'}</p>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-yellow-500" />
  </div>
)

const nodeTypes: NodeTypes = {
  model: ModelNode,
  data: DataNode,
  solver: SolverNode,
  visualization: VisualizationNode,
  transform: TransformNode,
}

// Initial workflow template
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'model',
    position: { x: 100, y: 200 },
    data: { label: 'Select Model', file: '', modelId: undefined },
  },
  {
    id: '2',
    type: 'data',
    position: { x: 100, y: 350 },
    data: { label: 'Data File', source: 'Optional', dataFileId: undefined },
  },
  {
    id: '3',
    type: 'solver',
    position: { x: 350, y: 275 },
    data: { solver: 'highs', timeout: 300 },
  },
  {
    id: '4',
    type: 'visualization',
    position: { x: 600, y: 275 },
    data: { type: 'Network Graph' },
  },
]

const initialEdges: Edge[] = [
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#6366f1' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#6366f1' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#6366f1' } },
]

// Available node templates
const nodeTemplates = [
  { type: 'model', label: 'Model', icon: FileText, color: 'blue' },
  { type: 'data', label: 'Data', icon: Database, color: 'green' },
  { type: 'solver', label: 'Solver', icon: Cpu, color: 'purple' },
  { type: 'visualization', label: 'Visualize', icon: BarChart3, color: 'orange' },
  { type: 'transform', label: 'Transform', icon: Settings, color: 'yellow' },
]

export default function WorkflowCanvas() {
  const navigate = useNavigate()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [executionState, setExecutionState] = useState<WorkflowExecutionState>({ status: 'idle', currentStep: '' })

  // Data from API
  const [models, setModels] = useState<AMPLModel[]>([])
  const [dataFiles, setDataFiles] = useState<DataFile[]>([])
  const [solvers, setSolvers] = useState<SolverInfo[]>([])

  // Load models and solvers on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [modelsRes, solversRes] = await Promise.all([
          modelsApi.list(),
          solverApi.listSolvers(),
        ])
        setModels(modelsRes.data)
        setSolvers(solversRes.data)
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }
    loadData()
  }, [])

  // Load data files when a model is selected
  useEffect(() => {
    const modelNode = nodes.find(n => n.type === 'model')
    if (modelNode?.data?.modelId) {
      modelsApi.getDataFiles(modelNode.data.modelId)
        .then(res => setDataFiles(res.data))
        .catch(console.error)
    }
  }, [nodes])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#6366f1' },
    }, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type,
      position: { x: 250 + Math.random() * 100, y: 250 + Math.random() * 100 },
      data: getDefaultData(type),
    }
    setNodes((nds) => [...nds, newNode])
  }

  const getDefaultData = (type: string) => {
    switch (type) {
      case 'model': return { label: 'New Model', file: '', modelId: undefined }
      case 'data': return { label: 'New Data', source: '', dataFileId: undefined }
      case 'solver': return { solver: 'highs', timeout: 300 }
      case 'visualization': return { type: 'Network Graph' }
      case 'transform': return { operation: 'Filter' }
      default: return {}
    }
  }

  const updateNodeData = (nodeId: string, newData: Record<string, unknown>) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, ...newData } }
      }
      return node
    }))
  }

  const deleteSelected = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
      setSelectedNode(null)
    }
  }

  const runWorkflow = async () => {
    // Find model and solver nodes
    const modelNode = nodes.find(n => n.type === 'model')
    const dataNode = nodes.find(n => n.type === 'data')
    const solverNode = nodes.find(n => n.type === 'solver')
    const vizNode = nodes.find(n => n.type === 'visualization')

    if (!modelNode?.data?.modelId) {
      setExecutionState({ status: 'error', currentStep: '', error: 'Please select a model first' })
      return
    }

    if (!solverNode) {
      setExecutionState({ status: 'error', currentStep: '', error: 'Workflow needs a solver node' })
      return
    }

    setExecutionState({ status: 'running', currentStep: 'Starting solver...' })

    try {
      // Submit solver job
      const response = await solverApi.run({
        model_id: modelNode.data.modelId,
        data_file_id: dataNode?.data?.dataFileId || undefined,
        solver: solverNode.data.solver || 'highs',
        timeout: solverNode.data.timeout || 300,
      })

      const jobId = response.data.job_id
      setExecutionState({ status: 'running', currentStep: 'Solver running...', jobId })

      // Poll for status
      let completed = false
      while (!completed) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        const statusRes = await solverApi.getStatus(jobId)
        const status = statusRes.data

        if (status.status === 'completed') {
          completed = true
          setExecutionState({
            status: 'completed',
            currentStep: 'Optimization complete!',
            jobId,
            resultId: status.result_id || undefined,
          })

          // Navigate to visualization if there's a viz node
          if (vizNode && status.result_id) {
            setTimeout(() => {
              navigate(`/visualization/${status.result_id}`)
            }, 1500)
          }
        } else if (status.status === 'failed') {
          completed = true
          setExecutionState({
            status: 'error',
            currentStep: 'Solver failed',
            error: status.error || 'Unknown error',
          })
        } else {
          setExecutionState({
            status: 'running',
            currentStep: status.progress?.message || 'Solving...',
            jobId,
          })
        }
      }
    } catch (error) {
      setExecutionState({
        status: 'error',
        currentStep: 'Failed to run workflow',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const saveWorkflow = () => {
    const workflow = { nodes, edges }
    localStorage.setItem('ampl-workflow', JSON.stringify(workflow))
    alert('Workflow saved!')
  }

  const loadWorkflow = () => {
    const saved = localStorage.getItem('ampl-workflow')
    if (saved) {
      const workflow = JSON.parse(saved)
      setNodes(workflow.nodes)
      setEdges(workflow.edges)
    }
  }

  // Load saved workflow on mount
  useEffect(() => {
    loadWorkflow()
  }, [])

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar - Node Palette */}
      <div className="w-64 flex-shrink-0">
        <Card className="h-full overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Workflow Nodes</h3>
          <p className="text-xs text-gray-500 mb-4">
            Click to add nodes to canvas
          </p>

          <div className="space-y-2">
            {nodeTemplates.map((template) => {
              const Icon = template.icon
              return (
                <button
                  key={template.type}
                  onClick={() => addNode(template.type)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors text-left"
                >
                  <Icon size={20} className="text-gray-600" />
                  <span className="text-sm font-medium">{template.label}</span>
                </button>
              )
            })}
          </div>

          {/* Execution Status */}
          {executionState.status !== 'idle' && (
            <div className={`mt-4 p-3 rounded-lg ${
              executionState.status === 'running' ? 'bg-blue-50 border border-blue-200' :
              executionState.status === 'completed' ? 'bg-green-50 border border-green-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {executionState.status === 'running' && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                {executionState.status === 'completed' && <CheckCircle size={16} className="text-green-500" />}
                {executionState.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                <span className="text-sm font-medium">
                  {executionState.status === 'running' ? 'Running' :
                   executionState.status === 'completed' ? 'Completed' : 'Error'}
                </span>
              </div>
              <p className="text-xs mt-1 text-gray-600">{executionState.currentStep}</p>
              {executionState.error && (
                <p className="text-xs mt-1 text-red-600">{executionState.error}</p>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Actions</h4>
            <div className="space-y-2">
              <Button
                onClick={runWorkflow}
                isLoading={executionState.status === 'running'}
                className="w-full"
              >
                <Play size={16} />
                Run Workflow
              </Button>
              <Button variant="outline" onClick={saveWorkflow} className="w-full">
                <Save size={16} />
                Save
              </Button>
              {selectedNode && (
                <Button variant="danger" onClick={deleteSelected} className="w-full">
                  <Trash2 size={16} />
                  Delete Node
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls className="bg-white border border-gray-200 rounded-lg" />
          <MiniMap
            nodeColor={(n) => {
              switch (n.type) {
                case 'model': return '#3b82f6'
                case 'data': return '#22c55e'
                case 'solver': return '#a855f7'
                case 'visualization': return '#f97316'
                case 'transform': return '#eab308'
                default: return '#6b7280'
              }
            }}
            className="bg-white border border-gray-200 rounded-lg"
          />
          <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
            <div className="text-xs text-gray-500">
              <p><strong>Tips:</strong></p>
              <p>• Drag to connect nodes</p>
              <p>• Click node to configure</p>
              <p>• Select model before running</p>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="w-72 flex-shrink-0">
          <Card className="h-full overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Properties</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Node Type</label>
                <p className="font-medium capitalize">{selectedNode.type}</p>
              </div>

              {/* Model Node Properties */}
              {selectedNode.type === 'model' && (
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Select Model</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={selectedNode.data?.modelId || ''}
                    onChange={(e) => {
                      const modelId = e.target.value ? parseInt(e.target.value) : undefined
                      const model = models.find(m => m.id === modelId)
                      updateNodeData(selectedNode.id, {
                        modelId,
                        label: model?.name || 'Select Model',
                      })
                    }}
                  >
                    <option value="">-- Select a model --</option>
                    {models.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                  {models.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No models found. Create one in Model Editor.</p>
                  )}
                </div>
              )}

              {/* Data Node Properties */}
              {selectedNode.type === 'data' && (
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Select Data File</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={selectedNode.data?.dataFileId || ''}
                    onChange={(e) => {
                      const dataFileId = e.target.value ? parseInt(e.target.value) : undefined
                      const dataFile = dataFiles.find(d => d.id === dataFileId)
                      updateNodeData(selectedNode.id, {
                        dataFileId,
                        label: dataFile?.name || 'Data File',
                      })
                    }}
                  >
                    <option value="">-- No data file (optional) --</option>
                    {dataFiles.map(df => (
                      <option key={df.id} value={df.id}>{df.name}</option>
                    ))}
                  </select>
                  {dataFiles.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Select a model first to see data files.</p>
                  )}
                </div>
              )}

              {/* Solver Node Properties */}
              {selectedNode.type === 'solver' && (
                <>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Solver</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={selectedNode.data?.solver || 'highs'}
                      onChange={(e) => updateNodeData(selectedNode.id, { solver: e.target.value })}
                    >
                      {solvers.map(s => (
                        <option key={s.name} value={s.name} disabled={!s.available}>
                          {s.name.toUpperCase()} {!s.available && '(unavailable)'}
                        </option>
                      ))}
                      {solvers.length === 0 && (
                        <>
                          <option value="highs">HiGHS</option>
                          <option value="cbc">CBC</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={selectedNode.data?.timeout || 300}
                      onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) || 300 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min={1}
                      max={3600}
                    />
                  </div>
                </>
              )}

              {/* Visualization Node Properties */}
              {selectedNode.type === 'visualization' && (
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Chart Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={selectedNode.data?.type || 'Network Graph'}
                    onChange={(e) => updateNodeData(selectedNode.id, { type: e.target.value })}
                  >
                    <option>Network Graph</option>
                    <option>Bar Chart</option>
                    <option>Sensitivity Analysis</option>
                    <option>Table</option>
                  </select>
                </div>
              )}

              {/* Transform Node Properties */}
              {selectedNode.type === 'transform' && (
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Operation</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={selectedNode.data?.operation || 'Filter'}
                    onChange={(e) => updateNodeData(selectedNode.id, { operation: e.target.value })}
                  >
                    <option>Filter</option>
                    <option>Aggregate</option>
                    <option>Sort</option>
                    <option>Transform</option>
                  </select>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
