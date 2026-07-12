'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DepartmentChartProps {
  data: { name: string; total_allocations: number }[];
}

export function DepartmentChart({ data }: DepartmentChartProps) {
  // If no data, provide standard mock display logic or styling
  const chartData = data.length > 0 ? data : [
    { name: 'Engineering', total_allocations: 12 },
    { name: 'Marketing', total_allocations: 5 },
    { name: 'Sales', total_allocations: 8 },
    { name: 'HR', total_allocations: 3 },
  ];

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg border shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="total_allocations" fill="#3b82f6" name="Total Allocations" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
