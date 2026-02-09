import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { processWorkflow } from "@/functions/workflowProcessor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Filter,
  Reply,
} from "lucide-react";

export default function AdminFeedback() {
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    priority: "all",
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState("");
  const queryClient = useQueryClient();

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["feedback-list"],
    queryFn: () => base44.entities.Feedback.list("-created_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) =>
      base44.entities.Feedback.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, response }) => {
      const user = await base44.auth.me();
      const updated = await base44.entities.Feedback.update(id, {
        admin_response: response,
        responded_at: new Date().toISOString(),
        responded_by: user.email,
        status: "in_review",
      });
      
      // Trigger workflows on status change
      await processWorkflow("feedback_status_changed", {
        event_type: "feedback_status_changed",
        entity_id: id,
        entity_type: "feedback",
        new_status: "in_review",
      });
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
      setResponseText("");
      setSelectedFeedback(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const updated = await base44.entities.Feedback.update(id, { status });
      
      // Trigger workflows on status change
      await processWorkflow("feedback_status_changed", {
        event_type: "feedback_status_changed",
        entity_id: id,
        entity_type: "feedback",
        new_status: status,
      });
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }) => {
      const updated = await base44.entities.Feedback.update(id, { priority });
      
      // Trigger workflows on priority change
      await processWorkflow("feedback_priority_changed", {
        event_type: "feedback_priority_changed",
        entity_id: id,
        entity_type: "feedback",
        new_priority: priority,
      });
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
    },
  });

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const typeMatch = filters.type === "all" || fb.type === filters.type;
    const statusMatch = filters.status === "all" || fb.status === filters.status;
    const priorityMatch =
      filters.priority === "all" || fb.priority === filters.priority;
    return typeMatch && statusMatch && priorityMatch;
  });

  const typeIcons = {
    bug: <AlertCircle className="w-4 h-4" />,
    feature_request: <Lightbulb className="w-4 h-4" />,
    general_feedback: <MessageSquare className="w-4 h-4" />,
  };

  const statusColors = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    in_review:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    under_consideration:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    planned:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    dismissed:
      "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  };

  const priorityColors = {
    low: "text-slate-600 dark:text-slate-400",
    medium: "text-orange-600 dark:text-orange-400",
    high: "text-red-600 dark:text-red-400",
    critical: "text-red-700 dark:text-red-300 font-semibold",
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            User Feedback
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage bug reports, feature requests, and user feedback
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Type
            </label>
            <Select
              value={filters.type}
              onValueChange={(value) =>
                setFilters({ ...filters, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug Reports</SelectItem>
                <SelectItem value="feature_request">Feature Requests</SelectItem>
                <SelectItem value="general_feedback">General Feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="under_consideration">
                  Under Consideration
                </SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Priority
            </label>
            <Select
              value={filters.priority}
              onValueChange={(value) =>
                setFilters({ ...filters, priority: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {filteredFeedbacks.length} item{filteredFeedbacks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {filteredFeedbacks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-600 dark:text-slate-400">
                  No feedback found
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFeedbacks.map((fb) => (
              <Card
                key={fb.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedFeedback(fb)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className="text-slate-400 flex-shrink-0 mt-1">
                      {typeIcons[fb.type]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 break-words">
                            {fb.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            From {fb.user_email}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Badge className={statusColors[fb.status]}>
                            {fb.status.replace(/_/g, " ")}
                          </Badge>
                          <Badge variant="outline" className={priorityColors[fb.priority]}>
                            {fb.priority}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {fb.description}
                      </p>

                      {fb.admin_response && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Admin Response:
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {fb.admin_response}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {typeIcons[selectedFeedback.type]}
                {selectedFeedback.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    From
                  </p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    {selectedFeedback.user_email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Page
                  </p>
                  <a
                    href={selectedFeedback.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate"
                  >
                    View
                  </a>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Status
                  </p>
                  <Select
                    value={selectedFeedback.status}
                    onValueChange={(value) => {
                      updateStatusMutation.mutate({
                        id: selectedFeedback.id,
                        status: value,
                      });
                      setSelectedFeedback({
                        ...selectedFeedback,
                        status: value,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="under_consideration">
                        Under Consideration
                      </SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Priority
                  </p>
                  <Select
                    value={selectedFeedback.priority}
                    onValueChange={(value) => {
                      updatePriorityMutation.mutate({
                        id: selectedFeedback.id,
                        priority: value,
                      });
                      setSelectedFeedback({
                        ...selectedFeedback,
                        priority: value,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Description
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {selectedFeedback.description}
                </p>
              </div>

              {/* Response Section */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {selectedFeedback.admin_response ? "Response" : "Add Response"}
                </h4>
                {selectedFeedback.admin_response && !responseText ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      <span className="font-medium">Responded by</span>{" "}
                      {selectedFeedback.responded_by}
                    </p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {selectedFeedback.admin_response}
                    </p>
                  </div>
                ) : null}

                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your response here..."
                  rows={3}
                />
                <Button
                  onClick={() =>
                    respondMutation.mutate({
                      id: selectedFeedback.id,
                      response: responseText,
                    })
                  }
                  className="mt-3 bg-blue-600 hover:bg-blue-700"
                  disabled={
                    !responseText.trim() || respondMutation.isPending
                  }
                >
                  <Reply className="w-4 h-4 mr-2" />
                  Send Response
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}