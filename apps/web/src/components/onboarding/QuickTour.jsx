import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronRight } from "lucide-react";

const TOUR_STEPS = [
  {
    id: 1,
    title: "Welcome",
    body: "Track your website visitors and identify high-intent accounts.",
    selector: "[data-tour-id='home-hero']",
    placement: "center",
  },
  {
    id: 2,
    title: "Visitors Dashboard",
    body: "See all your website visitors and their behavior in real-time.",
    selector: "[data-tour-id='visitors-table']",
    placement: "bottom",
  },
  {
    id: 3,
    title: "Date Range Selector",
    body: "Filter data by custom date ranges to analyze specific time periods.",
    selector: "[data-tour-id='date-range-picker']",
    placement: "bottom",
  },
  {
    id: 4,
    title: "Integrations",
    body: "Connect your CRM and marketing tools to sync visitor data.",
    selector: "[data-tour-id='integrations-button']",
    placement: "bottom",
  },
  {
    id: 5,
    title: "Lost Traffic",
    body: "Find high-value visitors you didn't identify yet.",
    selector: "[data-tour-id='lost-traffic-link']",
    placement: "right",
  },
];

export default function QuickTour({ open, onOpenChange, tenantId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const queryClient = useQueryClient();

  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    if (!open || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition);
    return () => window.removeEventListener("scroll", updatePosition);
  }, [step, open]);

  const completeTourMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const tourState = await base44.entities.TourState.filter({
        user_id: user.email,
        tour_key: "quick_tour",
      });

      if (tourState.length > 0) {
        await base44.entities.TourState.update(tourState[0].id, {
          completed_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.TourState.create({
          user_id: user.email,
          tour_key: "quick_tour",
          tenant_id: tenantId,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      }

      // Mark tour task as complete
      await base44.entities.OnboardingEvent.create({
        event_type: "tour_completed",
        tenant_id: tenantId,
        task_id: "task_15",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tour-state"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-task-statuses"] });
      onOpenChange(false);
    },
  });

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTourMutation.mutate();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!open) return null;

  const getPopupPosition = () => {
    const popupWidth = 320;
    const popupHeight = 220;
    const padding = 20;

    let top = position.top + position.height + padding;
    let left = position.left + position.width / 2 - popupWidth / 2;

    // Adjust if off-screen
    if (left < padding) left = padding;
    if (left + popupWidth > window.innerWidth - padding) {
      left = window.innerWidth - popupWidth - padding;
    }
    if (top + popupHeight > window.innerHeight) {
      top = position.top - popupHeight - padding;
    }

    return { top, left };
  };

  const popupPos = getPopupPosition();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => onOpenChange(false)} />

      {/* Highlight box */}
      <div
        className="fixed border-2 border-blue-500 shadow-lg z-41 pointer-events-none rounded-lg"
        style={{
          top: position.top - 4,
          left: position.left - 4,
          width: position.width + 8,
          height: position.height + 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
        }}
      />

      {/* Popup */}
      <Card
        className="fixed z-50 w-80 p-4 shadow-xl"
        style={{
          top: `${popupPos.top}px`,
          left: `${popupPos.left}px`,
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {step.title}
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {step.body}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === currentStep ? "bg-blue-600" : "bg-slate-300"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleNext}
            >
              {currentStep === TOUR_STEPS.length - 1 ? "Done" : "Next"}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}