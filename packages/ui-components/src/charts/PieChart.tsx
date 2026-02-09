// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartColors } from '../contexts/ChartColorContext';

interface ChartData {
  name: string;
  value: number;
}

interface PieChartProps {
  data: ChartData[];
  title: string;
  variant?: 'pie' | 'doughnut' | 'semi-doughnut';
}

export default function PieChart({
  data,
  title,
  variant = 'pie'
}: PieChartProps) {
  const { colors } = useChartColors();

  if (!data || !data.length) return null;

  const isSemi = variant === 'semi-doughnut';
  const isDoughnut = variant === 'doughnut' || variant === 'semi-doughnut';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy={isSemi ? "90%" : "50%"}
              startAngle={isSemi ? 180 : 0}
              endAngle={isSemi ? 0 : 360}
              innerRadius={isDoughnut ? "60%" : 0}
              outerRadius={isSemi ? "90%" : "80%"}
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors.doughnut[index % colors.doughnut.length]} />
              ))}
            </Pie>
            <Tooltip />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
