import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Send, Check, MoreVertical, Trash2 } from "lucide-react";
import moment from "moment";

export default function WidgetComments({ widgetId, dashboardId, tenantId, currentUser, canComment }) {
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ["widget-comments", widgetId],
    queryFn: () => base44.entities.DashboardComment.filter({ widget_id: widgetId }),
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.DashboardComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widget-comments", widgetId] });
      setComment("");
      setReplyTo(null);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.DashboardComment.update(id, {
      is_resolved: true,
      resolved_by: currentUser.email,
      resolved_at: new Date().toISOString()
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["widget-comments", widgetId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DashboardComment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["widget-comments", widgetId] }),
  });

  const handleSubmit = () => {
    if (!comment.trim()) return;
    addMutation.mutate({
      tenant_id: tenantId,
      dashboard_id: dashboardId,
      widget_id: widgetId,
      parent_comment_id: replyTo?.id || null,
      author_email: currentUser.email,
      author_name: currentUser.full_name,
      content: comment.trim()
    });
  };

  const topLevelComments = comments.filter(c => !c.parent_comment_id && !c.is_resolved);
  const resolvedComments = comments.filter(c => !c.parent_comment_id && c.is_resolved);
  const unresolvedCount = topLevelComments.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 relative">
          <MessageSquare className="w-3.5 h-3.5" />
          {unresolvedCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unresolvedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex flex-col max-h-96">
          <div className="px-4 py-3 border-b dark:border-slate-800">
            <h4 className="text-sm font-semibold">Widget Comments</h4>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {topLevelComments.map((c) => {
              const replies = comments.filter(r => r.parent_comment_id === c.id);
              return (
                <div key={c.id} className="space-y-2">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{c.author_name}</p>
                        <p className="text-[10px] text-slate-400">{moment(c.created_date).fromNow()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => resolveMutation.mutate({ id: c.id })}
                        >
                          <Check className="w-3 h-3 text-emerald-500" />
                        </Button>
                        {c.author_email === currentUser.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteMutation.mutate(c.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{c.content}</p>
                    {replies.length === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs mt-2"
                        onClick={() => setReplyTo(c)}
                      >
                        Reply
                      </Button>
                    )}
                  </div>
                  {replies.map((r) => (
                    <div key={r.id} className="ml-6 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{r.author_name}</p>
                          <p className="text-[10px] text-slate-400">{moment(r.created_date).fromNow()}</p>
                        </div>
                        {r.author_email === currentUser.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteMutation.mutate(r.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{r.content}</p>
                    </div>
                  ))}
                </div>
              );
            })}

            {resolvedComments.length > 0 && (
              <div className="pt-3 border-t dark:border-slate-800">
                <p className="text-xs text-slate-400 mb-2">Resolved ({resolvedComments.length})</p>
                {resolvedComments.map((c) => (
                  <div key={c.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 opacity-60">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{c.author_name}</p>
                      <Badge variant="outline" className="text-[10px] h-5">Resolved</Badge>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            {topLevelComments.length === 0 && resolvedComments.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
                No comments yet
              </p>
            )}
          </div>

          {canComment && (
            <div className="border-t dark:border-slate-800 p-3">
              {replyTo && (
                <div className="mb-2 text-xs text-slate-500 flex items-center justify-between">
                  <span>Replying to {replyTo.author_name}</span>
                  <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => setReplyTo(null)}>
                    Cancel
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
                <Button size="sm" onClick={handleSubmit} disabled={addMutation.isPending}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}