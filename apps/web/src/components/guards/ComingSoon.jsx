import React from "react";
import { Lock } from "lucide-react";

export default function ComingSoon({ children }) {
  return (
    <div className="relative h-full">
      {/* Render the actual page behind the overlay (blurred) */}
      <div className="pointer-events-none select-none blur-[2px] opacity-40">
        {children}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-50">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Coming Soon
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              This feature is currently under development and will be available soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
