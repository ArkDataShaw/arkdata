// @ts-nocheck
import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js';
import { B2CData } from '../types/data';

interface PopulationPyramidProps {
    data: B2CData[];
}

// Define specific order for age ranges to ensure pyramid shape is logical
const AGE_ORDER = [
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55-64',
    '65+'
];

export const PopulationPyramid: React.FC<PopulationPyramidProps> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        // Aggregation Logic
        const ageGroups = [...AGE_ORDER];
        const maleCounts = new Array(ageGroups.length).fill(0);
        const femaleCounts = new Array(ageGroups.length).fill(0);

        data.forEach(item => {
            let age = (item.AGE_RANGE || '').toString().trim();
            const gender = item.GENDER;

            // Consolidate anyone 65+ or "65 and older" into the same bin (case-insensitive)
            const lowerAge = age.toLowerCase();
            if (lowerAge === '65-74' || lowerAge === '75+' || lowerAge === '65+' || lowerAge === '65 and older') {
                age = '65+';
            }

            const ageIndex = ageGroups.indexOf(age);
            if (ageIndex !== -1) {
                if (gender === 'M' || gender === 'Male') {
                    maleCounts[ageIndex] += 1;
                } else if (gender === 'F' || gender === 'Female') {
                    femaleCounts[ageIndex] += 1;
                }
            }
        });

        // Chart.js requires one side to be negative for pyramid effect
        const maleData = maleCounts.map(count => -count); // Left side
        const femaleData = femaleCounts; // Right side

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            // Destroy previous instance
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            chartInstanceRef.current = new Chart(ctx, {
                type: 'horizontalBar',
                data: {
                    labels: ageGroups,
                    datasets: [
                        {
                            label: 'Male      ',
                            stack: 'Stack 0',
                            backgroundColor: '#3b82f6', // blue-500
                            data: maleData,
                            barPercentage: 0.9,
                            categoryPercentage: 1.0,
                        },
                        {
                            label: 'Female',
                            stack: 'Stack 0',
                            backgroundColor: '#ec4899', // pink-500
                            data: femaleData,
                            barPercentage: 0.9,
                            categoryPercentage: 1.0,
                        },
                    ],
                },
                options: {
                    title: {
                        display: false
                    },
                    tooltips: {
                        intersect: false,
                        titleFontSize: 18,
                        bodyFontSize: 16,
                        xPadding: 14,
                        yPadding: 14,
                        bodySpacing: 4,
                        cornerRadius: 8,
                        callbacks: {
                            label: (tooltipItem, data) => {
                                const datasetIndex = tooltipItem.datasetIndex!;
                                const index = tooltipItem.index!;
                                const currentLabel = (data.datasets![datasetIndex].label || '').trim();

                                const maleVal = Math.abs(Number(data.datasets![0].data![index]));
                                const femaleVal = Math.abs(Number(data.datasets![1].data![index]));

                                const currentValStr = Math.abs(Number(tooltipItem.value)).toLocaleString();
                                const otherValStr = (currentLabel === 'Male' ? femaleVal : maleVal).toLocaleString();

                                // Determine padding for the value to right-align
                                // Use non-breaking spaces (\u00A0) to prevent trimming
                                const nbsp = '\u00A0';
                                const diff = Math.max(0, otherValStr.length - currentValStr.length);
                                const valuePadding = nbsp.repeat(diff * 2); // Double space per digit for proportional font width

                                // Align colons: 'Female' is wider than 'Male'
                                // Pad both for consistent colon position
                                const label = currentLabel === 'Male' ? `Male${nbsp.repeat(8)}` : `Female${nbsp.repeat(4)}`;

                                return `${label}:${nbsp}${valuePadding}${currentValStr}`;
                            }
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        position: 'bottom',
                        labels: {
                            fontSize: 14,
                            fontColor: '#4b5563', // gray-600
                            padding: 5
                        }
                    },
                    scales: {
                        xAxes: [
                            {
                                stacked: false, // Important: false for pyramid effect so they grow from center
                                ticks: {
                                    beginAtZero: true,
                                    fontSize: 14,
                                    callback: (value) => Math.abs(Number(value)).toLocaleString(), // Hide negative signs
                                },
                                gridLines: {
                                    color: 'rgba(0, 0, 0, 0.05)',
                                    zeroLineColor: 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                        ],
                        yAxes: [
                            {
                                stacked: true,
                                position: 'left',
                                ticks: {
                                    fontSize: 14,
                                },
                                gridLines: {
                                    display: false
                                }
                            }
                        ],
                    },
                },
            });
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [data]);

    return (
        <div className="w-full h-full flex flex-col">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Population Pyramid</h3>
            <div className="flex-grow">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
};
