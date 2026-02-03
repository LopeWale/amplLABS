import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ShadowPriceData {
  constraint: string
  index: string[] | null
  dual: number
  slack?: number
}

interface ReducedCostData {
  variable: string
  index: string[] | null
  value: number
  reduced_cost: number
}

interface SensitivityChartProps {
  data: ShadowPriceData[] | ReducedCostData[]
  type: 'shadow_prices' | 'reduced_costs'
}

export default function SensitivityChart({ data, type }: SensitivityChartProps) {
  // Transform data for the chart
  const chartData = data.map((item, index) => {
    if (type === 'shadow_prices') {
      const sp = item as ShadowPriceData
      return {
        name: sp.index ? `${sp.constraint}[${sp.index.join(',')}]` : sp.constraint,
        value: sp.dual,
        slack: sp.slack,
      }
    } else {
      const rc = item as ReducedCostData
      return {
        name: rc.index ? `${rc.variable}[${rc.index.join(',')}]` : rc.variable,
        value: rc.reduced_cost,
        currentValue: rc.value,
      }
    }
  }).slice(0, 15) // Limit to 15 items for readability

  const getBarColor = (value: number) => {
    if (value > 0) return '#22c55e'
    if (value < 0) return '#ef4444'
    return '#94a3b8'
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11 }}
            width={90}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200 text-sm">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-gray-600">
                      {type === 'shadow_prices' ? 'Shadow Price' : 'Reduced Cost'}:{' '}
                      <span className="font-mono">{data.value?.toFixed(4)}</span>
                    </p>
                    {data.slack !== undefined && (
                      <p className="text-gray-600">
                        Slack: <span className="font-mono">{data.slack?.toFixed(4)}</span>
                      </p>
                    )}
                    {data.currentValue !== undefined && (
                      <p className="text-gray-600">
                        Value: <span className="font-mono">{data.currentValue?.toFixed(4)}</span>
                      </p>
                    )}
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
