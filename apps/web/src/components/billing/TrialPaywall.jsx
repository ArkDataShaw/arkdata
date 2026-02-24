import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useBranding } from "@/lib/BrandingContext";

export default function TrialPaywall({ open, onClose }) {
  const branding = useBranding();
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center space-y-4 py-6">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Trial Expired
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Your 30-day trial ended on January 15, 2025. Add a payment method
              to continue using {branding.app_name || "Ark Data"}.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Add Payment Method
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>
              Go to Billing
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Need help?{" "}
            <button className="text-slate-700 dark:text-slate-300 hover:underline">
              Contact support
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}