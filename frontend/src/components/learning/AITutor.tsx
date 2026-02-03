import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Lightbulb, Code, HelpCircle, X, Maximize2, Minimize2 } from 'lucide-react'
import Button from '../common/Button'
import Card from '../common/Card'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  codeExample?: string
  suggestions?: string[]
}

interface AITutorProps {
  context?: string  // Current code context
  isOpen: boolean
  onClose: () => void
}

export default function AITutor({ context, isOpen, onClose }: AITutorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AMPL Tutor. I can help you with:\n\n- AMPL syntax (sets, params, vars, constraints)\n- Problem formulations\n- Debugging errors\n- Understanding optimization concepts\n\nWhat would you like to learn about?",
      suggestions: ['Explain sets in AMPL', 'How do I write a constraint?', 'Help me with transportation problem'],
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: context,
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        codeExample: data.code_example,
        suggestions: data.suggestions,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm having trouble connecting. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed bottom-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 transition-all ${
        isExpanded ? 'w-[600px] h-[700px]' : 'w-[400px] h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600 rounded-t-2xl">
        <div className="flex items-center gap-2 text-white">
          <Bot size={20} />
          <span className="font-semibold">AMPL Tutor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <Minimize2 size={16} className="text-white" />
            ) : (
              <Maximize2 size={16} className="text-white" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' ? 'bg-primary-100' : 'bg-gray-100'
              }`}
            >
              {message.role === 'user' ? (
                <User size={16} className="text-primary-600" />
              ) : (
                <Bot size={16} className="text-gray-600" />
              )}
            </div>

            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`inline-block p-3 rounded-2xl text-sm ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white rounded-tr-md'
                    : 'bg-gray-100 text-gray-800 rounded-tl-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* Code Example */}
                {message.codeExample && (
                  <div className="mt-3 p-3 bg-gray-900 rounded-lg text-left">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                      <Code size={12} />
                      AMPL Code
                    </div>
                    <pre className="text-green-400 text-xs font-mono overflow-x-auto">
                      {message.codeExample}
                    </pre>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                    >
                      <Lightbulb size={12} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Bot size={16} className="text-gray-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-md p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Topics */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Sets', 'Parameters', 'Variables', 'Constraints', 'MIP', 'Sensitivity'].map(topic => (
            <button
              key={topic}
              onClick={() => sendMessage(`Explain ${topic.toLowerCase()} in AMPL`)}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 whitespace-nowrap transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about AMPL or optimization..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            disabled={isLoading}
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  )
}

// Floating button to open the tutor
export function AITutorButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40 group"
    >
      <HelpCircle size={24} className="group-hover:scale-110 transition-transform" />
    </button>
  )
}
