import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Code2, Play, BookOpen, TrendingUp, Plus } from 'lucide-react'
import Card, { CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import { useModelStore } from '../store/modelStore'
import { learningApi } from '../api'

export default function Dashboard() {
  const { models, fetchModels } = useModelStore()
  const [learningModules, setLearningModules] = useState<any[]>([])
  const [recentRuns] = useState<any[]>([])

  useEffect(() => {
    fetchModels()
    learningApi.listModules().then(res => setLearningModules(res.data))
  }, [fetchModels])

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome to AMPL Learning Tool</h2>
        <p className="text-primary-100 mb-4">
          DSA 5113 - Advanced Analytics and Metaheuristics
        </p>
        <div className="flex gap-3">
          <Link to="/editor">
            <Button className="bg-white text-primary-700 hover:bg-primary-50">
              <Code2 size={18} />
              New Model
            </Button>
          </Link>
          <Link to="/learn">
            <Button variant="outline" className="border-white text-white hover:bg-primary-700">
              <BookOpen size={18} />
              Start Learning
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Code2 className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{models.length}</p>
            <p className="text-sm text-gray-500">Models</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Play className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{recentRuns.length}</p>
            <p className="text-sm text-gray-500">Runs Today</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <BookOpen className="text-purple-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{learningModules.length}</p>
            <p className="text-sm text-gray-500">Modules</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="text-orange-600" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">0%</p>
            <p className="text-sm text-gray-500">Progress</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Models */}
        <Card>
          <CardHeader
            title="Recent Models"
            description="Your optimization models"
            action={
              <Link to="/editor">
                <Button size="sm" variant="outline">
                  <Plus size={16} />
                  New
                </Button>
              </Link>
            }
          />
          {models.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Code2 size={40} className="mx-auto mb-2 opacity-50" />
              <p>No models yet</p>
              <Link to="/editor" className="text-primary-600 hover:underline text-sm">
                Create your first model
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {models.slice(0, 5).map(model => (
                <Link
                  key={model.id}
                  to={`/editor/${model.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Code2 size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{model.name}</p>
                      <p className="text-xs text-gray-500">
                        {model.problem_type || 'General'} • Updated {new Date(model.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {model.tags.length > 0 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {model.tags[0]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Learning Progress */}
        <Card>
          <CardHeader
            title="Learning Progress"
            description="Continue where you left off"
            action={
              <Link to="/learn">
                <Button size="sm" variant="outline">View All</Button>
              </Link>
            }
          />
          {learningModules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen size={40} className="mx-auto mb-2 opacity-50" />
              <p>Loading modules...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {learningModules.slice(0, 4).map(module => (
                <Link
                  key={module.id}
                  to={`/learn/${module.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      module.difficulty === 'beginner' ? 'bg-green-100' :
                      module.difficulty === 'intermediate' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <BookOpen size={20} className={
                        module.difficulty === 'beginner' ? 'text-green-600' :
                        module.difficulty === 'intermediate' ? 'text-yellow-600' : 'text-red-600'
                      } />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{module.title}</p>
                      <p className="text-xs text-gray-500">{module.difficulty}</p>
                    </div>
                  </div>
                  <div className="w-16">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-primary-500 rounded-full"
                        style={{ width: `${module.progress?.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Examples */}
      <Card>
        <CardHeader
          title="Quick Start Examples"
          description="Pre-built optimization models to help you get started"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: 'Transportation Problem',
              description: 'Classic supply chain optimization',
              type: 'LP',
              color: 'blue',
            },
            {
              name: 'Assignment Problem',
              description: 'Optimal task allocation',
              type: 'MIP',
              color: 'green',
            },
            {
              name: 'Production Planning',
              description: 'Multi-period scheduling',
              type: 'LP',
              color: 'purple',
            },
          ].map(example => (
            <div
              key={example.name}
              className={`p-4 rounded-xl border-2 border-dashed border-${example.color}-200 hover:border-${example.color}-400 transition-colors cursor-pointer`}
            >
              <h4 className="font-medium text-gray-900">{example.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{example.description}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 bg-${example.color}-100 text-${example.color}-700 text-xs rounded`}>
                {example.type}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
