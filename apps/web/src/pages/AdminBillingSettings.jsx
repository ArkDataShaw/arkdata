import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function AdminBillingSettings() {
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    plan_key: "",
    name: "",
    stripe_price_id_metered: "",
    stripe_price_id_base: "",
    payment_link_url: "",
    unit_name: "Enhanced Lead",
    unit_price_cents_display: 0,
    discount_percent_default: 30,
    discount_duration_months_default: 3,
    trial_days_default: 30,
    active: true,
  });

  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => base44.entities.BillingPlan?.list?.() || [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BillingPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
      setShowPlanDialog(false);
      setFormData({
        plan_key: "",
        name: "",
        stripe_price_id_metered: "",
        stripe_price_id_base: "",
        payment_link_url: "",
        unit_name: "Enhanced Lead",
        unit_price_cents_display: 0,
        discount_percent_default: 30,
        discount_duration_months_default: 3,
        trial_days_default: 30,
        active: true,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BillingPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
      setShowPlanDialog(false);
      setEditingPlan(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BillingPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
    },
  });

  const handleOpenDialog = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
    } else {
      setEditingPlan(null);
      setFormData({
        plan_key: "",
        name: "",
        stripe_price_id_metered: "",
        stripe_price_id_base: "",
        payment_link_url: "",
        unit_name: "Enhanced Lead",
        unit_price_cents_display: 0,
        discount_percent_default: 30,
        discount_duration_months_default: 3,
        trial_days_default: 30,
        active: true,
      });
    }
    setShowPlanDialog(true);
  };

  const handleSave = () => {
    if (!formData.plan_key.trim() || !formData.name.trim()) {
      alert("Please fill in plan key and name");
      return;
    }

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Billing Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Configure billing plans, Stripe integration, and payment links
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Plan
          </Button>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-600 dark:text-slate-400">
                  No billing plans configured yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            plans.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {plan.plan_key}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(plan)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(plan.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Metered Price ID
                      </p>
                      <p className="text-sm font-mono text-slate-900 dark:text-slate-100">
                        {plan.stripe_price_id_metered?.slice(0, 20)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Unit Price
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        ${(plan.unit_price_cents_display / 100).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Trial Days
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {plan.trial_days_default}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Payment Link
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {plan.payment_link_url ? "✓ Configured" : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Create Billing Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Plan Key *
                </label>
                <Input
                  value={formData.plan_key}
                  onChange={(e) =>
                    setFormData({ ...formData, plan_key: e.target.value })
                  }
                  placeholder="e.g., recaptured_usage"
                  disabled={!!editingPlan}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Plan Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Usage-Based Billing"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Stripe Metered Price ID *
                </label>
                <Input
                  value={formData.stripe_price_id_metered}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stripe_price_id_metered: e.target.value,
                    })
                  }
                  placeholder="price_1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Stripe Base Price ID (optional)
                </label>
                <Input
                  value={formData.stripe_price_id_base}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stripe_price_id_base: e.target.value,
                    })
                  }
                  placeholder="price_0987654321"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Payment Link URL (optional)
              </label>
              <Textarea
                value={formData.payment_link_url}
                onChange={(e) =>
                  setFormData({ ...formData, payment_link_url: e.target.value })
                }
                placeholder="https://buy.stripe.com/test_..."
                rows={2}
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Paste a Stripe Payment Link URL. Customers can use this as an
                alternative to the checkout session.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Unit Name
                </label>
                <Input
                  value={formData.unit_name}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Unit Price (cents)
                </label>
                <Input
                  type="number"
                  value={formData.unit_price_cents_display}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit_price_cents_display: parseInt(e.target.value),
                    })
                  }
                  placeholder="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Trial Days Default
                </label>
                <Input
                  type="number"
                  value={formData.trial_days_default}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trial_days_default: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Discount % (retention)
                </label>
                <Input
                  type="number"
                  value={formData.discount_percent_default}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_percent_default: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Discount Duration (months)
                </label>
                <Input
                  type="number"
                  value={formData.discount_duration_months_default}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_duration_months_default: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label className="text-sm text-slate-900 dark:text-slate-100">
                Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}