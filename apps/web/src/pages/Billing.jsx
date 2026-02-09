import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CreditCard, TrendingUp, FileText } from "lucide-react";
import BillingOverview from "@/components/billing/BillingOverview";
import BillingUsage from "@/components/billing/BillingUsage";
import BillingCard from "@/components/billing/BillingCard";
import BillingInvoices from "@/components/billing/BillingInvoices";

export default function Billing() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: billingState } = useQuery({
    queryKey: ["billing-state"],
    queryFn: async () => {
      const user = await base44.auth.me();
      // Fetch from your backend API
      return {
        tenant_id: user.tenant_id || "demo",
        trial_started_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        trial_ends_at: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        billing_status: "trialing",
        plan_key: "recaptured_usage",
      };
    },
  });

  const daysRemaining = billingState?.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(billingState.trial_ends_at) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Billing & Payments
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your subscription and payment method
          </p>
        </div>

        {/* Trial Banner */}
        {billingState?.billing_status === "trialing" && daysRemaining !== null && (
          <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="p-4 flex items-start justify-between">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Trial Active
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {daysRemaining === 0
                      ? "Your trial ends today. Add a payment method to continue."
                      : `Your trial ends in ${daysRemaining} days. Add a payment method to continue uninterrupted.`}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="flex-shrink-0">
                {daysRemaining} days left
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="card" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Card</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <BillingOverview billingState={billingState} />
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <BillingUsage billingState={billingState} />
          </TabsContent>

          <TabsContent value="card" className="mt-6">
            <BillingCard billingState={billingState} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <BillingInvoices billingState={billingState} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}