import { useEffect } from 'react'
import { Play, Square, Settings, Zap } from 'lucide-react'
import Card, { CardHeader } from '../common/Card'
import Button from '../common/Button'
import { useSolverStore } from '../../store/solverStore'

interface SolverPanelProps {
  onRun: () => void
}

export default function SolverPanel({ onRun }: SolverPanelProps) {
  const {
    availableSolvers,
    selectedSolver,
    isRunning,
    solverOutput,
    error,
    fetchSolvers,
    setSelectedSolver,
    cancelJob,
  } = useSolverStore()

  useEffect(() => {
    fetchSolvers()
  }, [fetchSolvers])

  return (
    <Card>
      <CardHeader
        title="Solver"
        description="Configure and run optimization"
      />

      {/* Solver Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Solver
        </label>
        <select
          value={selectedSolver}
          onChange={(e) => setSelectedSolver(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          <p className="text-xs text-gray-500 mt-1">
            {availableSolvers.find((s) => s.name === selectedSolver)?.description}
          </p>
        )}
      </div>

      {/* Solver Capabilities */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Supports:</p>
        <div className="flex flex-wrap gap-1">
          {availableSolvers
            .find((s) => s.name === selectedSolver)
            ?.supports.map((type) => (
              <span
                key={type}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {type}
              </span>
            ))}
        </div>
      </div>

      {/* Run/Cancel Buttons */}
      <div className="flex gap-2">
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
            onClick={onRun}
            className="flex-1"
          >
            <Play size={16} />
            Run
          </Button>
        )}
      </div>

      {/* Status/Output */}
      {(solverOutput || error) && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
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
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Zap size={14} />
          Quick Tips
        </div>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Use HiGHS for fast LP/MIP solving</li>
          <li>• Gurobi/CPLEX for large-scale problems</li>
          <li>• Check solver output for infeasibility hints</li>
        </ul>
      </div>
    </Card>
  )
}
