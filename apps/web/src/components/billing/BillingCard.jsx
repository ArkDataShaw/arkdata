import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle } from "lucide-react";

export default function BillingCard({ billingState }) {
  const hasPaymentMethod = true; // Mock
  const cardBrand = "visa";
  const cardLast4 = "4242";
  const cardExpiry = "12/26";

  return (
    <div className="space-y-6">
      {/* Payment Method Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasPaymentMethod ? (
            <>
              <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white">
                <div className="flex items-start justify-between mb-8">
                  <CreditCard className="w-8 h-8" />
                  <span className="text-sm font-medium uppercase">
                    {cardBrand}
                  </span>
                </div>
                <p className="text-lg font-mono tracking-wider">
                  •••• •••• •••• {cardLast4}
                </p>
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <p className="text-xs text-blue-100 mb-1">CARDHOLDER</p>
                    <p className="text-sm font-medium">Your Name</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-100 mb-1">EXPIRES</p>
                    <p className="text-sm font-medium">{cardExpiry}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Default payment method for your subscription.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Open Stripe portal
                    window.open("https://billing.stripe.com/p/login/1234", "_blank");
                  }}
                >
                  Update Payment Method
                </Button>
              </div>
            </>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    No Payment Method
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Add a card to continue your subscription after the trial ends.
                  </p>
                  <Button className="mt-4 w-full bg-amber-600 hover:bg-amber-700">
                    Add Payment Method
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Email */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-900 dark:text-slate-100 mb-4">
            billing@example.com
          </p>
          <Button variant="outline">Change Billing Email</Button>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="bg-slate-50 dark:bg-slate-900/50">
        <CardContent className="p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            🔒 Your payment information is securely processed through Stripe. We
            never store card details on our servers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}