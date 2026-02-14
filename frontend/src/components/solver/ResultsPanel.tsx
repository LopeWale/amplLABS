import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, BarChart3, Download, ExternalLink } from 'lucide-react'
import Button from '../common/Button'

interface ResultsPanelProps {
  resultId: number
}

interface Result {
  id: number
  status: string
  objective_value: number | null
  solve_time: number | null
  iterations: number | null
  solver_name: string
  solver_output: string | null
}

export default function ResultsPanel({ resultId }: ResultsPanelProps) {
  const [result, setResult] = useState<Result | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadResult()
  }, [resultId])

  const loadResult = async () => {
    setIsLoading(true)
    try {
      // This would need an endpoint to get result by ID
      // For now using placeholder
      setResult({
        id: resultId,
        status: 'optimal',
        objective_value: 12345.67,
        solve_time: 0.45,
        iterations: 150,
        solver_name: 'highs',
        solver_output: 'Optimization completed successfully',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No results available</p>
      </div>
    )
  }

  const isOptimal = result.status === 'optimal'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Results</h3>
        <Link to={`/visualization/${resultId}`}>
          <Button variant="ghost" size="sm">
            <BarChart3 size={16} />
            Visualize
          </Button>
        </Link>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
        isOptimal ? 'bg-green-50' : 'bg-red-50'
      }`}>
        {isOptimal ? (
          <CheckCircle className="text-green-500" size={20} />
        ) : (
          <XCircle className="text-red-500" size={20} />
        )}
        <span className={`font-medium ${isOptimal ? 'text-green-700' : 'text-red-700'}`}>
          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {result.objective_value !== null && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Objective Value</span>
            <span className="font-mono font-medium">
              {result.objective_value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
          </div>
        )}

        {result.solve_time !== null && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Solve Time</span>
            <span className="font-mono">{result.solve_time.toFixed(3)}s</span>
          </div>
        )}

        {result.iterations !== null && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Iterations</span>
            <span className="font-mono">{result.iterations}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Solver</span>
          <span className="text-sm font-medium uppercase">{result.solver_name}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
        <Link to={`/visualization/${resultId}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink size={14} />
            Details
          </Button>
        </Link>
        <Button variant="outline" size="sm">
          <Download size={14} />
          Export
        </Button>
      </div>
    </div>
  )
}
