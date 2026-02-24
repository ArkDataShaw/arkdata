import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, TrendingDown } from "lucide-react";
import { useBranding } from "@/lib/BrandingContext";

export default function CancellationModal({
  open,
  onOpenChange,
  discountPercent = 30,
}) {
  const branding = useBranding();
  const [step, setStep] = useState("offer"); // offer or confirm
  const [reason, setReason] = useState("");

  const handleApplyDiscount = () => {
    // Call backend to apply discount
    console.log("Applying", discountPercent, "% discount");
    onOpenChange(false);
  };

  const handleConfirmCancel = () => {
    // Call backend to confirm cancellation
    console.log("Canceling subscription");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "offer" ? (
          <>
            <DialogHeader>
              <DialogTitle>Before you cancel…</DialogTitle>
              <DialogDescription>
                We'd hate to see you go. Let us offer you something special.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Discount Offer */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Keep {branding.app_name || "Ark Data"} and save {discountPercent}%
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                      We'll reduce your charges by{" "}
                      <span className="font-bold">{discountPercent}%</span> for
                      the next 3 months. No strings attached.
                    </p>
                  </div>
                </div>
              </div>

              {/* Features Reminder */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  What you'd lose:
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>✓ Visitor identification & enrichment</li>
                  <li>✓ Real-time analytics dashboard</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="flex gap-3 flex-col-reverse sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setStep("confirm")}
                className="flex-1"
              >
                Continue to cancel
              </Button>
              <Button
                onClick={handleApplyDiscount}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Apply {discountPercent}% discount
              </Button>
            </DialogFooter>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Or{" "}
              <button className="text-slate-700 dark:text-slate-300 hover:underline">
                talk to support
              </button>
            </p>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cancel subscription</DialogTitle>
              <DialogDescription>
                Please help us understand why you're canceling.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 block">
                  Reason for canceling
                </label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="too_expensive">Too expensive</SelectItem>
                    <SelectItem value="insufficient_features">
                      Missing features
                    </SelectItem>
                    <SelectItem value="using_competitor">
                      Using competitor
                    </SelectItem>
                    <SelectItem value="no_longer_needed">
                      No longer needed
                    </SelectItem>
                    <SelectItem value="poor_support">Poor support</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Impact Notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Your subscription will end on{" "}
                  <span className="font-semibold">Feb 28, 2025</span>. You'll keep
                  full access until then.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-3 flex-col-reverse sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setStep("offer")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                className="flex-1"
              >
                Confirm cancellation
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}