import { useRef } from 'react'
import Editor, { OnMount, Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface AMPLEditorProps {
  value: string
  onChange: (value: string) => void
  language?: 'ampl' | 'ampl-data'
  readOnly?: boolean
}

export default function AMPLEditor({
  value,
  onChange,
  language = 'ampl',
  readOnly = false,
}: AMPLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const editorLanguage = language === 'ampl-data' ? 'ampl' : language

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Register AMPL language
    registerAMPLLanguage(monaco)

    // Set the language for the current model
    const model = editor.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, editorLanguage)
    }
  }

  return (
    <Editor
      height="100%"
      defaultLanguage={editorLanguage}
      value={value}
      onChange={(value) => onChange(value || '')}
      onMount={handleEditorDidMount}
      theme="amplTheme"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 4,
        insertSpaces: true,
        readOnly,
        automaticLayout: true,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
        },
      }}
    />
  )
}

function registerAMPLLanguage(monaco: Monaco) {
  // Check if language is already registered
  const languages = monaco.languages.getLanguages()
  if (languages.some((lang) => lang.id === 'ampl')) {
    return
  }

  // Register AMPL language
  monaco.languages.register({ id: 'ampl' })

  // Define AMPL tokenizer
  monaco.languages.setMonarchTokensProvider('ampl', {
    keywords: [
      'set', 'param', 'var', 'maximize', 'minimize', 'subject', 'to',
      'data', 'option', 'solve', 'display', 'printf', 'for',
      'if', 'then', 'else', 'in', 'by', 'while', 'repeat', 'until',
      'sum', 'prod', 'max', 'min', 'abs', 'ceil', 'floor', 'round',
      'sqrt', 'exp', 'log', 'log10', 'sin', 'cos', 'tan',
      'binary', 'integer', 'symbolic', 'ordered', 'circular',
      'within', 'default', 'cross', 'diff', 'symdiff', 'union', 'inter',
      'reset', 'let', 'fix', 'unfix', 'drop', 'restore',
      'include', 'model', 'commands', 'end', 'and', 'or', 'not',
    ],

    typeKeywords: [
      'binary', 'integer', 'symbolic', 'ordered', 'circular',
    ],

    operators: [
      ':=', '<=', '>=', '==', '!=', '<>', '..', '+', '-', '*', '/', '^',
      '!', '&&', '||', '<', '>', '=',
    ],

    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.square' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' },
    ],

    tokenizer: {
      root: [
        // Comments
        [/#.*$/, 'comment'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],

        // Numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],

        // Keywords and identifiers
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@typeKeywords': 'keyword.type',
            '@default': 'identifier',
          },
        }],

        // Delimiters
        [/[{}()\[\]]/, '@brackets'],
        [/[;,:]/, 'delimiter'],

        // Operators
        [/:=|<=|>=|==|!=|<>|\.\./, 'operator'],
        [/[+\-*\/^<>=!]/, 'operator'],

        // Whitespace
        [/\s+/, 'white'],
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop'],
      ],
    },
  })

  // Define AMPL theme
  monaco.editor.defineTheme('amplTheme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
      { token: 'keyword.type', foreground: '008080' },
      { token: 'comment', foreground: '008000' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'number.float', foreground: '098658' },
      { token: 'operator', foreground: '000000' },
      { token: 'identifier', foreground: '001080' },
      { token: 'delimiter', foreground: '000000' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#000000',
      'editor.lineHighlightBackground': '#F5F5F5',
      'editorLineNumber.foreground': '#999999',
      'editorCursor.foreground': '#000000',
    },
  })

  // Register completion provider
  monaco.languages.registerCompletionItemProvider('ampl', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions = [
        // Keywords
        { label: 'set', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'set ${1:NAME};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'param', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'param ${1:name} {${2:SET}};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'var', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'var ${1:name} {${2:SET}} >= 0;', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'maximize', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'maximize ${1:ObjectiveName}:\n    sum {${2:i in SET}} ${3:expression};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'minimize', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'minimize ${1:ObjectiveName}:\n    sum {${2:i in SET}} ${3:expression};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'subject to', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'subject to ${1:ConstraintName} {${2:i in SET}}:\n    ${3:expression};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'sum', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sum {${1:i in SET}} ${2:expression}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },

        // Common patterns
        { label: 'transportation', kind: monaco.languages.CompletionItemKind.Snippet, insertText: [
          '# Transportation Problem Template',
          'set ORIGINS;',
          'set DESTINATIONS;',
          '',
          'param supply {ORIGINS} >= 0;',
          'param demand {DESTINATIONS} >= 0;',
          'param cost {ORIGINS, DESTINATIONS} >= 0;',
          '',
          'var ship {i in ORIGINS, j in DESTINATIONS} >= 0;',
          '',
          'minimize TotalCost:',
          '    sum {i in ORIGINS, j in DESTINATIONS} cost[i,j] * ship[i,j];',
          '',
          'subject to Supply {i in ORIGINS}:',
          '    sum {j in DESTINATIONS} ship[i,j] <= supply[i];',
          '',
          'subject to Demand {j in DESTINATIONS}:',
          '    sum {i in ORIGINS} ship[i,j] >= demand[j];',
        ].join('\n'), insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Transportation problem template' },
      ]

      return { suggestions }
    },
  })
}
