import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "Last 7 Days", days: 7 },
  { label: "Last 14 Days", days: 14 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "This Month", special: "thisMonth" },
  { label: "Last Month", special: "lastMonth" },
];

export default function DateRangeSelector({ value, onChange, showComparison = false, onCompareChange }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [compareEnabled, setCompareEnabled] = useState(false);

  const handlePresetClick = (preset) => {
    const end = new Date();
    let start = new Date();

    if (preset.special === "thisMonth") {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (preset.special === "lastMonth") {
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      end.setDate(0); // Last day of previous month
    } else {
      start.setDate(end.getDate() - preset.days);
    }

    onChange({ start, end, label: preset.label });
  };

  const handleCustomRange = (range) => {
    if (range?.from && range?.to) {
      onChange({
        start: range.from,
        end: range.to,
        label: `${format(range.from, "MMM d")} - ${format(range.to, "MMM d")}`
      });
      setCustomOpen(false);
    }
  };

  const toggleCompare = () => {
    const newState = !compareEnabled;
    setCompareEnabled(newState);
    if (onCompareChange) {
      onCompareChange(newState);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 min-w-[200px] justify-start">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="text-sm">{value?.label || "Select date range"}</span>
            <ChevronDown className="w-3 h-3 ml-auto" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r border-slate-200 dark:border-slate-800 p-2 space-y-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                    value?.label === preset.label
                      ? "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setCustomOpen(!customOpen)}
                className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                Custom Range
              </button>
            </div>
            {customOpen && (
              <div className="p-3">
                <Calendar
                  mode="range"
                  selected={{ from: value?.start, to: value?.end }}
                  onSelect={handleCustomRange}
                  numberOfMonths={2}
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {showComparison && (
        <Button
          variant={compareEnabled ? "default" : "outline"}
          size="sm"
          onClick={toggleCompare}
          className="gap-2"
        >
          <span className="text-sm">Compare</span>
        </Button>
      )}
    </div>
  );
}