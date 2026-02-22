import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "@arkdata/firebase-sdk";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const FEEDBACK_TYPE_LABELS = {
  general_feedback: "General Feedback",
  feature_request: "Feature Request",
  bug: "Bug Report",
};

export default function FeedbackSubmissionForm({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    type: "general_feedback",
    title: "",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const feedback = {
        ...data,
        user_email: user.email,
        page_url: window.location.href,
        status: "new",
      };
      const result = await base44.entities.Feedback.create(feedback);

      // Create a notification for shaw@arkdata.io on the arkdata tenant
      // (cross-tenant write — bypasses base44 SDK which is scoped to current tenant)
      try {
        const db = getDb();
        const notificationsRef = collection(db, "tenants", "arkdata", "notifications");
        await addDoc(notificationsRef, {
          user_email: "shaw@arkdata.io",
          title: `New Feedback: ${data.title}`,
          body: `${user.email} submitted ${FEEDBACK_TYPE_LABELS[data.type] || data.type}`,
          type: "feedback_submitted",
          link: "/AdminFeedback",
          read: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to create feedback notification:", err);
      }

      return result;
    },
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setFormData({
          type: "general_feedback",
          title: "",
          description: "",
        });
        setSubmitted(false);
        onOpenChange(false);
      }, 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Please fill in all fields");
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-600 mb-3" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Thank you!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Your feedback has been submitted. Our team will review it shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Feedback Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general_feedback">General Feedback</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Brief summary of your feedback"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Tell us more details..."
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}