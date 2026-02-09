import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Save, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DateRangeSelector from "@/components/analytics/DateRangeSelector";

export default function WidgetDateRangeManager({ widget, onDateRangeChange }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [widgetDateRange, setWidgetDateRange] = useState(widget.dateRange);
  const [savedRanges, setSavedRanges] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: ranges = [] } = useQuery({
    queryKey: ["saved-date-ranges", currentUser?.email],
    queryFn: () => currentUser ? 
      base44.entities.SavedDateRange.filter({ user_email: currentUser.email }) 
      : Promise.resolve([]),
    enabled: !!currentUser,
  });

  useEffect(() => {
    setSavedRanges(ranges);
  }, [ranges]);

  const handleSaveRange = async (rangeName) => {
    if (!currentUser) return;
    
    await base44.entities.SavedDateRange.create({
      tenant_id: "demo",
      user_email: currentUser.email,
      name: rangeName,
      start_date: widgetDateRange.start.toISOString().split('T')[0],
      end_date: widgetDateRange.end.toISOString().split('T')[0],
      is_default: false
    });
  };

  const handleApplyRange = (range) => {
    const newRange = {
      start: new Date(range.start_date),
      end: new Date(range.end_date),
      label: range.name
    };
    setWidgetDateRange(newRange);
    onDateRangeChange(newRange);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-1.5"
      >
        <Calendar className="w-3.5 h-3.5" />
        Date Range
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Widget Date Range</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-3">Select Date Range</Label>
              <DateRangeSelector 
                value={widgetDateRange} 
                onChange={setWidgetDateRange}
              />
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3">Saved Ranges</Label>
              <div className="space-y-2">
                {savedRanges.length > 0 ? (
                  savedRanges.map((range) => (
                    <div key={range.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{range.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApplyRange(range)}
                        className="text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No saved ranges yet</p>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="range-name" className="text-sm font-medium">Save This Range</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="range-name"
                  placeholder="e.g., Q1 2025"
                  className="text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    const name = e.target.parentElement.querySelector('input').value;
                    if (name) {
                      handleSaveRange(name);
                      e.target.parentElement.querySelector('input').value = '';
                    }
                  }}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            <Button 
              onClick={() => {
                onDateRangeChange(widgetDateRange);
                setDialogOpen(false);
              }}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Apply Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}