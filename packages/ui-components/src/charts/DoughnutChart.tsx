// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartColors } from '../contexts/ChartColorContext';

interface ChartData {
    name: string;
    value: number;
}

interface DoughnutChartProps {
    data: ChartData[];
    title: string;
    isSemi?: boolean;
    showUnknowns?: boolean;
    showPercentageInCenter?: boolean;
    tooltipOnly?: boolean;
    segmentPercentages?: boolean;
}

const RADIAN = Math.PI / 180;

export function DoughnutChart({
    data,
    title,
    isSemi = false,
    showUnknowns = false,
    showPercentageInCenter = false,
    tooltipOnly = false,
    segmentPercentages = false
}: DoughnutChartProps) {
    const { colors } = useChartColors();
    const isMaritalOrChildren = title === 'Marital Status' || title === 'Children';

    // Filter out Unknown data when showUnknowns is false
    const filteredData = showUnknowns
        ? data
        : data.filter(item => item.name !== 'Unknown');

    // Sort data to put 'Unknown' between 'Yes' and 'No'
    const sortedData = [...filteredData].sort((a, b) => {
        if (a.name === 'Yes') return -1;
        if (b.name === 'Yes') return 1;
        if (a.name === 'Unknown') return -1;
        if (b.name === 'Unknown') return 1;
        return 0;
    });

    // Calculate total and find dominant segment for center display
    const total = sortedData.reduce((sum, item) => sum + item.value, 0);
    const dominantSegment = sortedData.reduce((max, item) =>
        item.value > max.value ? item : max, sortedData[0] || { name: '', value: 0 });
    const dominantPercentage = total > 0 ? ((dominantSegment.value / total) * 100).toFixed(0) : '0';

    const renderCustomizedLabel = (props: any) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, fill } = props;

        // Calculate position on the chart edge first
        const chartRadius = outerRadius;
        const chartX = cx + chartRadius * Math.cos(-midAngle * RADIAN);
        const chartY = cy + chartRadius * Math.sin(-midAngle * RADIAN);

        // Calculate label position with consistent spacing from chart edge
        const labelDistance = 25; // Consistent distance from chart edge
        const labelX = cx + (chartRadius + labelDistance) * Math.cos(-midAngle * RADIAN);
        const labelY = cy + (chartRadius + labelDistance) * Math.sin(-midAngle * RADIAN);

        // For semi-doughnut charts, ensure labels stay above the horizontal line
        const adjustedY = isSemi ? Math.min(labelY, cy - 10) : labelY;

        // Calculate 5px tick line endpoints
        const tickEndX = cx + (chartRadius + 5) * Math.cos(-midAngle * RADIAN);
        const tickEndY = cy + (chartRadius + 5) * Math.sin(-midAngle * RADIAN);
        const adjustedTickEndY = isSemi ? Math.min(tickEndY, cy - 10) : tickEndY;

        return (
            <g>
                {/* 5px tick line */}
                <line
                    x1={chartX}
                    y1={chartY}
                    x2={tickEndX}
                    y2={adjustedTickEndY}
                    stroke={fill}
                    strokeWidth={1}
                />
                {/* Text label */}
                <text
                    x={labelX}
                    y={adjustedY}
                    fill={fill}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="18px"
                >
                    {tooltipOnly || showPercentageInCenter ? name : `${name} (${(percent * 100).toFixed(0)}%)`}
                </text>
            </g>
        );
    };

    // Additional label renderer for segment percentages
    const renderSegmentPercentage = (props: any) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
        const radius = (innerRadius + outerRadius) / 2;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="16px"
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // Custom tooltip to show detailed breakdown
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const percentage = total > 0 ? ((data.value / total) * 100).toFixed(0) : '0';
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="text-gray-800 font-medium">
                        {`${data.name}: ${percentage}%`}
                    </p>
                    <p className="text-gray-600 text-sm">
                        {`Count: ${data.value}`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {title}
            </h3>
            <div className="h-[280px] sm:h-[320px] md:h-[350px] -mt-[52px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: -75, bottom: -75 }}>
                        <Pie
                            key={`pie-${title}`}
                            data={sortedData}
                            cx="50%"
                            cy={isSemi ? "80%" : "60%"}
                            startAngle={isSemi ? 180 : 0}
                            endAngle={isSemi ? 0 : 360}
                            innerRadius="50%"
                            outerRadius={isSemi ? "80%" : "100%"}
                            paddingAngle={2}
                            dataKey="value"
                            label={renderCustomizedLabel}
                            labelLine={false}
                            animationBegin={0}
                            animationDuration={600}
                            animationEasing="ease"
                            isAnimationActive={true}
                        >
                            {sortedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors.doughnut[index % colors.doughnut.length]} />
                            ))}
                        </Pie>

                        {/* Additional pie for segment percentages */}
                        {segmentPercentages && (
                            <Pie
                                data={sortedData}
                                cx="50%"
                                cy={isSemi ? "80%" : "60%"}
                                startAngle={isSemi ? 180 : 0}
                                endAngle={isSemi ? 0 : 360}
                                innerRadius="50%"
                                outerRadius={isSemi ? "80%" : "100%"}
                                paddingAngle={2}
                                dataKey="value"
                                label={renderSegmentPercentage}
                                labelLine={false}
                                fill="none"
                                stroke="none"
                            />
                        )}

                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center percentage display */}
                {showPercentageInCenter && total > 0 && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                        style={{
                            top: isSemi ? '35%' : '50%',
                            transform: 'translateY(-50%)'
                        }}
                    >
                        <div className="text-3xl font-bold text-gray-800">
                            {dominantPercentage}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            {dominantSegment.name}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
