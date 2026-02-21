import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, Users, Copy, Download, Link, Trash2, Search,
  ArrowUpDown, Settings, Check, ChevronLeft, CodeXml, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import StatusBadge from "@/components/shared/StatusBadge";
import moment from "moment";

// --- Staged messages for the creating interstitial ---
const CREATING_MESSAGES = [
  { text: "Creating your pixel...", delay: 0 },
  { text: "Configuring tracking parameters...", delay: 5000 },
  { text: "Generating your pixel snippet...", delay: 15000 },
  { text: "Almost there...", delay: 30000 },
];

// --- Creating Interstitial Screen ---
function CreatingInterstitial() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timers = CREATING_MESSAGES.slice(1).map((msg, i) =>
      setTimeout(() => setMessageIndex(i + 1), msg.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <Loader2 className="w-10 h-10 text-slate-400 dark:text-slate-500 animate-spin mb-6" />
      <p className="text-base font-medium text-slate-900 dark:text-slate-100 mb-2 transition-all">
        {CREATING_MESSAGES[messageIndex].text}
      </p>
      <p className="text-sm text-slate-400 dark:text-slate-500">
        This usually takes 15–30 seconds
      </p>
    </div>
  );
}

// --- Install Content (reused in both Create modal step 2 and Install modal) ---
function InstallContent({ pixelId, onFinish }) {
  const [installMethod, setInstallMethod] = useState("basic");
  const [ga4Id, setGa4Id] = useState("");
  const [copied, setCopied] = useState(false);

  const basicSnippet = `<script src="https://cdn.arkdata.io/pixels/${pixelId}/p.js" async></script>`;
  const gaSnippet = `<script src="https://cdn.arkdata.io/pixels/${pixelId}/p.js" data-ga4-key="${ga4Id || "YOUR_GA_TRACKING_ID"}" async></script>`;
  const snippet = installMethod === "basic" ? basicSnippet : gaSnippet;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Choose your installation method below.
      </p>

      {/* Method Toggle */}
      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setInstallMethod("basic")}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
            installMethod === "basic"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600"
          }`}
        >
          Basic Install
        </button>
        <button
          onClick={() => setInstallMethod("ga")}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
            installMethod === "ga"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              : "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <rect x="4" y="14" width="4" height="8" rx="1" fill="#F9AB00" />
            <rect x="10" y="8" width="4" height="14" rx="1" fill="#F9AB00" />
            <rect x="16" y="2" width="4" height="20" rx="1" fill="#F9AB00" />
          </svg>
          With Google Analytics
        </button>
      </div>

      {installMethod === "basic" ? (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Basic Pixel Installation
          </h3>
          <ol className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5 list-decimal list-inside">
            <li>
              Insert this script into the{" "}
              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{"<head>"}</code>{" "}
              block before{" "}
              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{"</head>"}</code>{" "}
              on all pages.
            </li>
            <li>Save changes and test using browser developer tools (Network tab).</li>
          </ol>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Google Analytics Integration
          </h3>
          <ol className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5 list-decimal list-inside">
            <li>Enter your GA4 tracking ID in the input field below.</li>
            <li>
              Insert the generated script into the{" "}
              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{"<head>"}</code>{" "}
              block before{" "}
              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{"</head>"}</code>{" "}
              on all pages.
            </li>
            <li>Ensure the script loads <strong>after</strong> Google Tag Manager (GTM) or GA4 is initialized.</li>
            <li>Save changes and test using browser developer tools (Network tab).</li>
          </ol>

          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 block mb-2">
              GA4 Tracking ID
            </label>
            <Input
              placeholder="G-XXXXXXXXXX"
              value={ga4Id}
              onChange={(e) => setGa4Id(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Code Snippet */}
      <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
        <pre className="text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all pr-16">
          {snippet}
        </pre>
        <button
          onClick={copySnippet}
          className="absolute top-3 right-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Verify */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Verify Installation
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          After installing the pixel script on your website, verify that it's working correctly
          by checking for recent events. It may take a minute or two for events to start appearing.
        </p>
        <Button variant="outline" className="w-full mt-2">
          Check Installation
        </Button>
      </div>

      {/* Finish */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onFinish}
          className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Finish
        </Button>
      </div>
    </div>
  );
}

// --- Stepper UI ---
function Stepper({ step, steps }) {
  return (
    <div className="flex items-center max-w-md ml-3">
      {steps.map((s, i) => (
        <React.Fragment key={s.num}>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step >= s.num
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "border-2 border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500"
              }`}
            >
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-sm font-medium ${
                step >= s.num
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 mx-4" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const WIZARD_STEPS = [
  { num: 1, label: "Pixel Details" },
  { num: 2, label: "Install" },
];

// --- Create Pixel Modal ---
function CreatePixelModal({ open, onOpenChange, onPixelCreating }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdPixelId, setCreatedPixelId] = useState(null);

  const reset = () => {
    setStep(1);
    setName("");
    setUrl("");
    setCreating(false);
    setCreatedPixelId(null);
  };

  const handleOpenChange = (val) => {
    // Block closing during creation
    if (creating && !val) {
      // Allow close — pixel goes to "creating" state in table
      onOpenChange(val);
      return;
    }
    if (!val) reset();
    onOpenChange(val);
  };

  const handleCreate = () => {
    setCreating(true);

    // Add pixel to table immediately as "creating"
    const pendingPixel = {
      id: `pending-${Date.now()}`,
      name: name.trim(),
      domain: url.trim(),
      status: "creating",
      last_event_at: null,
    };
    onPixelCreating(pendingPixel);

    // Simulate backend pixel creation (replace with real API call later)
    setTimeout(() => {
      setCreating(false);
      setCreatedPixelId("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
      setStep(2);
    }, 20000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[560px] p-0 gap-0"
        onPointerDownOutside={creating ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={creating ? (e) => e.preventDefault() : undefined}
        hideClose={creating}
      >
        <DialogTitle className="sr-only">Create Pixel</DialogTitle>
        <DialogDescription className="sr-only">Create a new tracking pixel</DialogDescription>

        {creating ? (
          <CreatingInterstitial />
        ) : (
          <>
            <div className="p-6 pb-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">Create Pixel</h2>
              <div className="mb-6">
                <Stepper step={step} steps={WIZARD_STEPS} />
              </div>
            </div>

            <div className="px-6 pb-6">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 block mb-2">
                      Website Name
                    </label>
                    <Input
                      placeholder="My Website Pixel"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 block mb-2">
                      Website URL
                    </label>
                    <Input
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleCreate}
                      disabled={!name.trim() || !url.trim()}
                      className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 gap-1.5"
                    >
                      Create
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && createdPixelId && (
                <InstallContent
                  pixelId={createdPixelId}
                  onFinish={() => handleOpenChange(false)}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Install Pixel Modal (for existing pixels in the table) ---
function InstallPixelModal({ open, onOpenChange, pixel }) {
  if (!pixel) return null;

  const pixelId = pixel.pixel_public_id || "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogTitle className="sr-only">Install Pixel</DialogTitle>
        <DialogDescription className="sr-only">Install pixel on your website</DialogDescription>

        <div className="p-6 pb-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Install Pixel</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            {pixel.name || pixel.domain}
          </p>
        </div>

        <div className="px-6 pb-6">
          <InstallContent
            pixelId={pixelId}
            onFinish={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function AppSettings() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingPixels, setPendingPixels] = useState([]);
  const [installPixel, setInstallPixel] = useState(null);
  const [deletePixel, setDeletePixel] = useState(null);

  const queryClient = useQueryClient();

  const { data: domains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: () => base44.entities.Domain.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      // For pending pixels, just remove from local state
      if (String(id).startsWith("pending-")) {
        setPendingPixels(prev => prev.filter(p => p.id !== id));
        return Promise.resolve();
      }
      return base44.entities.Domain.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
      setDeletePixel(null);
    },
  });

  // Merge real domains with pending "creating" pixels
  const allPixels = [...pendingPixels, ...domains];

  const filtered = allPixels
    .filter(d => {
      const q = search.toLowerCase();
      return !q || d.domain?.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  const handlePixelCreating = useCallback((pixel) => {
    setPendingPixels(prev => [pixel, ...prev]);

    // Simulate auto-update to active after creation completes
    setTimeout(() => {
      setPendingPixels(prev =>
        prev.map(p => p.id === pixel.id ? { ...p, status: "active" } : p)
      );
    }, 25000);
  }, []);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ field, children }) => (
    <th
      className="text-left px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
      </span>
    </th>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Manage Pixels</h1>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 gap-1.5"
        >
          Create
        </Button>
      </div>

      {/* Search */}
      <div className="flex justify-end">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-slate-100 dark:border-slate-800">
            <tr>
              <SortHeader field="name">Website Name</SortHeader>
              <SortHeader field="domain">Website Url</SortHeader>
              <SortHeader field="last_event_at">Last Sync</SortHeader>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  {search ? "No pixels match your search" : "No pixels created yet"}
                </td>
              </tr>
            ) : (
              filtered.map(d => {
                const isCreating = d.status === "creating";
                return (
                  <tr key={d.id} className={`transition-colors ${isCreating ? "opacity-60" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                      {d.name || d.domain || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {d.domain ? `https://${d.domain.replace(/^https?:\/\//, "")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {d.last_event_at ? moment(d.last_event_at).fromNow() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status || "active"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!isCreating && (
                          <>
                            <button
                              title="Install pixel"
                              onClick={() => setInstallPixel(d)}
                              className="p-1.5 rounded-md text-violet-500 hover:text-violet-700 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:bg-violet-900/20 transition-colors"
                            >
                              <CodeXml className="w-4 h-4" />
                            </button>
                            {[
                              { icon: BarChart3, title: "Analytics" },
                              { icon: Users, title: "Visitors" },
                              { icon: Copy, title: "Copy pixel" },
                              { icon: Download, title: "Export" },
                              { icon: Settings, title: "Settings" },
                            ].map(({ icon: Icon, title }) => (
                              <button
                                key={title}
                                title={title}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            ))}
                            <button
                              title="Delete"
                              onClick={() => setDeletePixel(d)}
                              className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isCreating && (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CreatePixelModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onPixelCreating={handlePixelCreating}
      />

      <InstallPixelModal
        open={!!installPixel}
        onOpenChange={(val) => { if (!val) setInstallPixel(null); }}
        pixel={installPixel}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletePixel} onOpenChange={(val) => { if (!val) setDeletePixel(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Delete Pixel
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to delete <strong>{deletePixel?.name || deletePixel?.domain}</strong>? This will remove the pixel and stop all tracking. This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeletePixel(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => deleteMutation.mutate(deletePixel.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
