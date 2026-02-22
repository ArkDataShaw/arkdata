import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "@arkdata/firebase-sdk";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight, X, PartyPopper, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Floating onboarding sprite that guides first-time users through pixel creation.
 *
 * Steps:
 *   0 — Welcome (any non-pixel page): "Let's create your first pixel"
 *   1 — On pixel page, no pixels yet: "Click Create First Pixel above"
 *   2 — Pixel created: "You're all set! More features coming soon."
 *
 * Dismissed permanently after step 2 (or manual dismiss). State persisted in Firestore.
 */

const ONBOARDING_STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to Ark Data!",
    body: "Let's get you set up. First, we'll create a tracking pixel for your website so you can start identifying visitors.",
    cta: "Go to Pixel Page",
  },
  {
    icon: MousePointerClick,
    title: "Create Your First Pixel",
    body: "Click the \"Create First Pixel\" button above to set up tracking on your website. It only takes a minute!",
    cta: null,
  },
  {
    icon: PartyPopper,
    title: "You're All Set!",
    body: "Your pixel is live! More features are coming soon — we'll notify you when visitors start populating on your site.",
    cta: "Got It",
  },
];

export default function OnboardingSprite({ currentPageName }) {
  const [dismissed, setDismissed] = useState(null); // null = loading, true/false
  const [minimized, setMinimized] = useState(false);
  const [userId, setUserId] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const navigate = useNavigate();

  // Load user info
  useEffect(() => {
    base44.auth.me().then((u) => {
      setUserId(u.id);
      setTenantId(u.tenant_id);
    }).catch(() => {});
  }, []);

  // Check Firestore for onboarding completion
  useEffect(() => {
    if (!userId || !tenantId) return;
    const db = getDb();
    const ref = doc(db, "tenants", tenantId, "onboarding_state", userId);
    getDoc(ref).then((snap) => {
      if (snap.exists() && snap.data().pixel_onboarding_completed) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    }).catch(() => setDismissed(true)); // fail safe — don't block the user
  }, [userId, tenantId]);

  // Query existing pixels
  const { data: domains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: () => base44.entities.Domain.list(),
    enabled: dismissed === false,
  });

  const hasPixels = domains.length > 0;
  const isOnPixelPage = currentPageName === "AppSettings";

  // Determine current step
  let step;
  if (hasPixels) {
    step = 2;
  } else if (isOnPixelPage) {
    step = 1;
  } else {
    step = 0;
  }

  const markComplete = async () => {
    setDismissed(true);
    if (!userId || !tenantId) return;
    try {
      const db = getDb();
      const ref = doc(db, "tenants", tenantId, "onboarding_state", userId);
      await setDoc(ref, { pixel_onboarding_completed: true }, { merge: true });
    } catch (err) {
      console.error("Failed to persist onboarding state:", err);
    }
  };

  const handleCta = () => {
    if (step === 0) {
      navigate("/AppSettings");
    } else if (step === 2) {
      markComplete();
    }
  };

  const handleDismiss = () => {
    markComplete();
  };

  // Don't render while loading or if already completed
  if (dismissed === null || dismissed === true) return null;

  const currentStep = ONBOARDING_STEPS[step];
  const Icon = currentStep.icon;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Speech bubble tail */}
      <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-slate-800 rotate-45 border-r border-b border-slate-200 dark:border-slate-700" />

      <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white dark:text-slate-900" />
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Setup Guide</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Minimize"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {currentStep.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {currentStep.body}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4 mb-1">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-4 bg-blue-600 dark:bg-blue-400"
                    : i < step
                    ? "w-1.5 bg-blue-300 dark:bg-blue-600"
                    : "w-1.5 bg-slate-200 dark:bg-slate-600"
                }`}
              />
            ))}
          </div>

          {/* CTA */}
          {currentStep.cta && (
            <Button
              onClick={handleCta}
              className="w-full mt-3 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 gap-1.5 text-xs h-8"
            >
              {currentStep.cta}
              {step === 0 && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
