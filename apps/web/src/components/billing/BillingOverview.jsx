import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const planLabels = {
  trial: "Trial",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export default function BillingOverview({ billingState }) {
  if (!billingState) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">Loading billing information...</p>
        </CardContent>
      </Card>
    );
  }

  const plan = billingState.plan || "trial";
  const isTrial = billingState.billing_status === "trialing";

  // Current period: from account creation (or trial start) to trial end or +30 days
  const periodStart = billingState.trial_started_at
    ? new Date(billingState.trial_started_at).toLocaleDateString()
    : "—";

  let periodEnd = "—";
  let renewalDate = "—";

  if (isTrial && billingState.trial_ends_at) {
    periodEnd = new Date(billingState.trial_ends_at).toLocaleDateString();
    renewalDate = periodEnd;
  } else if (billingState.trial_started_at) {
    // Paid plans: 30-day billing cycle from creation
    const start = new Date(billingState.trial_started_at);
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    periodEnd = end.toLocaleDateString();
    renewalDate = end.toLocaleDateString();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {planLabels[plan] || plan}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isTrial
                ? "You're currently on a free trial."
                : `You're on the ${planLabels[plan] || plan} plan.`}
            </p>
          </div>
          <Badge variant={isTrial ? "secondary" : "default"}>
            {isTrial ? "Trial" : "Active"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
              Current Period
            </p>
            <p className="text-sm text-slate-900 dark:text-slate-100">
              {periodStart} to {periodEnd}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
              Renewal
            </p>
            <p className="text-sm text-slate-900 dark:text-slate-100">
              {isTrial ? `Trial ends ${renewalDate}` : `Renews ${renewalDate}`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
