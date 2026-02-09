import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Share2, Calendar, Trash2, Settings, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import WidgetBuilder from "@/components/dashboards/WidgetBuilder";
import DashboardWidget from "@/components/dashboards/DashboardWidget";
import CollaboratorManager from "@/components/dashboards/CollaboratorManager";
import RealtimePresence from "@/components/dashboards/RealtimePresence";
import ActivityFeed from "@/components/dashboards/ActivityFeed";
import WidgetComments from "@/components/dashboards/WidgetComments";
import DateRangeSelector from "@/components/analytics/DateRangeSelector";

export default function DashboardBuilder() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dashboardId = urlParams.get("id");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [widgets, setWidgets] = useState([]);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [shareDialog, setShareDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [recipients, setRecipients] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [userPermission, setUserPermission] = useState("edit");
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
    end: new Date(), 
    label: "Last 7 Days" 
  });
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [showTrend, setShowTrend] = useState(true);
  const [showForecast, setShowForecast] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard", dashboardId],
    queryFn: () => base44.entities.Dashboard.list().then(all => all.find(d => d.id === dashboardId)),
    enabled: !!dashboardId,
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ["collaborators", dashboardId],
    queryFn: () => base44.entities.DashboardCollaborator.filter({ dashboard_id: dashboardId }),
    enabled: !!dashboardId,
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (dashboard) {
      setName(dashboard.name);
      setDescription(dashboard.description || "");
      setWidgets(dashboard.layout_json || []);
      setIsPublic(dashboard.is_public);
    }
  }, [dashboard]);

  useEffect(() => {
    if (currentUser && collaborators.length > 0) {
      const userCollab = collaborators.find(c => c.user_email === currentUser.email);
      if (userCollab) {
        setUserPermission(userCollab.permission);
      }
    }
  }, [currentUser, collaborators]);

  const saveMutation = useMutation({
    mutationFn: (data) => dashboardId
      ? base44.entities.Dashboard.update(dashboardId, data)
      : base44.entities.Dashboard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      window.location.href = createPageUrl("Dashboards");
    },
  });

  const shareMutation = useMutation({
    mutationFn: (data) => base44.entities.DashboardShare.create(data),
    onSuccess: () => {
      setShareDialog(false);
      setShareEmail("");
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduledReport.create(data),
    onSuccess: () => {
      setScheduleDialog(false);
      setRecipients("");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      tenant_id: "demo",
      name,
      description,
      layout_json: widgets,
      is_public: isPublic,
      [dashboardId ? "updated_by_user_id" : "created_by_user_id"]: "current_user",
    });
  };

  const addWidget = (widget) => {
    setWidgets([...widgets, widget]);
    if (dashboardId && currentUser) {
      base44.entities.DashboardActivity.create({
        tenant_id: "demo",
        dashboard_id: dashboardId,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        action: "widget_added",
        widget_id: widget.id,
        details_json: { widgetType: widget.type }
      });
    }
  };

  const removeWidget = (id) => {
    setWidgets(widgets.filter(w => w.id !== id));
    if (dashboardId && currentUser) {
      base44.entities.DashboardActivity.create({
        tenant_id: "demo",
        dashboard_id: dashboardId,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        action: "widget_removed",
        widget_id: id
      });
    }
  };

  const handleShare = () => {
    shareMutation.mutate({
      dashboard_id: dashboardId,
      shared_with_email: shareEmail,
      permission: "view",
      shared_by_user_id: "current_user",
    });
  };

  const handleSchedule = () => {
    scheduleMutation.mutate({
      tenant_id: "demo",
      dashboard_id: dashboardId,
      name: `${name} Report`,
      frequency,
      recipients: recipients.split(",").map(e => e.trim()),
      enabled: true,
      created_by_user_id: "current_user",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Dashboards")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {dashboardId ? "Edit Dashboard" : "New Dashboard"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeSelector 
            value={dateRange} 
            onChange={setDateRange}
            showComparison={true}
            onCompareChange={setCompareEnabled}
          />
          {dashboardId && currentUser && (
            <>
              <RealtimePresence dashboardId={dashboardId} currentUser={currentUser} />
              <ActivityFeed dashboardId={dashboardId} />
              <CollaboratorManager 
                dashboardId={dashboardId} 
                tenantId="demo" 
                currentUserEmail={currentUser.email} 
              />
              <Button variant="outline" size="sm" onClick={() => setScheduleDialog(true)}>
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Schedule
              </Button>
            </>
          )}
          {userPermission === "edit" && (
            <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Dashboard
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Dashboard Name</Label>
            <Input
              placeholder="e.g., Executive Overview"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <Label className="text-sm">Share with team</Label>
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Widgets</h3>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTrend(!showTrend)}
              className={showTrend ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : ""}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Trend
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowForecast(!showForecast)}
              className={showForecast ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" : ""}
            >
              Forecast
            </Button>
            {userPermission === "edit" && (
              <Button variant="outline" size="sm" onClick={() => setWidgetDialogOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Widget
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map((widget) => (
            <div key={widget.id} className="relative group">
              <DashboardWidget 
                widget={widget} 
                dateRange={dateRange}
                showTrend={showTrend}
                showForecast={showForecast}
              />
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {currentUser && (
                  <WidgetComments
                    widgetId={widget.id}
                    dashboardId={dashboardId}
                    tenantId="demo"
                    currentUser={currentUser}
                    canComment={userPermission !== "view"}
                  />
                )}
                {userPermission === "edit" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 h-7 w-7"
                    onClick={() => removeWidget(widget.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {widgets.length === 0 && (
            <div className="col-span-full bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
              <Settings className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No widgets yet</p>
              {userPermission === "edit" && (
                <Button variant="outline" onClick={() => setWidgetDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Your First Widget
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {userPermission === "edit" && (
        <WidgetBuilder
          open={widgetDialogOpen}
          onClose={() => setWidgetDialogOpen(false)}
          onSave={addWidget}
        />
      )}

      <Dialog open={shareDialog} onOpenChange={setShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialog(false)}>Cancel</Button>
            <Button onClick={handleShare} className="bg-violet-600 hover:bg-violet-700">Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipients (comma-separated emails)</Label>
              <Textarea
                placeholder="email1@company.com, email2@company.com"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(false)}>Cancel</Button>
            <Button onClick={handleSchedule} className="bg-violet-600 hover:bg-violet-700">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}