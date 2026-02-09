// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartColors } from '../contexts/ChartColorContext';
import { INCOME_RANGE_LABELS } from '../utils/dataTransformers';

interface ChartData {
  name: string;
  value: number;
}

interface VerticalBarChartProps {
  data: ChartData[];
  title: string;
  color: string;
  showUnknowns?: boolean;
  height?: number;
  noWrapper?: boolean;
}

export function VerticalBarChart({ data, title, color, showUnknowns = false, height = 320, noWrapper = false }: VerticalBarChartProps) {
  const { colors } = useChartColors();
  const isFinancialChart = title.includes('Income') || title.includes('Net Worth');
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter out Unknown data when showUnknowns is false
  const displayData = showUnknowns
    ? data
    : data.filter(item => item.name !== 'Unknown');

  // Responsive margins based on screen size
  const getResponsiveMargins = () => {
    if (screenWidth >= 1280) {
      // xl+ screens: normal margins
      return {
        left: 20,
        right: 20,
        top: 20,
        bottom: 25
      };
    } else if (screenWidth >= 1024) {
      // lg screens: reduced margins for more chart space
      return {
        left: 12,
        right: 12,
        top: 20,
        bottom: 25
      };
    } else {
      // Mobile screens: minimal margins
      return {
        left: -4,
        right: 0,
        top: 16,
        bottom: 25
      };
    }
  };

  // Get the appropriate color based on the chart type
  const getChartColor = () => {
    if (color) return color;
    if (title.includes('Income')) return colors.income;
    if (title.includes('Net Worth')) return colors.netWorth;
    if (title.includes('Company Size')) return colors.companySize;
    if (title.includes('Company Revenue')) return colors.companyRevenue;
    return colors.bar;
  };

  // Add a formatter function to directly handle the display of income data
  const formatAxisTick = (value) => {
    // Check if this is an income value
    if (title.includes('Income')) {
      // First check if we have a direct match in our INCOME_RANGE_LABELS
      if (INCOME_RANGE_LABELS[value]) {
        return INCOME_RANGE_LABELS[value];
      }

      // Special cases for more variations of income ranges
      if (value.includes('$200,000 to $249')) {
        return '$200k - $250k';
      }

      if (value.toLowerCase().includes('less than $20')) {
        return '< $20k';
      }

      // For other ranges that might be missing from mapping
      if (value.includes('$20,000 to $44')) return '$20k - $45k';
      if (value.includes('$45,000 to $59')) return '$45k - $60k';
      if (value.includes('$60,000 to $74')) return '$60k - $75k';
      if (value.includes('$75,000 to $99')) return '$75k - $100k';
      if (value.includes('$100,000 to $149')) return '$100k - $150k';
      if (value.includes('$150,000 to $199')) return '$150k - $200k';
      if (value.includes('$250,000')) return '> $250k';
    }

    // Handle "$1,000,000 or more" format for any chart
    if (value.includes('$1,000,000') || value.includes('1 Million') || value.includes('$1M')) {
      if (value.includes('more') || value.includes('More') || value.includes('>')) {
        return '$1M+';
      }
    }

    // Shorten Company Size labels to prevent clipping
    if (title.includes('Company Size')) {
      if (value === '501 to 1000') return '501 to 1k';
      if (value === '1001 to 5000') return '1k to 5k';
      if (value === '5001 to 10000') return '5k to 10k';
      if (value === '10000+') return '10k+';
    }

    return value;
  };

  const chartContent = (
    <div className="flex flex-col h-full">
      {title && <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>}
      <div className="flex-grow min-h-0" style={{ overflow: 'visible' }}>
        <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
          <BarChart
            data={displayData}
            margin={getResponsiveMargins()}
            style={{ overflow: 'visible' }}
          >
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
              tickFormatter={formatAxisTick}
              tick={{
                fontSize: isFinancialChart || title.includes('Company Size') || title.includes('Company Revenue') || title.includes('Credit Rating') ? 16 : 12
              }}
              tickMargin={4}
            />
            <YAxis
              tick={{
                fontSize: isFinancialChart || title.includes('Company Size') || title.includes('Company Revenue') || title.includes('Credit Rating') ? 16 : 11
              }}
            />
            <Tooltip />
            <Bar
              key={`vertical-bar-${title}`}
              dataKey="value"
              fill={getChartColor()}
              radius={[4, 4, 0, 0]}
              animationBegin={0}
              animationDuration={600}
              animationEasing="ease"
              isAnimationActive={true}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (noWrapper) {
    return <>{chartContent}</>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
      {chartContent}
    </div>
  );
}
