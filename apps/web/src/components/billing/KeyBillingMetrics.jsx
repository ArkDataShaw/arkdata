import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users } from "lucide-react";

export default function KeyBillingMetrics({ billingState, usage = {} }) {
  // Calculate MRR (Monthly Recurring Revenue)
  const unitPrice = billingState?.unit_price_cents || 30; // in cents
  const currentUsage = usage?.current_period || 0;
  const baseFee = billingState?.base_fee_cents || 0;
  const mrr = (currentUsage * unitPrice + baseFee) / 100;

  // Calculate Churn Rate (simplified: shows if subscription is marked for cancel)
  const churnRate = billingState?.cancel_at_period_end ? 100 : 0;

  // Calculate ARPU (Average Revenue Per User) - simplified
  const arpu = billingState?.active_user_count ? (mrr / billingState.active_user_count).toFixed(2) : 0;

  const metrics = [
    {
      title: "MRR",
      value: `$${mrr.toFixed(2)}`,
      description: "Monthly Recurring Revenue",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Churn Rate",
      value: `${churnRate}%`,
      description: billingState?.cancel_at_period_end
        ? "Subscription marked for cancellation"
        : "Active subscription",
      icon: churnRate > 0 ? TrendingDown : TrendingUp,
      color: churnRate > 0 ? "text-red-600" : "text-green-600",
      bgColor:
        churnRate > 0
          ? "bg-red-50 dark:bg-red-950/20"
          : "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "ARPU",
      value: `$${arpu}`,
      description: "Average Revenue Per User",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <Card key={idx} className={metric.bgColor}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {metric.value}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {metric.description}
                  </p>
                </div>
                <Icon className={`w-5 h-5 ${metric.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}