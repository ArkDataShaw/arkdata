import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, Zap } from "lucide-react";
import { generateAIInsights } from "@/functions/aiInsights";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIInsightsPanel({ metrics, dateRange }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateAIInsights(metrics, dateRange);
      setInsights(result);
    } catch (err) {
      setError("Failed to generate insights");
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (metrics) {
      fetchInsights();
    }
  }, [metrics, dateRange]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle size={20} />
            Insights Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchInsights} variant="outline" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!insights?.insights || insights.insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Not enough data to generate insights. Check back later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            AI Insights
          </div>
          <Button onClick={fetchInsights} variant="ghost" size="sm">
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.insights.map((insight, idx) => {
          const iconProps = {
            size: 18,
            className: "flex-shrink-0"
          };

          let icon = <Zap {...iconProps} className="text-blue-500" />;
          if (insight.type === "trend") icon = <TrendingUp {...iconProps} className="text-green-500" />;
          if (insight.type === "anomaly") icon = <AlertCircle {...iconProps} className="text-red-500" />;
          if (insight.type === "opportunity") icon = <Sparkles {...iconProps} className="text-amber-500" />;

          return (
            <div
              key={idx}
              className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-100 dark:border-amber-900/30"
            >
              <div className="flex gap-3">
                {icon}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{insight.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {insight.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {insight.description}
                  </p>
                  {insight.impact && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Impact: {insight.impact}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {insights.summary && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900/30">
            <h4 className="font-semibold text-sm mb-1">Summary</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {insights.summary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}