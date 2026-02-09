import React, { createContext, useContext, useState, useEffect } from 'react';

interface ChartColors {
    baseColor: string;
    accentColor: string;
    primaryColor1: string;
    primaryColor2: string;
    primaryColor3: string;
    primaryColor4: string;
    doughnut: string[];
    bar: string;
    industries: string;
    jobTitles: string;
    departments: string;
    seniority: string;
    gender: string;
    age: string;
    income: string;
    netWorth: string;
    companySize: string;
    companyRevenue: string;
    [key: string]: string | string[]; // Add index signature
}

// Function to adjust color based on base color
function adjustColor(baseColor: string, redOffset: number, blueOffset: number): string {
    // Parse the base color
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Apply offsets and ensure values stay within 0-255 range
    const newR = Math.min(255, Math.max(0, r + redOffset));
    const newB = Math.min(255, Math.max(0, b + blueOffset));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Function to generate accent color from base color
function generateAccentColor(baseColor: string): string {
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Make it darker and more saturated
    const newR = Math.max(0, r - 59);
    const newG = Math.max(0, g - 66);
    const newB = Math.max(0, b - 15);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Function to generate related colors from base color
function generateRelatedColors(baseColor: string): { colors: string[], accentColor: string } {
    const accentColor = generateAccentColor(baseColor);

    return {
        colors: [
            baseColor,
            adjustColor(baseColor, 30, -4),   // Second color
            adjustColor(baseColor, 65, -15),  // Third color
            adjustColor(baseColor, 85, -12)   // Fourth color
        ],
        accentColor
    };
}

const defaultBaseColor = '#60A5FA';
const defaultAccentColor = generateAccentColor(defaultBaseColor);

const defaultColors: ChartColors = {
    baseColor: defaultBaseColor,
    accentColor: defaultAccentColor,
    primaryColor1: defaultBaseColor,
    primaryColor2: '#818CF8',
    primaryColor3: '#A78BFA',
    primaryColor4: '#C084FC',
    doughnut: [defaultBaseColor, '#818CF8', '#A78BFA', '#C084FC'],
    bar: '#4F46E5',
    industries: defaultBaseColor,
    jobTitles: '#818CF8',
    departments: '#A78BFA',
    seniority: '#C084FC',
    gender: defaultBaseColor,
    age: '#818CF8',
    income: defaultBaseColor,
    netWorth: '#818CF8',
    companySize: defaultBaseColor,
    companyRevenue: '#818CF8'
};

interface ChartColorContextType {
    colors: ChartColors;
    updateBaseColor: (color: string) => void;
    updateAccentColor: (color: string) => void;
    updateColor: (chartType: string, color: string) => void;
}

const ChartColorContext = createContext<ChartColorContextType | undefined>(undefined);

export function ChartColorProvider({ children }: { children: React.ReactNode }) {
    const [colors, setColors] = useState<ChartColors>(defaultColors);

    const updateBaseColor = (newBaseColor: string) => {
        const { colors: relatedColors, accentColor } = generateRelatedColors(newBaseColor);
        setColors(prevColors => ({
            ...prevColors,
            baseColor: newBaseColor,
            accentColor: accentColor,
            primaryColor1: relatedColors[0],
            primaryColor2: relatedColors[1],
            primaryColor3: relatedColors[2],
            primaryColor4: relatedColors[3],
            doughnut: relatedColors,
            industries: relatedColors[0],
            jobTitles: relatedColors[1],
            departments: relatedColors[2],
            seniority: relatedColors[3],
            gender: relatedColors[0],
            age: relatedColors[1],
            income: relatedColors[0],
            netWorth: relatedColors[1],
            companySize: relatedColors[0],
            companyRevenue: relatedColors[1]
        }));
    };

    const updateAccentColor = (newAccentColor: string) => {
        setColors(prevColors => ({
            ...prevColors,
            accentColor: newAccentColor
        }));
    };

    const updateColor = (chartType: string, color: string) => {
        setColors(prevColors => {
            if (chartType === 'primaryColor1') {
                const newDoughnutColors = [...prevColors.doughnut];
                newDoughnutColors[0] = color;
                return {
                    ...prevColors,
                    primaryColor1: color,
                    industries: color,
                    gender: color,
                    income: color,
                    companySize: color,
                    doughnut: newDoughnutColors
                };
            }

            if (chartType === 'primaryColor2') {
                const newDoughnutColors = [...prevColors.doughnut];
                newDoughnutColors[1] = color;
                return {
                    ...prevColors,
                    primaryColor2: color,
                    jobTitles: color,
                    age: color,
                    netWorth: color,
                    companyRevenue: color,
                    doughnut: newDoughnutColors
                };
            }

            if (chartType === 'primaryColor3') {
                const newDoughnutColors = [...prevColors.doughnut];
                newDoughnutColors[2] = color;
                return {
                    ...prevColors,
                    primaryColor3: color,
                    departments: color,
                    doughnut: newDoughnutColors
                };
            }

            if (chartType === 'primaryColor4') {
                const newDoughnutColors = [...prevColors.doughnut];
                newDoughnutColors[3] = color;
                return {
                    ...prevColors,
                    primaryColor4: color,
                    seniority: color,
                    doughnut: newDoughnutColors
                };
            }

            // Handle array colors (doughnut)
            if (chartType.startsWith('doughnut-')) {
                const [type, index] = chartType.split('-');
                const newColors = [...prevColors[type] as string[]];
                newColors[parseInt(index)] = color;

                // Update corresponding primary color
                const primaryColorKey = `primaryColor${parseInt(index) + 1}`;
                return {
                    ...prevColors,
                    [type]: newColors,
                    [primaryColorKey]: color
                };
            }

            // Handle single colors
            return { ...prevColors, [chartType]: color };
        });
    };

    useEffect(() => {
        // Update accent color CSS variables
        const root = document.documentElement;
        root.style.setProperty('--accent-color', colors.accentColor);
        root.style.setProperty('--accent-color-hover', adjustColor(colors.accentColor, -10, 1));

        // Create a lighter version for backgrounds (85% lighter)
        const lighterColor = adjustColor(colors.accentColor, 85, 1);
        root.style.setProperty('--accent-color-light', lighterColor);

        // Create a darker text color for contrast (no darkening needed)
        root.style.setProperty('--accent-color-text', colors.accentColor);
    }, [colors.accentColor]);

    return (
        <ChartColorContext.Provider value={{ colors, updateBaseColor, updateAccentColor, updateColor }}>
            {children}
        </ChartColorContext.Provider>
    );
}

export function useChartColors() {
    const context = useContext(ChartColorContext);
    if (context === undefined) {
        throw new Error('useChartColors must be used within a ChartColorProvider');
    }
    return context;
}
