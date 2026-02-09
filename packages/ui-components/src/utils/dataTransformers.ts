import { B2BData, B2CData } from '../types/data';

const COMPANY_SIZE_ORDER = [
  '1 to 10',
  '11 to 25',
  '26 to 50',
  '51 to 100',
  '101 to 250',
  '251 to 500',
  '501 to 1000',
  '1001 to 5000',
  '5001 to 10000',
  '10000+'
];

const REVENUE_ORDER = [
  'Under 1 Million',
  '< $1M',
  '1 Million To 5 Million',
  '1 Million to 5 Million',
  '5 Million To 10 Million',
  '5 Million to 10 Million',
  '10 Million To 25 Million',
  '10 Million to 25 Million',
  '25 Million To 50 Million',
  '25 Million to 50 Million',
  '50 Million To 100 Million',
  '50 Million to 100 Million',
  '100 Million To 250 Million',
  '100 Million to 250 Million',
  '250 Million To 500 Million',
  '250 Million to 500 Million',
  '500 Million To 1 Billion',
  '500 Million to 1 Billion',
  '1 Billion And Over',
  '1 Billion and Over'
];

const AGE_RANGE_ORDER = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65 and older'
];

// Age range label mapping
const AGE_RANGE_LABELS: Record<string, string> = {
  '65 and older': '65+'
};

// Add CREDIT_RATING_ORDER for alphabetical sorting
const CREDIT_RATING_ORDER = [
  'H',  // Under 499
  'G',  // 500 - 549
  'F',  // 550 - 599
  'E',  // 600 - 649
  'D',  // 650 - 699
  'C',  // 700 - 749
  'B',  // 750 - 799
  'A'   // 800+
];

// Add GENDER_ORDER for consistent sorting
const GENDER_ORDER = [
  'F', // Female
  'M', // Male
  'U'  // Unknown
];

const STATE_ORDER = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const INCOME_RANGE_ORDER = [
  'less than $20,000',
  'Less than $20,000',
  '$20,000 to $44,999',
  '$45,000 to $59,999',
  '$60,000 to $74,999',
  '$75,000 to $99,999',
  '$100,000 to $149,999',
  '$150,000 to $199,999',
  '$200,000 to $249,999',
  '$200,000 to $249,000',
  '$250,000+'
];

export const NET_WORTH_ORDER = [
  '-$20,000 to -$2,500',
  '-$2,499 to $2,499',
  '$2,500 to $24,999',
  '$25,000 to $49,999',
  '$50,000 to $74,999',
  '$75,000 to $99,999',
  '$100,000 to $149,999',
  '$150,000 to $249,999',
  '$250,000 to $374,999',
  '$375,000 to $499,999',
  '$500,000 to $749,999',
  '$750,000 to $999,999',
  'More than $1,000,000'
];

const REVENUE_LABELS: Record<string, string> = {
  'Under 1 Million': '< $1M',
  '< $1M': '< $1M',
  '1 Million To 5 Million': '$1M - $5M',
  '1 Million to 5 Million': '$1M - $5M',
  '5 Million To 10 Million': '$5M - $10M',
  '5 Million to 10 Million': '$5M - $10M',
  '10 Million To 25 Million': '$10M - $25M',
  '10 Million to 25 Million': '$10M - $25M',
  '25 Million To 50 Million': '$25M - $50M',
  '25 Million to 50 Million': '$25M - $50M',
  '50 Million To 100 Million': '$50M - $100M',
  '50 Million to 100 Million': '$50M - $100M',
  '100 Million To 250 Million': '$100M - $250M',
  '100 Million to 250 Million': '$100M - $250M',
  '250 Million To 500 Million': '$250M - $500M',
  '250 Million to 500 Million': '$250M - $500M',
  '500 Million To 1 Billion': '$500M - $1B',
  '500 Million to 1 Billion': '$500M - $1B',
  '1 Billion And Over': '> $1B',
  '1 Billion and Over': '> $1B'
};

export const INCOME_RANGE_LABELS: Record<string, string> = {
  'less than $20,000': '< $20k',
  'Less than $20,000': '< $20k',
  '$20,000 to $44,999': '$20k - $45k',
  '$45,000 to $59,999': '$45k - $60k',
  '$60,000 to $74,999': '$60k - $75k',
  '$75,000 to $99,999': '$75k - $100k',
  '$100,000 to $149,999': '$100k - $150k',
  '$150,000 to $199,999': '$150k - $200k',
  '$200,000 to $249,999': '$200k - $250k',
  '$200,000 to $249,000': '$200k - $250k',
  '$250,000+': '> $250k'
};

const NET_WORTH_LABELS: Record<string, string> = {
  '-$20,000 to -$2,500': '< -$2.5k',
  '-$2,499 to $2,499': '-$2.5k - $2.5k',
  '$2,500 to $24,999': '$2.5k - $25k',
  '$25,000 to $49,999': '$25k - $50k',
  '$50,000 to $74,999': '$50k - $75k',
  '$75,000 to $99,999': '$75k - $100k',
  '$100,000 to $149,999': '$100k - $150k',
  '$150,000 to $249,999': '$150k - $250k',
  '$250,000 to $374,999': '$250k - $375k',
  '$375,000 to $499,999': '$375k - $500k',
  '$500,000 to $749,999': '$500k - $750k',
  '$750,000 to $999,999': '$750k - $1M',
  'More than $1,000,000': '> $1M',
  '$1,000,000 or more': '$1M+',
  '$1M+': '$1M+'
};

// Add CREDIT_RATING_LABELS mapping
const CREDIT_RATING_LABELS: Record<string, string> = {
  'A': '800+',
  'B': '750 - 799',
  'C': '700 - 749',
  'D': '650 - 699',
  'E': '600 - 649',
  'F': '550 - 599',
  'G': '500 - 549',
  'H': 'Under 499'
};

// Add a new mapping for Y/N values
const BOOLEAN_LABELS: Record<string, Record<string, string>> = {
  'MARRIED': {
    'Y': 'Yes',
    'N': 'No'
  },
  'CHILDREN': {
    'Y': 'Yes',
    'N': 'No'
  }
};

// Add DISPLAY_NAME_MAPPINGS constant to handle gender values consistently
const DISPLAY_NAME_MAPPINGS: Record<string, Record<string, string>> = {
  'GENDER': {
    'F': 'Female',
    'M': 'Male',
    'U': 'Unknown'
  }
};

function formatIndustryName(name: string): string {
  // First handle the standard replacements
  let formatted = name
    .replace(/ And /g, ' & ')
    .replace(/\bIt\b/g, 'IT');

  // Make sure "IT Services & IT Consulting" is consistently formatted
  if (formatted.includes('IT Services') && formatted.includes('Consulting')) {
    formatted = 'IT Services & IT Consulting';
  }

  return formatted;
}

type DataKey = keyof (B2BData & B2CData);

export function transformData(
  data: any[],
  key: DataKey,
  limit?: number,
  showUnknowns: boolean = false
) {
  const counts: Record<string, number> = {};
  let unknownCount = 0;

  // Add special debug for INCOME_RANGE to see the actual values
  if (key === ('INCOME_RANGE' as DataKey)) {
    console.log("Raw INCOME_RANGE values:", data.map(item => item[key]).filter(Boolean));
  }

  // Special handling for Gender data to ensure 'U' values are combined with other unknowns
  if (key === ('GENDER' as DataKey)) {
    // For Gender, treat 'U' values as unknown values
    data.forEach(row => {
      const value = row[key];
      if (value && value.trim() !== '' && value !== 'U') {
        counts[value] = (counts[value] || 0) + 1;
      } else {
        // Both empty values and 'U' values count as unknown
        unknownCount++;
      }
    });
  } else if (key === ('SKIPTRACE_CREDIT_RATING' as DataKey)) {
    // Special handling for Credit Rating to treat 'U' as unknown
    data.forEach(row => {
      const value = row[key];
      if (value && value.trim() !== '' && value !== 'U') {
        counts[value] = (counts[value] || 0) + 1;
      } else {
        // Both empty values and 'U' values count as unknown
        unknownCount++;
      }
    });
  } else {
    // Normal handling for other data types
    data.forEach(row => {
      const value = row[key];
      if (value && value.trim() !== '') {
        // Special handling for Income Range to normalize "Less than $20,000" to lowercase
        if (key === ('INCOME_RANGE' as DataKey) &&
          typeof value === 'string' &&
          value.toLowerCase() === 'less than $20,000') {
          // Always use lowercase version for consistency
          counts['less than $20,000'] = (counts['less than $20,000'] || 0) + 1;
        } else {
          counts[value] = (counts[value] || 0) + 1;
        }
      } else {
        unknownCount++;
      }
    });
  }

  // For INCOME_RANGE, also log the counts to see what values were found
  if (key === ('INCOME_RANGE' as DataKey)) {
    console.log("INCOME_RANGE counts:", counts);
  }

  let transformed = Object.entries(counts)
    .map(([name, value]) => ({
      name: key === ('COMPANY_REVENUE' as DataKey)
        ? (REVENUE_LABELS[name] || name)
        : key === ('NET_WORTH' as DataKey)
          ? (NET_WORTH_LABELS[name] || name)
          : key === ('INCOME_RANGE' as DataKey)
            ? getIncomeRangeLabel(name)
            : key === ('COMPANY_INDUSTRY' as DataKey)
              ? formatIndustryName(name)
              : key === ('SKIPTRACE_CREDIT_RATING' as DataKey)
                ? (CREDIT_RATING_LABELS[name] || name)
                : key === ('AGE_RANGE' as DataKey)
                  ? (AGE_RANGE_LABELS[name] || name)
                  : (key === ('MARRIED' as DataKey) || key === ('CHILDREN' as DataKey)) && BOOLEAN_LABELS[key as string]?.[name]
                    ? BOOLEAN_LABELS[key as string][name]
                    : key === ('GENDER' as DataKey) && DISPLAY_NAME_MAPPINGS['GENDER']?.[name]
                      ? DISPLAY_NAME_MAPPINGS['GENDER'][name]
                      : name,
      value,
      originalName: name
    }));

  // For INCOME_RANGE, log the transformed data to confirm label mapping
  if (key === ('INCOME_RANGE' as DataKey)) {
    console.log("Transformed INCOME_RANGE data:", transformed);
  }

  // Always add Unknown item, but set value to 0 when not showing unknowns
  // This helps keep consistent items for animations
  transformed.push({
    name: 'Unknown',
    value: showUnknowns ? unknownCount : 0,
    originalName: 'Unknown'
  });

  // Sort the data before applying the limit
  transformed = sortTransformedData(transformed, key);

  // Filter out Unknown with value 0 if not showing unknowns
  // and we need to apply a limit (to avoid wasting a slot)
  if (limit && !showUnknowns) {
    transformed = transformed.filter(item => !(item.name === 'Unknown' && item.value === 0));
    if (transformed.length > limit) {
      transformed = transformed.slice(0, limit);
    }
  } else if (limit) {
    // Apply limit but ensure 'Unknown' is included if requested
    const unknownItem = transformed.find(item => item.name === 'Unknown');
    const otherItems = transformed.filter(item => item.name !== 'Unknown').slice(0, limit - 1);
    transformed = unknownItem ? [...otherItems, unknownItem] : otherItems;
  }

  return transformed.map(({ name, value }) => ({ name, value }));
}

function sortTransformedData(
  data: Array<{ name: string; value: number; originalName: string }>,
  key: DataKey
) {
  if (key === ('SKIPTRACE_CREDIT_RATING' as DataKey)) {
    return data.sort((a, b) => {
      if (a.originalName === 'Unknown') return 1;
      if (b.originalName === 'Unknown') return -1;
      const aIndex = CREDIT_RATING_ORDER.indexOf(a.originalName);
      const bIndex = CREDIT_RATING_ORDER.indexOf(b.originalName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  } else if (key === ('INCOME_RANGE' as DataKey)) {
    console.log("Sorting Income Range data:", data.map(d => d.originalName));
    console.log("Income Range Order:", INCOME_RANGE_ORDER);

    const sorted = data.sort((a, b) => {
      if (a.originalName === 'Unknown') return 1;
      if (b.originalName === 'Unknown') return -1;

      // Check for both lowercase and capitalized versions
      if (a.originalName.toLowerCase() === 'less than $20,000') return -1;
      if (b.originalName.toLowerCase() === 'less than $20,000') return 1;

      const aIndex = INCOME_RANGE_ORDER.indexOf(a.originalName);
      const bIndex = INCOME_RANGE_ORDER.indexOf(b.originalName);

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    console.log("Sorted Income Range data:", sorted.map(d => ({ name: d.name, original: d.originalName })));
    return sorted;
  } else if (key === ('COMPANY_EMPLOYEE_COUNT' as DataKey)) {
    return data.sort((a, b) => {
      if (a.originalName === 'Unknown') return 1;
      if (b.originalName === 'Unknown') return -1;
      const aIndex = COMPANY_SIZE_ORDER.indexOf(a.originalName);
      const bIndex = COMPANY_SIZE_ORDER.indexOf(b.originalName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  } else if (key === ('COMPANY_REVENUE' as DataKey)) {
    return data.sort((a, b) => {
      if (a.originalName === 'Unknown') return 1;
      if (b.originalName === 'Unknown') return -1;
      const aIndex = REVENUE_ORDER.indexOf(a.originalName);
      const bIndex = REVENUE_ORDER.indexOf(b.originalName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  } else if (key === ('AGE_RANGE' as DataKey)) {
    return data.sort((a, b) => {
      if (a.originalName === 'Unknown') return 1;
      if (b.originalName === 'Unknown') return -1;
      const aIndex = AGE_RANGE_ORDER.indexOf(a.originalName);
      const bIndex = AGE_RANGE_ORDER.indexOf(b.originalName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  } else if (key === ('GENDER' as DataKey)) {
    return data.sort((a, b) => {
      // Place entries with name 'Unknown' but originalName not 'U' at the end
      if (a.name === 'Unknown' && a.originalName !== 'U') return 1;
      if (b.name === 'Unknown' && b.originalName !== 'U') return -1;
      const aIndex = GENDER_ORDER.indexOf(a.originalName);
      const bIndex = GENDER_ORDER.indexOf(b.originalName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  } else if (key === ('NET_WORTH' as DataKey)) {
    return data.sort((a, b) => {
      if (a.originalName === 'Unknown') return 1;
      if (b.originalName === 'Unknown') return -1;
      const aIndex = NET_WORTH_ORDER.indexOf(a.originalName);
      const bIndex = NET_WORTH_ORDER.indexOf(b.originalName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  } else if (key === ('PERSONAL_STATE' as DataKey)) {
    return data.sort((a, b) => {
      if (a.originalName === 'Unknown') return 1;
      if (b.originalName === 'Unknown') return -1;
      const aIndex = STATE_ORDER.indexOf(a.originalName);
      const bIndex = STATE_ORDER.indexOf(b.originalName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  } else {
    return data.sort((a, b) => {
      if (a.originalName === 'Unknown') return 1;
      if (b.originalName === 'Unknown') return -1;
      return b.value - a.value;
    });
  }
}

// Helper function to get the correct income range label regardless of capitalization
function getIncomeRangeLabel(name: string): string {
  // First check exact match
  if (INCOME_RANGE_LABELS[name]) {
    return INCOME_RANGE_LABELS[name];
  }

  // Check case-insensitive match
  const lowerName = name.toLowerCase();
  if (lowerName === 'less than $20,000') {
    return '< $20k';
  }

  // Special case for "$1,000,000 or more" format
  if (lowerName.includes('$1,000,000') || lowerName.includes('1 million')) {
    if (lowerName.includes('more') || lowerName.includes('over')) {
      return '$1M+';
    }
  }

  // For other ranges, try to find a matching key
  for (const key of Object.keys(INCOME_RANGE_LABELS)) {
    if (key.toLowerCase() === lowerName) {
      return INCOME_RANGE_LABELS[key];
    }
  }

  // Add partial matching for special cases
  if (name.includes('$200,000 to $249')) {
    return '$200k - $250k';
  }

  if (name.includes('$20,000 to $44')) return '$20k - $45k';
  if (name.includes('$45,000 to $59')) return '$45k - $60k';
  if (name.includes('$60,000 to $74')) return '$60k - $75k';
  if (name.includes('$75,000 to $99')) return '$75k - $100k';
  if (name.includes('$100,000 to $149')) return '$100k - $150k';
  if (name.includes('$150,000 to $199')) return '$150k - $200k';
  if (name.includes('$250,000')) return '> $250k';

  // If no match, return original name
  return name;
}
