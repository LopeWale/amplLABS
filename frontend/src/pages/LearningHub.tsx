import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BookOpen, CheckCircle, Circle, ChevronRight, Code2, Play } from 'lucide-react'
import Card, { CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import { learningApi } from '../api'

interface Lesson {
  id: string
  title: string
  content: string
  status?: string
  codeExample?: {
    mod: string
    dat: string
  }
}

interface Module {
  id: string
  title: string
  description: string
  difficulty: string
  lessons: Lesson[]
  progress?: {
    completed: number
    total: number
    percentage: number
  }
}

export default function LearningHub() {
  const { moduleId } = useParams()
  const [modules, setModules] = useState<Module[]>([])
  const [currentModule, setCurrentModule] = useState<Module | null>(null)
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadModules()
  }, [])

  useEffect(() => {
    if (moduleId) {
      loadModule(moduleId)
    } else {
      setCurrentModule(null)
      setCurrentLesson(null)
    }
  }, [moduleId])

  const loadModules = async () => {
    try {
      const response = await learningApi.listModules()
      setModules(response.data)
    } finally {
      setIsLoading(false)
    }
  }

  const loadModule = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await learningApi.getModule(id)
      setCurrentModule(response.data)
      if (response.data.lessons?.length > 0) {
        setCurrentLesson(response.data.lessons[0])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const markLessonComplete = async (lessonId: string) => {
    if (!currentModule) return
    await learningApi.updateProgress(currentModule.id, lessonId, 'completed')
    // Reload to update progress
    loadModule(currentModule.id)
    loadModules()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  // Module list view
  if (!moduleId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Learning Hub</h2>
          <p className="text-gray-500 mt-1">
            Master optimization concepts and AMPL programming
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(module => (
            <Link key={module.id} to={`/learn/${module.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    module.difficulty === 'beginner' ? 'bg-green-100' :
                    module.difficulty === 'intermediate' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <BookOpen size={24} className={
                      module.difficulty === 'beginner' ? 'text-green-600' :
                      module.difficulty === 'intermediate' ? 'text-yellow-600' : 'text-red-600'
                    } />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{module.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        module.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                        module.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {module.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">
                        {module.progress?.completed || 0} / {module.progress?.total || module.lessons?.length || 0} lessons
                      </span>
                    </div>
                    {module.progress && module.progress.percentage > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-primary-500 rounded-full transition-all"
                            style={{ width: `${module.progress.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="text-gray-400" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Module detail view
  if (!currentModule) {
    return <div>Module not found</div>
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar - Lesson List */}
      <div className="w-72 flex-shrink-0">
        <Card padding="sm" className="h-full overflow-auto">
          <Link to="/learn" className="text-sm text-primary-600 hover:underline mb-4 block">
            &larr; All Modules
          </Link>
          <h3 className="font-semibold text-gray-900 mb-1">{currentModule.title}</h3>
          <p className="text-xs text-gray-500 mb-4">{currentModule.description}</p>

          <div className="space-y-1">
            {currentModule.lessons?.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => setCurrentLesson(lesson)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentLesson?.id === lesson.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                {lesson.status === 'completed' ? (
                  <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                ) : (
                  <Circle size={18} className="text-gray-300 flex-shrink-0" />
                )}
                <span className="text-sm truncate">{lesson.title}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {currentLesson ? (
          <Card className="h-full overflow-auto">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{currentLesson.title}</h2>

              {/* Lesson Content */}
              <div className="prose prose-sm max-w-none mb-8">
                <div dangerouslySetInnerHTML={{
                  __html: currentLesson.content?.replace(/\n/g, '<br>') || ''
                }} />
              </div>

              {/* Code Example */}
              {currentLesson.codeExample && (
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Code2 size={18} />
                    Code Example
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Model (.mod)</p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{currentLesson.codeExample.mod}</code>
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Data (.dat)</p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{currentLesson.codeExample.dat}</code>
                      </pre>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Play size={16} />
                    Try in Editor
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const currentIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id)
                    if (currentIndex > 0) {
                      setCurrentLesson(currentModule.lessons[currentIndex - 1])
                    }
                  }}
                  disabled={currentModule.lessons.findIndex(l => l.id === currentLesson.id) === 0}
                >
                  Previous
                </Button>

                {currentLesson.status !== 'completed' ? (
                  <Button onClick={() => markLessonComplete(currentLesson.id)}>
                    <CheckCircle size={18} />
                    Mark Complete
                  </Button>
                ) : (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={18} />
                    Completed
                  </span>
                )}

                <Button
                  onClick={() => {
                    const currentIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id)
                    if (currentIndex < currentModule.lessons.length - 1) {
                      setCurrentLesson(currentModule.lessons[currentIndex + 1])
                    }
                  }}
                  disabled={currentModule.lessons.findIndex(l => l.id === currentLesson.id) === currentModule.lessons.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center text-gray-500">
            Select a lesson to begin
          </Card>
        )}
      </div>
    </div>
  )
}
