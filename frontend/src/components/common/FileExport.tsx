import { Download, FileText, File, Package } from 'lucide-react'
import Button from './Button'

interface FileExportProps {
  modelId: number
  modelName: string
  hasDataFile: boolean
  dataFileId?: number
}

export default function FileExport({ modelId, modelName, hasDataFile, dataFileId }: FileExportProps) {
  const handleExportMod = async () => {
    const response = await fetch(`/api/v1/files/export/mod/${modelId}`)
    const blob = await response.blob()
    downloadBlob(blob, `${modelName.replace(/\s+/g, '_')}.mod`)
  }

  const handleExportDat = async () => {
    if (!dataFileId) return
    const response = await fetch(`/api/v1/files/export/dat/${dataFileId}`)
    const blob = await response.blob()
    downloadBlob(blob, `${modelName.replace(/\s+/g, '_')}.dat`)
  }

  const handleExportBundle = async () => {
    const response = await fetch(`/api/v1/files/export/bundle/${modelId}`)
    const blob = await response.blob()
    downloadBlob(blob, `${modelName.replace(/\s+/g, '_')}_bundle.zip`)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Export Files</h4>

      <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" size="sm" onClick={handleExportMod} className="justify-start">
          <FileText size={16} className="text-blue-500" />
          Export Model (.mod)
        </Button>

        {hasDataFile && dataFileId && (
          <Button variant="outline" size="sm" onClick={handleExportDat} className="justify-start">
            <File size={16} className="text-green-500" />
            Export Data (.dat)
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={handleExportBundle} className="justify-start">
          <Package size={16} className="text-purple-500" />
          Export All (.zip)
        </Button>
      </div>
    </div>
  )
}
