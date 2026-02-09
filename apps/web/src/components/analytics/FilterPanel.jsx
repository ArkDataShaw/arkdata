import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown, ChevronUp } from "lucide-react";

export default function FilterPanel({ 
  filters = {}, 
  onFiltersChange, 
  sources = [],
  deviceTypes = [],
  countries = []
}) {
  const [expanded, setExpanded] = useState(true);

  const handleSourceToggle = (source) => {
    const newSources = filters.sources?.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...(filters.sources || []), source];
    onFiltersChange({ ...filters, sources: newSources });
  };

  const handleDeviceToggle = (device) => {
    const newDevices = filters.deviceTypes?.includes(device)
      ? filters.deviceTypes.filter(d => d !== device)
      : [...(filters.deviceTypes || []), device];
    onFiltersChange({ ...filters, deviceTypes: newDevices });
  };

  const handleCountryChange = (country) => {
    onFiltersChange({ ...filters, country });
  };

  const activeFilterCount = 
    (filters.sources?.length || 0) +
    (filters.deviceTypes?.length || 0) +
    (filters.country ? 1 : 0);

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <CardTitle>Filters</CardTitle>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white text-xs font-semibold">
              {activeFilterCount}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Traffic Sources */}
          {sources.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Traffic Source</h4>
              <div className="space-y-2">
                {sources.map(source => (
                  <label key={source} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.sources?.includes(source) || false}
                      onCheckedChange={() => handleSourceToggle(source)}
                    />
                    <span className="text-sm">{source}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Device Type */}
          {deviceTypes.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Device Type</h4>
              <div className="space-y-2">
                {deviceTypes.map(device => (
                  <label key={device} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.deviceTypes?.includes(device) || false}
                      onCheckedChange={() => handleDeviceToggle(device)}
                    />
                    <span className="text-sm">{device}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Country */}
          {countries.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Country</h4>
              <Select value={filters.country || ""} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFiltersChange({})}
              className="w-full"
            >
              <X size={16} className="mr-2" />
              Clear all filters
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}