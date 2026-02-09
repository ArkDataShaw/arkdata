import { useCallback, useMemo, useState, useEffect } from "react";
import {
    ComposableMap,
    Geographies,
    Geography
} from "react-simple-maps";
import { scaleQuantile } from "d3-scale";
import { B2BData, B2CData } from "../types/data";
import { useChartColors } from "../contexts/ChartColorContext";

// USA GeoJSON
const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
// Alternative source if the primary one fails
const alternativeGeoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/united-states/us-states.json";

// State name mapping
const STATE_NAMES: Record<string, string> = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming"
};

// Create a reverse mapping from full names to state codes
const STATE_CODES: Record<string, string> = Object.entries(STATE_NAMES).reduce(
    (acc, [code, name]) => {
        acc[name.toLowerCase()] = code;
        return acc;
    },
    {} as Record<string, string>
);

// Add support for DC and Canadian provinces that might appear in the data
const ADDITIONAL_REGIONS: Record<string, string> = {
    'DC': 'District of Columbia',
    'QC': 'Quebec',
    'BC': 'British Columbia',
    'MB': 'Manitoba',
    'PB': 'Prince Edward Island',
    'ON': 'Ontario',
    'AB': 'Alberta',
    'SK': 'Saskatchewan',
    'NB': 'New Brunswick',
    'NS': 'Nova Scotia',
    'NL': 'Newfoundland and Labrador'
};

interface USAChoroplethMapProps {
    data: (B2BData | B2CData)[];
    defaultMode?: 'people' | 'companies';
    onStateClick?: (stateCode: string) => void;
    selectedStates?: Set<string>;
}

const USAChoroplethMap = ({ data, defaultMode = 'people', onStateClick, selectedStates }: USAChoroplethMapProps) => {
    const { colors } = useChartColors();
    const [tooltip, setTooltip] = useState({ show: false, content: "", x: 0, y: 0 });
    const [mapLoading, setMapLoading] = useState(true);
    const [currentGeoUrl, setCurrentGeoUrl] = useState(geoUrl);
    const [mode, setMode] = useState<'people' | 'companies'>(defaultMode);

    // Effect to check if the map loads correctly
    useEffect(() => {
        const checkMapLoading = setTimeout(() => {
            if (mapLoading) {
                console.warn("Map is taking too long to load, checking for issues");

                // Check if the geoUrl is accessible
                fetch(geoUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load GeoJSON: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (!data || !data.objects || !data.objects.states) {
                            throw new Error("Invalid GeoJSON data structure");
                        }
                        setMapLoading(false);
                    })
                    .catch(err => {
                        console.error("Error loading primary map data:", err);

                        // Try the alternative source
                        console.log("Trying alternative GeoJSON source...");
                        fetch(alternativeGeoUrl)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to load alternative GeoJSON: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(() => {
                                console.log("Alternative GeoJSON loaded successfully");
                                setCurrentGeoUrl(alternativeGeoUrl);
                                setMapLoading(false);
                            })
                            .catch(altErr => {
                                console.error("Error loading alternative map data:", altErr);
                                setMapLoading(false);
                            });
                    });
            }
        }, 5000);

        return () => clearTimeout(checkMapLoading);
    }, [mapLoading]);

    // Helper to normalize state codes to ensure consistent format
    const normalizeStateCode = useCallback((rawState: string): string => {
        if (!rawState) return "";

        const trimmedState = rawState.trim();

        // If it's already a 2-letter code, return it uppercase
        if (/^[A-Za-z]{2}$/.test(trimmedState)) {
            const upperState = trimmedState.toUpperCase();

            // Skip Canadian provinces and DC for mapping purposes
            if (ADDITIONAL_REGIONS[upperState]) {
                return "";
            }

            // Verify it's a valid state code
            if (STATE_NAMES[upperState]) {
                return upperState;
            }
        }

        // If it's a full state name, try to get the code
        const stateLower = trimmedState.toLowerCase();
        if (STATE_CODES[stateLower]) {
            return STATE_CODES[stateLower];
        }

        // Try to match state names that might differ slightly from standard
        for (const [code, name] of Object.entries(STATE_NAMES)) {
            const lowerName = name.toLowerCase();
            if (stateLower.includes(lowerName) || lowerName.includes(stateLower)) {
                return code; // Return the state code (e.g., "CA"), not the full name
            }
        }

        // Don't log warnings for known non-states
        if (!Object.keys(ADDITIONAL_REGIONS).includes(trimmedState.toUpperCase())) {
            console.warn(`Unrecognized state: ${rawState}`);
        }

        return "";
    }, []);

    // Create a real quantile-based color scale with proper gradient
    const getQuantileColorScale = useCallback((values: number[], colorRange: string[]) => {
        // If no values or all zeros, return a function that returns gray
        if (values.length === 0) {
            return () => "#EEEEEE";
        }

        console.log("Creating scale with values:", values);
        console.log("Using color range:", colorRange);

        // Create the scale - use scaleQuantile from d3-scale
        const scale = scaleQuantile<string>()
            .domain(values)
            .range(colorRange);

        // Test the scale with some values
        values.forEach(v => {
            console.log(`Test value ${v} -> color ${scale(v)}`);
        });

        // Return function that applies scale
        return (value: number) => {
            if (value <= 0) return "#EEEEEE";
            return scale(value);
        };
    }, []);

    // Calculate people state counts from PERSONAL_STATE
    const peopleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.keys(STATE_NAMES).forEach(state => {
            counts[state] = 0;
        });

        if (data && data.length > 0) {
            data.forEach(item => {
                if (item.PERSONAL_STATE && item.PERSONAL_STATE.trim() !== '') {
                    const stateCode = normalizeStateCode(item.PERSONAL_STATE);
                    if (stateCode && counts[stateCode] !== undefined) {
                        counts[stateCode] = (counts[stateCode] || 0) + 1;
                    }
                }
            });
        }

        return Object.keys(STATE_NAMES).map(id => ({
            id,
            state: STATE_NAMES[id],
            value: counts[id] || 0
        }));
    }, [data, normalizeStateCode]);

    // Calculate company state counts from COMPANY_STATE, deduplicated by COMPANY_DOMAIN
    const companyCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.keys(STATE_NAMES).forEach(state => {
            counts[state] = 0;
        });

        // Track seen domains to deduplicate
        const seenDomains = new Set<string>();

        if (data && data.length > 0) {
            data.forEach(item => {
                const b2bItem = item as B2BData;
                const domain = b2bItem.COMPANY_DOMAIN?.trim().toLowerCase();
                const state = b2bItem.COMPANY_STATE;

                // Skip if no domain, empty domain, or already counted this domain
                if (!domain || domain === '' || seenDomains.has(domain)) return;

                seenDomains.add(domain);

                if (state && state.trim() !== '') {
                    const stateCode = normalizeStateCode(state);
                    if (stateCode && counts[stateCode] !== undefined) {
                        counts[stateCode]++;
                    }
                }
            });
        }

        return Object.keys(STATE_NAMES).map(id => ({
            id,
            state: STATE_NAMES[id],
            value: counts[id] || 0
        }));
    }, [data, normalizeStateCode]);

    // Select active dataset based on mode
    const stateCounts = mode === 'companies' ? companyCounts : peopleCounts;

    // Create color scale
    const colorScale = useMemo(() => {
        // Get non-zero values for the domain
        const values = stateCounts
            .map(d => d.value)
            .filter(v => v > 0);

        console.log("Values for color scale:", values);

        // Create color range with increased contrast between light and dark
        const baseColor = colors.primaryColor3 || "#A78BFA"; // Fallback color

        // Extract RGB components for manipulation
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);

        // Create simpler gradient with better contrast
        const colorRange = [
            `rgba(${r}, ${g}, ${b}, 0.2)`,  // 20% opacity - very light
            `rgba(${r}, ${g}, ${b}, 0.4)`,  // 40% opacity
            `rgba(${r}, ${g}, ${b}, 0.6)`,  // 60% opacity
            `rgba(${r}, ${g}, ${b}, 0.8)`,  // 80% opacity
            `${baseColor}`                   // 100% opacity - base color
        ];

        console.log("Using color range:", colorRange);

        // Use a simpler approach if we're having trouble
        if (values.length === 0) {
            return () => "#EEEEEE";
        }

        // Production quantile scale
        return getQuantileColorScale(values, colorRange);
    }, [stateCounts, colors.primaryColor3, getQuantileColorScale]);

    // Get state code from geography properties
    const getStateCodeFromGeo = (geo: any): string | null => {
        // Primary source format
        if (geo.properties.postal) {
            return geo.properties.postal;
        }

        // Alternative source format may have different property names
        if (geo.properties.STATE_ABBR) {
            return geo.properties.STATE_ABBR;
        }

        // Another common format
        if (geo.properties.code) {
            return geo.properties.code;
        }

        // Try to extract from name if available
        if (geo.properties.name) {
            const stateName = geo.properties.name.toLowerCase();
            return STATE_CODES[stateName] || null;
        }

        console.warn("Could not extract state code from geography:", geo.properties);
        return null;
    };

    return (
        <div className="w-full h-full flex flex-col border shadow-sm rounded-lg bg-white max-h-[500px] lg:max-h-none">
            <div className="flex-none p-6 relative">
                <h3 className="text-xl font-semibold leading-normal">State Distribution</h3>
                <div className="absolute top-2.5 right-4 z-10">
                    <div className="flex bg-gray-200 rounded-full p-0.5 text-sm">
                        <button
                            onClick={() => setMode('people')}
                            className={`px-3 py-0.5 rounded-full transition-all ${mode === 'people'
                                ? 'bg-white text-gray-800 shadow-sm font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            People
                        </button>
                        <button
                            onClick={() => setMode('companies')}
                            className={`px-3 py-0.5 rounded-full transition-all ${mode === 'companies'
                                ? 'bg-white text-gray-800 shadow-sm font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Companies
                        </button>
                    </div>
                </div>
            </div>
            <div className="px-6 pb-0 flex-1 flex flex-col -mt-[60px] -mb-[24px] lg:mt-0 lg:-mb-[80px] lg:px-4 xl:-mb-[60px] xl:px-6 2xl:-mb-[88px]">
                {mapLoading ? (
                    <div className="flex items-center justify-center h-64 flex-1">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <div className="relative flex-1 flex items-center justify-center lg:min-h-[250px] xl:min-h-[280px]">
                        <div className="w-full aspect-[4/3]">
                            <ComposableMap projection="geoAlbersUsa" className="lg:-translate-y-[50px] xl:-translate-y-[60px]">
                                <Geographies geography={currentGeoUrl}>
                                    {({ geographies }) =>
                                        geographies.map(geo => {
                                            const stateCode = getStateCodeFromGeo(geo);
                                            const stateData = stateCounts.find(d => d.id === stateCode);
                                            const baseColor = stateData ? colorScale(stateData.value) : "#EEE";

                                            // Dim non-selected states when there are selections
                                            const hasSelections = selectedStates && selectedStates.size > 0;
                                            const isSelected = selectedStates?.has(stateCode || '');
                                            const fillColor = hasSelections && !isSelected ? "#E5E7EB" : baseColor;

                                            return (
                                                <Geography
                                                    key={geo.rsmKey}
                                                    geography={geo}
                                                    fill={fillColor}
                                                    stroke="#FFF"
                                                    strokeWidth={0.5}
                                                    style={{
                                                        default: {
                                                            outline: "none",
                                                            cursor: onStateClick ? "pointer" : "default"
                                                        },
                                                        hover: {
                                                            fill: colors.accentColor,
                                                            outline: "none",
                                                            transition: "all 250ms",
                                                            cursor: onStateClick ? "pointer" : "default"
                                                        },
                                                        pressed: {
                                                            outline: "none"
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        if (stateCode && onStateClick) {
                                                            onStateClick(stateCode);
                                                        }
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        const { clientX, clientY } = e;
                                                        const stateName = STATE_NAMES[stateCode || ""] || stateCode;
                                                        const count = stateData ? stateData.value : 0;
                                                        setTooltip({
                                                            show: true,
                                                            content: `${stateName}: ${count}`,
                                                            x: clientX,
                                                            y: clientY
                                                        });
                                                    }}
                                                    onMouseLeave={() => {
                                                        setTooltip(prev => ({ ...prev, show: false }));
                                                    }}
                                                />
                                            );
                                        })
                                    }
                                </Geographies>
                            </ComposableMap>
                        </div>

                        {tooltip.show && (
                            <div
                                style={{
                                    position: 'fixed',
                                    left: `${tooltip.x}px`,
                                    top: `${tooltip.y}px`,
                                    transform: 'translate(-50%, -100%)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    zIndex: 1000,
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    pointerEvents: 'none'
                                }}
                            >
                                {tooltip.content}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default USAChoroplethMap;
