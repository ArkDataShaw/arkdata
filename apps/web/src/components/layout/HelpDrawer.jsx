import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  X, Search, BookOpen, ExternalLink, MessageCircle, AlertCircle,
  Lightbulb, MessageSquare, CheckCircle2, Clock, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import FeedbackSubmissionForm from "@/components/feedback/FeedbackSubmissionForm";

const typeIcons = {
  bug: <AlertCircle className="w-3.5 h-3.5" />,
  feature_request: <Lightbulb className="w-3.5 h-3.5" />,
  general_feedback: <MessageSquare className="w-3.5 h-3.5" />,
};

const statusColors = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  planned: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  under_consideration: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function HelpDrawer({ open, onClose }) {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [tickets, setTickets] = useState([]);

  const isAdmin = user?.role === "super_admin" || user?.role === "tenant_admin";

  useEffect(() => {
    if (open) {
      base44.entities.HelpArticle.list().then(setArticles).catch(() => {});
      base44.entities.HelpSettings.list().then(s => setSettings(s[0])).catch(() => {});
      if (isAdmin) {
        base44.entities.Feedback.list("-created_date", 100)
          .then((all) => setTickets(all.filter((fb) => fb.status !== "completed" && fb.status !== "dismissed")))
          .catch(() => {});
      }
    }
  }, [open, isAdmin]);

  const filtered = articles.filter(a =>
    a.is_published && a.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-[400px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {settings?.launcher_label || "Help Center"}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Status Banner */}
            {settings?.status_banner_json?.active && (
              <div className={`px-5 py-3 text-sm flex items-center gap-2 ${
                settings.status_banner_json.severity === "error" ? "bg-red-50 text-red-700" :
                settings.status_banner_json.severity === "warning" ? "bg-amber-50 text-amber-700" :
                "bg-blue-50 text-blue-700"
              }`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {settings.status_banner_json.message}
              </div>
            )}

            <ScrollArea className="flex-1">
              {selectedArticle ? (
                <div className="p-5">
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="text-sm text-violet-600 hover:underline mb-4 block"
                  >
                    ← Back to articles
                  </button>
                  <h3 className="text-xl font-semibold mb-1">{selectedArticle.title}</h3>
                  <Badge variant="secondary" className="mb-4 text-xs">{selectedArticle.category}</Badge>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{selectedArticle.body_markdown || ""}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search help articles..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Quick Links */}
                  <div className="space-y-2">
                    {settings?.primary_cta_label && (
                      <a
                        href={settings.primary_cta_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:opacity-90 transition-opacity"
                      >
                        <div>
                          <p className="font-semibold text-sm">{settings.primary_cta_label}</p>
                          <p className="text-xs text-white/70 mt-0.5">Talk to our team</p>
                        </div>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setFeedbackOpen(true);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:opacity-90 transition-opacity"
                    >
                      <div>
                        <p className="font-semibold text-sm">Send Feedback</p>
                        <p className="text-xs text-white/70 mt-0.5">Report bugs or suggest features</p>
                      </div>
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Admin Tickets */}
                  {isAdmin && tickets.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                          Open Tickets ({tickets.length})
                        </p>
                        <Link
                          to={createPageUrl("AdminFeedback")}
                          onClick={onClose}
                          className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          View All
                        </Link>
                      </div>
                      <div className="space-y-1.5">
                        {tickets.slice(0, 5).map((ticket) => (
                          <Link
                            key={ticket.id}
                            to={createPageUrl("AdminFeedback")}
                            onClick={onClose}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                          >
                            <div className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0">
                              {typeIcons[ticket.type] || <MessageSquare className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                {ticket.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[ticket.status] || statusColors.new}`}>
                                  {(ticket.status || "new").replace(/_/g, " ")}
                                </Badge>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                  {ticket.user_email}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mt-1 flex-shrink-0 group-hover:text-slate-500" />
                          </Link>
                        ))}
                        {tickets.length > 5 && (
                          <Link
                            to={createPageUrl("AdminFeedback")}
                            onClick={onClose}
                            className="block text-center text-xs text-violet-600 dark:text-violet-400 hover:underline py-2"
                          >
                            +{tickets.length - 5} more tickets
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Articles */}
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">Articles</p>
                    <div className="space-y-1.5">
                      {filtered.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                        >
                          <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-violet-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{article.title}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{article.category}</p>
                          </div>
                        </button>
                      ))}
                      {filtered.length === 0 && (
                        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No articles found</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {settings?.support_email && (
              <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                <a
                  href={`mailto:${settings.support_email}`}
                  className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact support
                </a>
              </div>
            )}
            </motion.div>
            </>
            )}
            <FeedbackSubmissionForm open={feedbackOpen} onOpenChange={setFeedbackOpen} />
            </AnimatePresence>
            );
            }