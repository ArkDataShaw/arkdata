// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartColors } from '../contexts/ChartColorContext';

interface ChartData {
  name: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  title: string;
  vertical?: boolean;
  color?: string;
}

export default function BarChart({ data, title, vertical = false, color }: BarChartProps) {
  const { colors } = useChartColors();
  const barColor = color || colors.bar;

  if (!data.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            layout={vertical ? 'vertical' : 'horizontal'}
          >
            {vertical ? (
              <>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
              </>
            )}
            <Tooltip />
            <Bar
              dataKey="value"
              fill={barColor}
              radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
