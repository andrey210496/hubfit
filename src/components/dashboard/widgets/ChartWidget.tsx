import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface ChartWidgetProps {
  type: 'pie' | 'bar' | 'line';
  data: any[];
  config?: {
    dataKey?: string;
    nameKey?: string;
    colors?: string[];
    bars?: Array<{ dataKey: string; name: string; color: string }>;
    lines?: Array<{ dataKey: string; name: string; color: string }>;
  };
  legend?: boolean;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  
  return (
    <div className="neu-raised p-3 rounded-xl border-0 shadow-lg">
      {label && <p className="text-sm font-medium mb-1">{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export function ChartWidget({ 
  type, 
  data, 
  config = {},
  legend = true,
  height = 220
}: ChartWidgetProps) {
  const defaultColors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

  if (type === 'pie') {
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={4}
              dataKey={config.dataKey || 'value'}
              nameKey={config.nameKey || 'name'}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || (config.colors?.[index] || defaultColors[index % defaultColors.length])}
                  className="drop-shadow-md"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {legend && (
          <div className="flex justify-center gap-4 mt-2">
            {data.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color || config.colors?.[idx] || defaultColors[idx % defaultColors.length] }}
                />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip content={<CustomTooltip />} />
            {legend && <Legend />}
            {config.bars?.map((bar, idx) => (
              <Bar 
                key={bar.dataKey}
                dataKey={bar.dataKey} 
                name={bar.name} 
                fill={bar.color} 
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip content={<CustomTooltip />} />
            {legend && <Legend />}
            {config.lines?.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={2.5}
                dot={{ fill: line.color, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
