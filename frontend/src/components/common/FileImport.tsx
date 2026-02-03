import { useState, useRef } from 'react'
import { Upload, FileText, File, X, Check } from 'lucide-react'
import Button from './Button'

interface FileImportProps {
  onImport: (files: { mod?: File; dat?: File }) => Promise<void>
  accept?: string
  multiple?: boolean
}

export default function FileImport({ onImport, accept = '.mod,.dat', multiple = true }: FileImportProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<{ mod?: File; dat?: File }>({})
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    processFiles(files)
  }

  const processFiles = (files: File[]) => {
    const newSelected: { mod?: File; dat?: File } = { ...selectedFiles }

    files.forEach(file => {
      if (file.name.endsWith('.mod')) {
        newSelected.mod = file
      } else if (file.name.endsWith('.dat')) {
        newSelected.dat = file
      }
    })

    setSelectedFiles(newSelected)
    setUploadStatus('idle')
  }

  const handleUpload = async () => {
    if (!selectedFiles.mod && !selectedFiles.dat) return

    setIsUploading(true)
    try {
      await onImport(selectedFiles)
      setUploadStatus('success')
      setTimeout(() => {
        setSelectedFiles({})
        setUploadStatus('idle')
      }, 2000)
    } catch {
      setUploadStatus('error')
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (type: 'mod' | 'dat') => {
    setSelectedFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[type]
      return newFiles
    })
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />

        <Upload
          size={40}
          className={`mx-auto mb-4 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`}
        />
        <p className="text-gray-600 mb-2">
          Drag & drop your <span className="font-medium">.mod</span> and{' '}
          <span className="font-medium">.dat</span> files here
        </p>
        <p className="text-sm text-gray-400">or click to browse</p>
      </div>

      {/* Selected Files */}
      {(selectedFiles.mod || selectedFiles.dat) && (
        <div className="space-y-2">
          {selectedFiles.mod && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-500" size={20} />
                <div>
                  <p className="font-medium text-sm">{selectedFiles.mod.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFiles.mod.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile('mod')}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          )}

          {selectedFiles.dat && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <File className="text-green-500" size={20} />
                <div>
                  <p className="font-medium text-sm">{selectedFiles.dat.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFiles.dat.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile('dat')}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            isLoading={isUploading}
            className="w-full mt-2"
            disabled={uploadStatus === 'success'}
          >
            {uploadStatus === 'success' ? (
              <>
                <Check size={18} />
                Imported Successfully
              </>
            ) : (
              <>
                <Upload size={18} />
                Import Files
              </>
            )}
          </Button>

          {uploadStatus === 'error' && (
            <p className="text-sm text-red-500 text-center">
              Failed to import files. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
