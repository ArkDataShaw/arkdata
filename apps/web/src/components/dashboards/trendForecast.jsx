// Linear regression for trend calculation
export function calculateTrendLine(data) {
  if (data.length < 2) return null;
  
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  data.forEach((point, i) => {
    sumX += i;
    sumY += point;
    sumXY += i * point;
    sumX2 += i * i;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

// Generate forecast using linear regression
export function forecast(data, daysAhead = 30) {
  const trendLine = calculateTrendLine(data);
  if (!trendLine) return [];
  
  const { slope, intercept } = trendLine;
  const lastIndex = data.length - 1;
  const forecastData = [];
  
  for (let i = 1; i <= daysAhead; i++) {
    const predictedIndex = lastIndex + i;
    const value = Math.max(0, Math.round(slope * predictedIndex + intercept));
    forecastData.push(value);
  }
  
  return forecastData;
}

// Calculate period-over-period comparison
export function comparePeriods(currentData, previousData) {
  const currentSum = currentData.reduce((a, b) => a + b, 0);
  const previousSum = previousData.reduce((a, b) => a + b, 0);
  
  const change = previousSum > 0 ? (((currentSum - previousSum) / previousSum) * 100).toFixed(1) : 0;
  const direction = change >= 0 ? "up" : "down";
  
  return {
    currentTotal: currentSum,
    previousTotal: previousSum,
    changePercent: parseFloat(change),
    direction
  };
}