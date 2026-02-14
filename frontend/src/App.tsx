import { Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import Dashboard from './pages/Dashboard'
import ModelEditor from './pages/ModelEditor'
import Visualization from './pages/Visualization'
import LearningHub from './pages/LearningHub'
import History from './pages/History'
import WorkflowCanvas from './pages/WorkflowCanvas'
import AITutor, { AITutorButton } from './components/learning/AITutor'
import { useTutorStore } from './store/tutorStore'

function App() {
  const { isOpen, open, close } = useTutorStore()

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor" element={<ModelEditor />} />
        <Route path="/editor/:modelId" element={<ModelEditor />} />
        <Route path="/visualization" element={<Visualization />} />
        <Route path="/visualization/:resultId" element={<Visualization />} />
        <Route path="/learn" element={<LearningHub />} />
        <Route path="/learn/:moduleId" element={<LearningHub />} />
        <Route path="/workflow" element={<WorkflowCanvas />} />
        <Route path="/history" element={<History />} />
      </Routes>

      {/* AI Tutor */}
      <AITutorButton onClick={open} />
      <AITutor isOpen={isOpen} onClose={close} />
    </Layout>
  )
}

export default App
