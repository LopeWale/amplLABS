import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, AlertCircle, BarChart3, Trash2 } from 'lucide-react'
import Card, { CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../api'

interface HistoryItem {
  id: number
  model_id: number
  model_name?: string
  solver_name: string
  status: string
  objective_value: number | null
  solve_time: number | null
  created_at: string
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      // This would need a results listing endpoint
      // For now, using a placeholder
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal':
        return <CheckCircle className="text-green-500" size={18} />
      case 'infeasible':
      case 'error':
        return <XCircle className="text-red-500" size={18} />
      case 'running':
        return <Clock className="text-blue-500 animate-spin" size={18} />
      default:
        return <AlertCircle className="text-yellow-500" size={18} />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      optimal: 'bg-green-100 text-green-700',
      infeasible: 'bg-red-100 text-red-700',
      error: 'bg-red-100 text-red-700',
      running: 'bg-blue-100 text-blue-700',
      queued: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Optimization History</h2>
          <p className="text-gray-500 mt-1">
            View and compare your past optimization runs
          </p>
        </div>
        <Button variant="outline">
          Export All
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No optimization runs yet</h3>
            <p className="text-gray-500 mb-4">
              Run your first optimization model to see results here
            </p>
            <Link to="/editor">
              <Button>Go to Model Editor</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Model</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Solver</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Objective</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link
                        to={`/editor/${item.model_id}`}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        {item.model_name || `Model #${item.model_id}`}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600">{item.solver_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {item.objective_value?.toFixed(4) || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">
                      {item.solve_time ? `${item.solve_time.toFixed(2)}s` : '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/visualization/${item.id}`}>
                          <Button variant="ghost" size="sm">
                            <BarChart3 size={16} />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Statistics */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-500">Total Runs</p>
            <p className="text-2xl font-bold">{history.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Successful</p>
            <p className="text-2xl font-bold text-green-600">
              {history.filter(h => h.status === 'optimal').length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {history.filter(h => ['error', 'infeasible'].includes(h.status)).length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Avg. Solve Time</p>
            <p className="text-2xl font-bold">
              {(history.reduce((sum, h) => sum + (h.solve_time || 0), 0) / history.length).toFixed(2)}s
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
