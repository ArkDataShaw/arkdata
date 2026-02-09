import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Users, Target, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminOnboardingAnalytics() {
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [dateRange, setDateRange] = useState("7days");

  // Fetch all flows
  const { data: flows = [] } = useQuery({
    queryKey: ["onboarding-flows"],
    queryFn: () => base44.entities.OnboardingFlow.list("-created_date", 100),
  });

  // Fetch events for selected flow
  const { data: events = [] } = useQuery({
    queryKey: ["onboarding-events", selectedFlowId, dateRange],
    queryFn: async () => {
      if (!selectedFlowId) return [];
      const allEvents = await base44.entities.OnboardingEvent.filter({}, "-created_date", 1000);
      return allEvents;
    },
    enabled: !!selectedFlowId,
  });

  // Fetch task statuses for completion rates
  const { data: taskStatuses = [] } = useQuery({
    queryKey: ["onboarding-task-statuses-all", selectedFlowId],
    queryFn: async () => {
      if (!selectedFlowId) return [];
      return base44.entities.OnboardingTaskStatus.filter(
        { flow_id: selectedFlowId },
        "-created_date",
        1000
      );
    },
    enabled: !!selectedFlowId,
  });

  if (!selectedFlowId) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Onboarding Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Select a flow to view analytics and performance metrics.
          </p>

          <div className="grid gap-4">
            {flows.map((flow) => (
              <Card
                key={flow.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedFlowId(flow.id)}
              >
                <div className="p-6 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {flow.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Version {flow.version} • {flow.status === "published" ? "Published" : "Draft"}
                    </p>
                  </div>
                  <Badge variant={flow.status === "published" ? "default" : "outline"}>
                    {flow.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedFlow = flows.find((f) => f.id === selectedFlowId);
  const flowConfig = selectedFlow?.config_json;

  if (!flowConfig) {
    return <div className="p-8">Loading...</div>;
  }

  // Calculate metrics
  const allTasks = flowConfig.categories.flatMap((c) => c.tasks);

  const completionMetrics = allTasks.map((task) => {
    const statuses = taskStatuses.filter((s) => s.task_id === task.id);
    const completed = statuses.filter((s) => s.status === "complete").length;
    const total = statuses.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      taskId: task.id,
      taskTitle: task.title,
      completed,
      total,
      completionRate,
      category: task.category,
    };
  });

  const categoryMetrics = flowConfig.categories.map((cat) => {
    const catTasks = completionMetrics.filter((m) => m.category === cat.name);
    const avgCompletion =
      catTasks.length > 0
        ? Math.round(catTasks.reduce((sum, t) => sum + t.completionRate, 0) / catTasks.length)
        : 0;
    return {
      name: cat.name,
      completion: avgCompletion,
      tasks: catTasks.length,
    };
  });

  // Event metrics
  const eventCounts = {
    task_viewed: events.filter((e) => e.event_type === "task_viewed").length,
    task_started: events.filter((e) => e.event_type === "task_started").length,
    task_completed: events.filter((e) => e.event_type === "task_completed").length,
    wizard_opened: events.filter((e) => e.event_type === "wizard_opened").length,
    wizard_skipped: events.filter((e) => e.event_type === "wizard_skipped").length,
  };

  const totalUsers = new Set(events.map((e) => e.user_id)).size;
  const completionRate =
    eventCounts.wizard_opened > 0
      ? Math.round((eventCounts.task_completed / eventCounts.wizard_opened) * 100)
      : 0;

  // Task drop-off analysis
  const dropOffData = allTasks.map((task) => {
    const viewed = events.filter(
      (e) => e.task_id === task.id && e.event_type === "task_viewed"
    ).length;
    const started = events.filter(
      (e) => e.task_id === task.id && e.event_type === "task_started"
    ).length;
    const completed = events.filter(
      (e) => e.task_id === task.id && e.event_type === "task_completed"
    ).length;

    return {
      name: task.title.substring(0, 20),
      viewed,
      started,
      completed,
      dropOff: viewed - completed,
    };
  });

  // Time spent analysis (estimate from events)
  const timeSpentData = allTasks.map((task) => {
    const taskEvents = events.filter((e) => e.task_id === task.id);
    const avgTimeSeconds =
      taskEvents.length > 0
        ? taskEvents.reduce((sum, e) => sum + (e.payload_json?.time_spent_seconds || 0), 0) /
          taskEvents.length
        : 0;

    return {
      name: task.title.substring(0, 20),
      timeMinutes: Math.round(avgTimeSeconds / 60),
    };
  });

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <button
              onClick={() => setSelectedFlowId(null)}
              className="text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Back to flows
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {selectedFlow?.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Version {selectedFlow?.version}
            </p>
          </div>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Unique Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {totalUsers}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Started onboarding
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {completionRate}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Overall flow completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Tasks Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {eventCounts.task_completed}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Total task completions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Avg Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {Math.round(
                  timeSpentData.reduce((sum, t) => sum + t.timeMinutes, 0) / timeSpentData.length
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                minutes per task
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="completion" className="space-y-6">
          <TabsList>
            <TabsTrigger value="completion">Task Completion</TabsTrigger>
            <TabsTrigger value="dropoff">Drop-off Analysis</TabsTrigger>
            <TabsTrigger value="time">Time Spent</TabsTrigger>
            <TabsTrigger value="category">Category Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="completion">
            <Card>
              <CardHeader>
                <CardTitle>Completion Rate by Task</CardTitle>
                <CardDescription>Percentage of users who completed each task</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={completionMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="taskTitle" angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Completion %", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dropoff">
            <Card>
              <CardHeader>
                <CardTitle>Drop-off Analysis</CardTitle>
                <CardDescription>Where users abandon the onboarding flow</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={dropOffData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Event Count", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="viewed" fill="#3b82f6" />
                    <Bar dataKey="started" fill="#10b981" />
                    <Bar dataKey="completed" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time">
            <Card>
              <CardHeader>
                <CardTitle>Average Time Per Task</CardTitle>
                <CardDescription>Estimated time users spend on each task</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={timeSpentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="timeMinutes" stroke="#f59e0b" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="category">
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Completion rates by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={categoryMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: "Completion %", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Bar dataKey="completion" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Task Details Table */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>Performance metrics for each task</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-2 font-medium text-slate-700 dark:text-slate-300">
                      Task
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-slate-700 dark:text-slate-300">
                      Completion
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-slate-700 dark:text-slate-300">
                      Completed Users
                    </th>
                    <th className="text-right py-2 px-2 font-medium text-slate-700 dark:text-slate-300">
                      Total Users
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completionMetrics.map((metric) => (
                    <tr
                      key={metric.taskId}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-3 px-2">{metric.taskTitle}</td>
                      <td className="text-right py-3 px-2">
                        <Badge
                          variant={metric.completionRate >= 75 ? "default" : "outline"}
                          className={
                            metric.completionRate >= 75
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : ""
                          }
                        >
                          {metric.completionRate}%
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-2">{metric.completed}</td>
                      <td className="text-right py-3 px-2">{metric.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}