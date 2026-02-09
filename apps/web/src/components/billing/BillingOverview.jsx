import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import CancellationModal from "@/components/billing/CancellationModal";
import KeyBillingMetrics from "@/components/billing/KeyBillingMetrics";
import EstimatedChargesTrend from "@/components/billing/EstimatedChargesTrend";
import ProjectedUsage from "@/components/billing/ProjectedUsage";

export default function BillingOverview({ billingState }) {
  const [showCancelModal, setShowCancelModal] = useState(false);

  if (!billingState) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">Loading billing information...</p>
        </CardContent>
      </Card>
    );
  }

  const isTrialing = billingState.billing_status === "trialing";
  const isActive = billingState.billing_status === "active";
  const isPastDue = billingState.billing_status === "past_due";

  return (
    <div className="space-y-6">
      {/* Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {billingState.plan_key === "recaptured_usage"
                  ? "Usage-Based Billing"
                  : "Pro Plan"}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Pay per Recaptured Traffic (Enhanced Leads)
              </p>
            </div>
            <Badge
              variant={
                isTrialing ? "secondary" : isActive ? "default" : "destructive"
              }
            >
              {isTrialing && "Trial"}
              {isActive && "Active"}
              {isPastDue && "Past Due"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                Current Period
              </p>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {billingState.current_period_start
                  ? new Date(
                      billingState.current_period_start
                    ).toLocaleDateString()
                  : "—"}
                {" to "}
                {billingState.current_period_end
                  ? new Date(billingState.current_period_end).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                Renewal
              </p>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {billingState.cancel_at_period_end ? "Cancels" : "Renews"}{" "}
                {billingState.current_period_end
                  ? new Date(
                      billingState.current_period_end
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            {isTrialing && (
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                Start Subscription
              </Button>
            )}
            {isActive && (
              <>
                <Button variant="outline" className="flex-1">
                  Manage Subscription
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage This Period */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Enhanced Leads
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                127
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                this period
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Estimated Cost
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                $38.10
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                @ $0.30 per lead
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            View Detailed Usage →
          </Button>
        </CardContent>
      </Card>

      {/* Discount Badge */}
      {billingState.discount_active && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  {billingState.discount_percent}% Discount Applied
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                  Your discount expires on{" "}
                  {new Date(billingState.discount_expires_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Due Warning */}
      {isPastDue && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">
                  Payment Failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
                  Please update your payment method to continue using Ark Data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deeper Analytics */}
      {isActive && (
        <>
          {/* Key Billing Metrics */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Analytics & Insights
            </h2>
            <KeyBillingMetrics
              billingState={billingState}
              usage={{ current_period: 127, active_user_count: 5 }}
            />
          </div>

          {/* Projections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <EstimatedChargesTrend
              usage={{ current_period: 127 }}
              unitPrice={billingState.unit_price_cents || 30}
            />
            <ProjectedUsage
              usage={{ current_period: 127 }}
              periodStart={billingState.current_period_start}
              periodEnd={billingState.current_period_end}
            />
          </div>
        </>
      )}

      <CancellationModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        discountPercent={billingState.discount_percent || 30}
      />
    </div>
  );
}