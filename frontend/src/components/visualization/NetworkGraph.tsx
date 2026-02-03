import { useEffect, useRef, useCallback } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'
// @ts-ignore
import dagre from 'cytoscape-dagre'

// Register dagre layout
cytoscape.use(dagre)

interface NetworkNode {
  id: string
  label: string
  type?: 'source' | 'sink' | 'transshipment' | 'default'
  value?: number
}

interface NetworkEdge {
  source: string
  target: string
  flow: number
  capacity?: number
  variable?: string
}

interface NetworkGraphProps {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  layout?: 'dagre' | 'circle' | 'grid' | 'concentric'
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edge: NetworkEdge) => void
}

export default function NetworkGraph({
  nodes,
  edges,
  layout = 'dagre',
  onNodeClick,
  onEdgeClick,
}: NetworkGraphProps) {
  const cyRef = useRef<cytoscape.Core | null>(null)

  // Convert data to Cytoscape format
  const elements = [
    ...nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label || node.id,
        type: node.type || 'default',
        value: node.value,
      },
    })),
    ...edges.map((edge, index) => ({
      data: {
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        flow: edge.flow,
        capacity: edge.capacity || edge.flow,
        label: edge.capacity
          ? `${edge.flow.toFixed(1)}/${edge.capacity.toFixed(1)}`
          : edge.flow.toFixed(1),
        utilization: edge.capacity ? edge.flow / edge.capacity : 1,
        variable: edge.variable,
      },
    })),
  ]

  const stylesheet: cytoscape.Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#6366f1',
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        color: '#fff',
        'font-size': '12px',
        'font-weight': 'bold',
        width: 50,
        height: 50,
        'text-wrap': 'wrap',
        'text-max-width': '80px',
      },
    },
    {
      selector: 'node[type="source"]',
      style: {
        'background-color': '#22c55e',
        shape: 'round-rectangle',
      },
    },
    {
      selector: 'node[type="sink"]',
      style: {
        'background-color': '#ef4444',
        shape: 'round-rectangle',
      },
    },
    {
      selector: 'node[type="transshipment"]',
      style: {
        'background-color': '#f59e0b',
        shape: 'diamond',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '10px',
        'text-background-color': '#fff',
        'text-background-opacity': 0.9,
        'text-background-padding': '3px',
        color: '#374151',
      },
    },
    {
      selector: 'edge[utilization > 0.8]',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        width: 5,
      },
    },
    {
      selector: 'edge[utilization > 0.5][utilization <= 0.8]',
      style: {
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        width: 4,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#1e40af',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#1e40af',
        'target-arrow-color': '#1e40af',
        width: 6,
      },
    },
  ]

  const layoutConfig = {
    name: layout,
    rankDir: 'LR',
    nodeSep: 80,
    rankSep: 100,
    padding: 30,
    animate: true,
    animationDuration: 500,
  }

  const handleCy = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy

    cy.on('tap', 'node', (e) => {
      const nodeId = e.target.id()
      onNodeClick?.(nodeId)
    })

    cy.on('tap', 'edge', (e) => {
      const data = e.target.data()
      onEdgeClick?.({
        source: data.source,
        target: data.target,
        flow: data.flow,
        capacity: data.capacity,
        variable: data.variable,
      })
    })
  }, [onNodeClick, onEdgeClick])

  if (nodes.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p>No network data to display</p>
          <p className="text-sm mt-1">Run an optimization with flow variables to visualize</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <CytoscapeComponent
        elements={elements}
        stylesheet={stylesheet}
        layout={layoutConfig}
        style={{ width: '100%', height: '400px' }}
        cy={handleCy}
        wheelSensitivity={0.3}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded-lg shadow-sm border border-gray-200 text-xs">
        <p className="font-medium mb-2">Legend</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Sink</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary-500" />
            <span>Node</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-1 bg-gray-400" />
            <span>&lt;50%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-1 bg-yellow-500" />
            <span>50-80%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-1 bg-red-500" />
            <span>&gt;80%</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => cyRef.current?.fit()}
          className="px-3 py-1.5 bg-white rounded shadow-sm border border-gray-200 text-sm hover:bg-gray-50"
        >
          Fit
        </button>
        <button
          onClick={() => cyRef.current?.center()}
          className="px-3 py-1.5 bg-white rounded shadow-sm border border-gray-200 text-sm hover:bg-gray-50"
        >
          Center
        </button>
      </div>
    </div>
  )
}
