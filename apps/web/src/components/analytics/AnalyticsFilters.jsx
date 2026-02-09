import React from "react";
import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";

export default function AnalyticsFilters({
  dateRange,
  onDateRangeChange,
  deviceType,
  onDeviceTypeChange,
  trafficSource,
  onTrafficSourceChange,
  identityStatus,
  onIdentityStatusChange,
  onReset,
  sources = [],
}) {
  const hasActiveFilters =
    deviceType || trafficSource || identityStatus || dateRange?.from || dateRange?.to;

  const dateRangePresets = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
  ];

  const handlePresetClick = (days) => {
    const to = new Date();
    const from = subDays(to, days);
    onDateRangeChange({ from, to });
  };

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[hsl(var(--text-2))]" />
          <h3 className="text-h3">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs gap-1"
          >
            <X className="w-3 h-3" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {dateRange?.from ? (
                dateRange?.to ? (
                  <>
                    {format(dateRange.from, "MMM d")} -{" "}
                    {format(dateRange.to, "MMM d")}
                  </>
                ) : (
                  format(dateRange.from, "MMM d, yyyy")
                )
              ) : (
                "Select dates"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {dateRangePresets.map((preset) => (
                  <Button
                    key={preset.days}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(preset.days)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-2))] block mb-2">
                    From
                  </label>
                  <CalendarComponent
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={(date) =>
                      onDateRangeChange({ ...dateRange, from: date })
                    }
                    disabled={(date) =>
                      dateRange?.to ? date > dateRange.to : false
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-2))] block mb-2">
                    To
                  </label>
                  <CalendarComponent
                    mode="single"
                    selected={dateRange?.to}
                    onSelect={(date) =>
                      onDateRangeChange({ ...dateRange, to: date })
                    }
                    disabled={(date) =>
                      dateRange?.from ? date < dateRange.from : false
                    }
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Device Type */}
        <Select value={deviceType || ""} onValueChange={onDeviceTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Device Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Devices</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
          </SelectContent>
        </Select>

        {/* Traffic Source */}
        <Select value={trafficSource || ""} onValueChange={onTrafficSourceChange}>
          <SelectTrigger>
            <SelectValue placeholder="Traffic Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Sources</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Identity Status */}
        <Select value={identityStatus || ""} onValueChange={onIdentityStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Identity Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Status</SelectItem>
            <SelectItem value="anonymous">Anonymous</SelectItem>
            <SelectItem value="identified_person">Identified Person</SelectItem>
            <SelectItem value="identified_company">Identified Company</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}