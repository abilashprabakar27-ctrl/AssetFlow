'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface DepartmentChartProps {
  data: { name: string; total_allocations: number }[];
}

const GRADIENT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/60 rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm">
        <p className="text-sm font-bold mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          Allocations: <span className="font-bold text-foreground">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function DepartmentChart({ data }: DepartmentChartProps) {
  const chartData = data.length > 0 ? data : [
    { name: 'Engineering', total_allocations: 0 },
    { name: 'Marketing',   total_allocations: 0 },
    { name: 'HR',          total_allocations: 0 },
  ];

  return (
    <div className="w-full h-[380px] rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.4)', radius: 8 }} />
          <Bar dataKey="total_allocations" name="Allocations" radius={[8, 8, 0, 0]} maxBarSize={72}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
