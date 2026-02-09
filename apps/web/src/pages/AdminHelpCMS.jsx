import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Edit, Trash2, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

export default function AdminHelpCMS() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [form, setForm] = useState({ title: "", slug: "", category: "", body_markdown: "", is_published: true, order_index: 0 });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["help-articles"],
    queryFn: () => base44.entities.HelpArticle.list("order_index"),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id
      ? base44.entities.HelpArticle.update(id, data)
      : base44.entities.HelpArticle.create({ ...data, scope: "global" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HelpArticle.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["help-articles"] }),
  });

  const openEditor = (article) => {
    setEditArticle(article);
    setForm(article ? {
      title: article.title || "",
      slug: article.slug || "",
      category: article.category || "",
      body_markdown: article.body_markdown || "",
      is_published: article.is_published !== false,
      order_index: article.order_index || 0,
    } : { title: "", slug: "", category: "", body_markdown: "", is_published: true, order_index: 0 });
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help Center CMS</h1>
          <p className="text-sm text-slate-500 mt-1">Manage help articles, settings, and support content</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 gap-2" onClick={() => openEditor(null)}>
          <Plus className="w-4 h-4" />
          New Article
        </Button>
      </div>

      <div className="space-y-3">
        {articles.length === 0 && !isLoading && (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No help articles yet</p>
          </div>
        )}
        {articles.map((article) => (
          <div key={article.id} className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{article.title}</p>
                <Badge variant="outline" className="text-xs">{article.category || "General"}</Badge>
                {!article.is_published && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">Draft</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-1">{article.body_markdown?.slice(0, 100)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => openEditor(article)}>
              <Edit className="w-4 h-4 text-slate-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(article.id)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editArticle ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g., Getting Started" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Body (Markdown)</Label>
              <Textarea
                className="mt-1 min-h-[200px] font-mono text-sm"
                value={form.body_markdown}
                onChange={e => setForm({...form, body_markdown: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({...form, is_published: v})}
              />
              <Label className="text-sm">Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700 gap-1.5" onClick={() => saveMutation.mutate({ id: editArticle?.id, data: form })}>
              <Save className="w-3.5 h-3.5" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}