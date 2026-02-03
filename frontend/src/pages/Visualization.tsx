import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Network, BarChart3, TrendingUp, Download } from 'lucide-react'
import Card, { CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import NetworkGraph from '../components/visualization/NetworkGraph'
import SensitivityChart from '../components/visualization/SensitivityChart'
import { visualizationApi } from '../api'

type TabType = 'network' | 'sensitivity' | 'variables'

export default function Visualization() {
  const { resultId } = useParams()
  const [activeTab, setActiveTab] = useState<TabType>('network')
  const [networkData, setNetworkData] = useState<any>(null)
  const [sensitivityData, setSensitivityData] = useState<any>(null)
  const [variablesData, setVariablesData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (resultId) {
      loadVisualizationData(parseInt(resultId))
    }
  }, [resultId])

  const loadVisualizationData = async (id: number) => {
    setIsLoading(true)
    try {
      const [networkRes, sensitivityRes, variablesRes] = await Promise.all([
        visualizationApi.getNetworkData(id),
        visualizationApi.getSensitivityData(id),
        visualizationApi.getVariablesData(id),
      ])
      setNetworkData(networkRes.data)
      setSensitivityData(sensitivityRes.data)
      setVariablesData(variablesRes.data)
    } catch (error) {
      console.error('Failed to load visualization data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'network' as const, label: 'Network Graph', icon: Network },
    { id: 'sensitivity' as const, label: 'Sensitivity Analysis', icon: TrendingUp },
    { id: 'variables' as const, label: 'Variables', icon: BarChart3 },
  ]

  if (!resultId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Card className="text-center max-w-md">
          <Network size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Result Selected</h3>
          <p className="text-gray-500 mb-4">
            Run an optimization model first, then come here to visualize the results.
          </p>
          <Button variant="primary" onClick={() => window.location.href = '/editor'}>
            Go to Model Editor
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Result #{resultId}</h2>
          <p className="text-sm text-gray-500">Visualization and analysis</p>
        </div>
        <Button variant="outline">
          <Download size={18} />
          Export
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <Card className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </Card>
      ) : (
        <>
          {activeTab === 'network' && (
            <Card padding="none">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold">Network Flow Visualization</h3>
                <p className="text-sm text-gray-500">
                  Nodes and edges represent the optimization network
                </p>
              </div>
              {networkData ? (
                <NetworkGraph
                  nodes={networkData.nodes}
                  edges={networkData.edges}
                />
              ) : (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  No network data available for this result
                </div>
              )}
              {networkData?.summary && (
                <div className="p-4 border-t border-gray-200 flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Nodes:</span>{' '}
                    <span className="font-medium">{networkData.summary.total_nodes}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Edges:</span>{' '}
                    <span className="font-medium">{networkData.summary.total_edges}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Flow:</span>{' '}
                    <span className="font-medium">{networkData.summary.total_flow?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'sensitivity' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader
                  title="Shadow Prices"
                  description="Marginal value of constraint relaxation"
                />
                {sensitivityData?.shadow_prices?.length > 0 ? (
                  <SensitivityChart
                    data={sensitivityData.shadow_prices}
                    type="shadow_prices"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No shadow price data available
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Reduced Costs"
                  description="Sensitivity of non-basic variables"
                />
                {sensitivityData?.reduced_costs?.length > 0 ? (
                  <SensitivityChart
                    data={sensitivityData.reduced_costs}
                    type="reduced_costs"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No reduced cost data available
                  </div>
                )}
              </Card>

              {sensitivityData?.binding_constraints?.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader
                    title="Binding Constraints"
                    description="Constraints that are tight at the optimal solution"
                  />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Constraint</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-500">Index</th>
                          <th className="text-right py-2 px-3 font-medium text-gray-500">Shadow Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensitivityData.binding_constraints.map((c: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-medium">{c.constraint}</td>
                            <td className="py-2 px-3 text-gray-500">
                              {c.index ? c.index.join(', ') : '-'}
                            </td>
                            <td className="py-2 px-3 text-right">{c.dual?.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'variables' && (
            <Card>
              <CardHeader
                title="Variable Values"
                description="Optimal values of decision variables"
              />
              {variablesData?.variables && Object.keys(variablesData.variables).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(variablesData.variables).map(([varName, values]: [string, any]) => (
                    <div key={varName}>
                      <h4 className="font-medium text-gray-900 mb-2">{varName}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-3 font-medium text-gray-500">Index</th>
                              <th className="text-right py-2 px-3 font-medium text-gray-500">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {values.filter((v: any) => v.value !== 0).map((v: any, i: number) => (
                              <tr key={i} className="border-b border-gray-100">
                                <td className="py-2 px-3">{v.label}</td>
                                <td className="py-2 px-3 text-right font-mono">{v.value?.toFixed(4)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No variable data available
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
