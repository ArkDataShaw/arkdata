// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useChartColors } from '../contexts/ChartColorContext';

interface ChartData {
  name: string;
  value: number;
}

interface HorizontalBarChartProps {
  data: ChartData[];
  title: string;
  color: string;
  showUnknowns?: boolean;
  initialDisplay?: number;
}

export function HorizontalBarChart({
  data,
  title,
  color,
  initialDisplay = 5,
  showUnknowns = false
}: HorizontalBarChartProps) {
  const { colors } = useChartColors();
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartHeight, setChartHeight] = useState(300);
  const [labelWidth, setLabelWidth] = useState(120);
  const [skipExpandAnimation, setSkipExpandAnimation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isIndustriesChart = title === 'Industries';
  const isDepartmentsChart = title === 'Departments';
  const isJobTitlesChart = title === 'Job Titles';
  const isSeniorityChart = title === 'Seniority Levels';
  const isAgeChart = title === 'Age Distribution';
  const isGenderChart = title === 'Gender Distribution';
  const isB2BChart = isIndustriesChart || isDepartmentsChart || isJobTitlesChart || isSeniorityChart;

  // Modified logic to handle unknown values
  const unknownData = data.filter(item => item.name === 'Unknown' && item.value > 0);
  const regularData = data.filter(item => item.name !== 'Unknown' || item.value === 0);

  const getDisplayData = () => {
    // Special handling for Age Distribution chart
    if (isAgeChart) {
      // Filter out Unknown for Age chart when showUnknowns is false
      return showUnknowns ? data : data.filter(item => item.name !== 'Unknown');
    }

    // Special handling for Gender Distribution chart
    if (isGenderChart) {
      // Return only non-Unknown data when showUnknowns is false
      return data.filter(item => showUnknowns || item.name !== 'Unknown');
    }

    // Handle B2B charts
    if (isB2BChart) {
      // When showing unknowns, include all data
      if (showUnknowns) {
        // If expanded, show all data
        if (isExpanded) {
          return data;
        }
        // If collapsed, show initial display count plus unknowns
        const withoutUnknowns = data.filter(item => item.name !== 'Unknown');
        return [...withoutUnknowns.slice(0, initialDisplay), ...unknownData];
      }
      // When not showing unknowns, filter out Unknown items
      const filtered = data.filter(item => item.name !== 'Unknown');
      return isExpanded ? filtered : filtered.slice(0, initialDisplay);
    }

    // Handle non-B2B charts (Income, Age, etc.)
    // Always filter out Unknown when showUnknowns is false
    if (!showUnknowns) {
      const filtered = data.filter(item => item.name !== 'Unknown');
      return isExpanded ? filtered : filtered.slice(0, initialDisplay);
    }

    // When showUnknowns is true
    return isExpanded ? data : [...regularData.slice(0, initialDisplay), ...unknownData];
  };

  const displayData = getDisplayData();
  const hasMoreData = !isAgeChart && !isSeniorityChart && regularData.length > initialDisplay;

  // Format label text for specific cases
  const formatLabelText = (name: string) => {
    if (name === "Information Technology") {
      return "IT";
    }
    if (name === "Information Technology & Services") {
      return "IT Services";
    }
    if (name === "Higher Education") {
      return "Higher Ed";
    }
    // Only for Industries chart when collapsed, break "IT Services & IT Consulting" into two lines
    if (isIndustriesChart && !isExpanded && name === "IT Services & IT Consulting") {
      return "IT Services &\nIT Consulting";
    }
    if (isIndustriesChart && !isExpanded && name === "Hospitals & Health Care") {
      return "Hospitals &\nHealth Care";
    }
    if (isIndustriesChart && !isExpanded && name === "Financial Services") {
      return "Financial\nServices";
    }
    if ((isIndustriesChart || isJobTitlesChart) && (name.includes("Administration") || name.includes("Administrative"))) {
      let result = name.replace(/Administration|Administrative/, "Admin");
      // Further shorten "Government Admin" to "Gov. Admin."
      if (result === "Government Admin") {
        return "Gov. Admin.";
      }
      return result;
    }
    return name;
  };

  // Adjust bar size and gap based on chart type and state
  const calculateBarSizeAndGap = () => {
    // Special cases with fixed sizes
    if (isGenderChart) return { barSize: 64, barGap: 32 };
    if (isAgeChart) return { barSize: 32, barGap: 16 };

    // For expanded state, just use fixed small sizes regardless of unknowns
    if (isExpanded) return { barSize: 16, barGap: 3 };

    // For collapsed state (not expanded):

    // Base number of items to display
    const baseItemCount = initialDisplay;

    // Target height for consistency - this is the height we want to maintain
    const targetHeight = 300;

    // How much space we have per bar in the standard case (no unknowns)
    const heightPerItem = targetHeight / baseItemCount;

    // Calculate bar size as percentage of available height
    const calculatedBarSize = Math.floor(heightPerItem * 0.85);
    const calculatedBarGap = Math.floor(heightPerItem * 0.15);

    // Ensure minimum and maximum values
    const barSize = Math.min(Math.max(calculatedBarSize, 40), 60);

    // Calculate variable gap but ensure it's at least 3px
    const barGap = Math.max(calculatedBarGap, 3);

    return { barSize, barGap };
  };

  const { barSize, barGap } = calculateBarSizeAndGap();

  // Calculate dynamic label width based on content
  useEffect(() => {
    const calculateLabelWidth = () => {
      const maxLabelLength = Math.max(...displayData.map(item => item.name.length));
      // Optimized character width for departments
      const charWidth = (() => {
        if (isDepartmentsChart) {
          return isExpanded ? 7.2 : 5.6;
        }
        if (isIndustriesChart) {
          return isExpanded ? 7.2 : 5.6;
        }
        return 6.5;
      })();

      // Minimal padding for departments
      const padding = (() => {
        if (isDepartmentsChart) {
          return isExpanded ? 24 : 2;
        }
        return isExpanded ? 24 : 8;
      })();

      const calculatedWidth = Math.ceil(maxLabelLength * charWidth) + padding;

      // Adjusted width ranges for departments
      let finalWidth = calculatedWidth;
      if (isDepartmentsChart) {
        finalWidth = isExpanded
          ? Math.max(Math.min(calculatedWidth, 220), 160)
          : Math.max(Math.min(calculatedWidth, 130), 171);
      } else if (isIndustriesChart) {
        finalWidth = isExpanded
          ? Math.max(Math.min(calculatedWidth, 220), 160)
          : Math.max(Math.min(calculatedWidth, 160), 120);
      } else {
        finalWidth = Math.max(Math.min(calculatedWidth, 180), 120);
      }

      setLabelWidth(finalWidth);
    };

    calculateLabelWidth();
  }, [displayData, isIndustriesChart, isDepartmentsChart, isExpanded]);

  useEffect(() => {
    if (isGenderChart || isAgeChart) {
      // Fixed height for special charts
      setChartHeight(300);
    } else if (isExpanded) {
      // In expanded mode, adjust height based on number of items
      const heightPerItem = barSize + barGap;
      const totalHeight = Math.max(300, displayData.length * heightPerItem);
      setChartHeight(totalHeight);
    } else {
      // In collapsed mode:
      // For charts without unknowns, maintain standard height
      if (!showUnknowns || !unknownData.length) {
        setChartHeight(300);
      } else {
        // When unknowns are present, calculate height to fit initialDisplay + 1 items
        // but with smaller bars to maintain consistent card height
        const displayCount = Math.min(initialDisplay, regularData.length);
        const totalItems = displayCount + (unknownData.length > 0 ? 1 : 0);
        const targetHeight = 300; // Standard target height

        // Adjust height based on actual number of items
        setChartHeight(targetHeight);
      }
    }
  }, [isExpanded, isAgeChart, isGenderChart, displayData.length, barSize, barGap, showUnknowns, unknownData.length, regularData.length, initialDisplay]);

  // Calculate chart margins dynamically
  const getChartMargins = () => {
    const baseMargin = { top: 4, bottom: 16, left: 0, right: 0 };
    const rightMargin = 24;

    // Optimized left margin calculation
    const leftMargin = (() => {
      if (isDepartmentsChart) {
        return isExpanded ? -8 : -20;
      }
      if (isIndustriesChart) {
        if (isExpanded) {
          return -8;
        } else {
          const maxLabelLength = Math.max(...displayData.map(item => item.name.length));
          return -12 + (maxLabelLength > 25 ? 4 : 0);
        }
      }
      return isExpanded ? 0 : -8;
    })();

    return {
      ...baseMargin,
      left: leftMargin,
      right: rightMargin
    };
  };

  // Get the appropriate color based on the chart type
  const getChartColor = () => {
    if (isIndustriesChart) return colors.industries;
    if (isJobTitlesChart) return colors.jobTitles;
    if (isDepartmentsChart) return colors.departments;
    if (isSeniorityChart) return colors.seniority;
    if (isGenderChart) return colors.gender;
    if (isAgeChart) return colors.age;
    return colors.bar;
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6"
      ref={containerRef}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        {hasMoreData && (
          <button
            onClick={() => {
              setSkipExpandAnimation(true);
              setIsExpanded(!isExpanded);
              // Reset skipAnimation after the expand/collapse transition
              setTimeout(() => setSkipExpandAnimation(false), 50);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 inline mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 inline mr-1" />
                Show More
              </>
            )}
          </button>
        )}
      </div>
      <div
        className="overflow-y-auto"
        style={{ height: `${chartHeight}px` }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            layout="vertical"
            margin={getChartMargins()}
            barSize={barSize}
            barGap={0}
          >
            <XAxis
              type="number"
              tickLine={true}
              axisLine={true}
              height={24}
              tickMargin={4}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={labelWidth}
              tick={(props) => {
                const { x, y, payload } = props;
                // Apply text formatting to the label
                const formattedText = formatLabelText(payload.value);
                const lines = formattedText.split('\n');

                // Calculate font size and styles based on chart type
                const fontSize = !isExpanded ? 16 : 12;
                const textAnchor = 'end';
                const dx = (() => {
                  if (isDepartmentsChart) {
                    return isExpanded ? -12 : -2;
                  }
                  return isExpanded ? -12 : -6;
                })();

                return (
                  <g transform={`translate(${x},${y})`}>
                    {lines.map((line, i) => (
                      <text
                        key={i}
                        x={0}
                        y={i * 8 + 2} // Add spacing between lines
                        dx={dx}
                        dy={lines.length > 1 ? (i === 0 ? -8 : 0) : 0} // Adjust vertical position for multi-line text
                        textAnchor={textAnchor}
                        fill="#374151"
                        fontSize={fontSize}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              }}
              interval={0}
              tickLine={true}
              tickSize={4}
              axisLine={true}
            />
            <Tooltip />
            <Bar
              key={`horizontal-bar-${title}`}
              dataKey="value"
              fill={getChartColor()}
              radius={[0, 4, 4, 0]}
              isAnimationActive={!skipExpandAnimation}
              animationBegin={0}
              animationDuration={600}
              animationEasing="ease"
              shape={(props: any) => {
                // Apply a custom shape to ensure visible gap
                const { x, y, width, height, fill } = props;

                // Different margin sizes based on chart state
                let topMargin = 3;
                let bottomMargin = 3;

                // Reduce gap when expanded or showing unknowns
                if (isExpanded || showUnknowns) {
                  topMargin = 1;
                  bottomMargin = 1;
                }

                // Even smaller gap when both expanded and showing unknowns
                if (isExpanded && showUnknowns) {
                  topMargin = 0.5;
                  bottomMargin = 0.5;
                }

                return (
                  <rect
                    x={x}
                    y={y + topMargin}
                    width={width}
                    height={height - (topMargin + bottomMargin)}
                    fill={fill}
                    rx={4}
                    ry={4}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
