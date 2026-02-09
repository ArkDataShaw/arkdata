import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { sendSupportEmail } from "@/functions/supportEmail";
import { base44 } from "@/api/base44Client";

export default function BillingInvoices() {
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleContactSupport = async () => {
    try {
      setSendingEmail(true);
      const user = await base44.auth.me();
      await sendSupportEmail(user.email, "I need help with my billing.");
      alert("Support request sent successfully!");
    } catch (error) {
      console.error("Error sending support email:", error);
      alert("Failed to send support request. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const invoices = [
    {
      id: "inv_001",
      date: "2025-01-15",
      amount: 38.10,
      status: "paid",
      period: "Jan 2025",
    },
    {
      id: "inv_002",
      date: "2024-12-15",
      amount: 42.50,
      status: "paid",
      period: "Dec 2024",
    },
    {
      id: "inv_003",
      date: "2024-11-15",
      amount: 35.75,
      status: "paid",
      period: "Nov 2024",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => window.open("https://stripe.com", "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            View in Stripe
          </Button>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">
              No invoices yet. Your first invoice will be generated at the end of
              your first billing period.
            </p>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {invoice.period}
                      </p>
                      <Badge
                        variant={
                          invoice.status === "paid" ? "default" : "secondary"
                        }
                      >
                        {invoice.status.charAt(0).toUpperCase() +
                          invoice.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(invoice.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      ${invoice.amount.toFixed(2)}
                    </p>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-slate-50 dark:bg-slate-900/50">
        <CardContent className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Need help with your invoices?
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleContactSupport}
            disabled={sendingEmail}
          >
            {sendingEmail ? "Sending..." : "Contact Support"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}