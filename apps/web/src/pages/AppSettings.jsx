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

// --- Pixel Creator API config ---
const PIXEL_CREATOR_URL = import.meta.env.VITE_PIXEL_CREATOR_URL || "http://localhost:8081";
const PIXEL_CREATOR_API_KEY = import.meta.env.VITE_PIXEL_CREATOR_API_KEY || "";

// --- URL validation ---
function isValidUrl(str) {
  try {
    // Must be https:// or no protocol — reject http:// and other protocols
    if (/^[a-zA-Z]+:\/\//.test(str) && !/^https:\/\//.test(str)) return false;
    const stripped = str.replace(/^https:\/\//, "").trim().split(/[/?#]/)[0];
    if (!stripped) return false;
    const u = new URL(`https://${stripped}`);
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(u.hostname)) return false;
    // Require a subdomain (e.g. www.test.co, app.test.co) — bare domains like test.co are rejected
    return u.hostname.split(".").length >= 3;
  } catch {
    return false;
  }
}

function suggestUrl(str) {
  // Strip any protocol to get the raw host + path
  const stripped = str.replace(/^[a-zA-Z]+:\/\//, "").trim().split(/[/?#]/)[0];
  if (!stripped) return null;
  // Check it looks like a valid hostname
  if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(stripped)) return null;
  // Count domain parts to detect if a subdomain is present
  // e.g. "app.test.tv" = 3 parts (has subdomain), "test.com" = 2 parts (bare domain)
  const parts = stripped.split(".");
  if (parts.length <= 2) {
    // Bare domain like test.com → suggest www.test.com
    return `https://www.${stripped}`;
  }
  // Already has a subdomain (app.test.tv, www.test.com) → keep it
  return `https://${stripped}`;
}

// --- Staged messages for the creating interstitial ---
const CREATING_MESSAGES = [
  { text: "Creating your pixel...", delay: 0 },
  { text: "Generating snippet...", delay: 3000 },
  { text: "Almost there...", delay: 6000 },
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
        This usually takes 15-30 seconds
      </p>
    </div>
  );
}

// --- Install Content (reused in both Create modal step 2 and Install modal) ---
function InstallContent({ pixelId, realPixelCode, onFinish }) {
  const [installMethod, setInstallMethod] = useState("basic");
  const [ga4Id, setGa4Id] = useState("");
  const [copied, setCopied] = useState(false);

  // Use the real pixel code from IntentCore — no fallback to a fake URL
  const basicSnippet = realPixelCode || "Pixel code unavailable — please recreate the pixel.";
  const gaSnippet = realPixelCode
    ? realPixelCode.replace(/(async|defer)/, `data-ga4-key="${ga4Id || "YOUR_GA_TRACKING_ID"}" $1`)
    : basicSnippet;
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

      {/* GA4 Note */}
      {installMethod === "ga" && (
        <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <span className="font-bold">Note:</span> Remember to replace "YOUR_GA_TRACKING_ID" with your actual GA4 tracking ID in the script.
          </p>
        </div>
      )}

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
function CreatePixelModal({ open, onOpenChange, onPixelCreating, onPixelCreated }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdPixelId, setCreatedPixelId] = useState(null);
  const [realPixelCode, setRealPixelCode] = useState(null);
  const [error, setError] = useState(null);
  const [urlTouched, setUrlTouched] = useState(false);

  const reset = () => {
    setStep(1);
    setName("");
    setUrl("");
    setCreating(false);
    setCreatedPixelId(null);
    setRealPixelCode(null);
    setError(null);
    setUrlTouched(false);
  };

  const handleOpenChange = (val) => {
    if (creating && !val) {
      onOpenChange(val);
      return;
    }
    if (!val) reset();
    onOpenChange(val);
  };

  const handleCreate = async () => {
    setUrlTouched(true);
    if (!isValidUrl(url.trim())) return;
    setCreating(true);
    setError(null);

    const pendingId = `pending-${Date.now()}`;
    const pendingPixel = {
      id: pendingId,
      name: name.trim(),
      domain: url.trim(),
      status: "creating",
      last_event_at: null,
    };
    onPixelCreating(pendingPixel);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetch(`${PIXEL_CREATOR_URL}/api/create-pixel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": PIXEL_CREATOR_API_KEY,
        },
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Pixel creation failed");
      }

      // Persist to Firestore
      const saved = await base44.entities.Domain.create({
        name: name.trim(),
        domain: url.trim(),
        snippet_code: data.pixel_code,
        pixel_provider: "intentcore",
        status: "active",
        event_count: 0,
      });

      setCreating(false);
      setCreatedPixelId(saved.id);
      setRealPixelCode(data.pixel_code);
      setStep(2);

      // Notify parent to replace pending pixel with the saved Firestore doc
      onPixelCreated(pendingId, saved);
    } catch (err) {
      setCreating(false);
      const msg = err.name === "AbortError"
        ? "Request timed out — please try again"
        : (err.message || "Network error — please try again");
      setError(msg);
      // Remove the pending pixel from the table on failure
      onPixelCreated(pendingId, null);
    }
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
                  {error && (
                    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                      <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  )}
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
                    {urlTouched && url.trim() && !isValidUrl(url.trim()) && (
                      <div className="mt-1.5">
                        <p className="text-sm text-red-500">Invalid URL</p>
                        {suggestUrl(url.trim()) && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Did you mean{" "}
                            <button
                              type="button"
                              onClick={() => setUrl(suggestUrl(url.trim()))}
                              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 underline"
                            >
                              {suggestUrl(url.trim())}
                            </button>
                            ?
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleCreate}
                      disabled={!name.trim() || !url.trim()}
                      className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 gap-1.5"
                    >
                      {error ? "Retry" : "Create"}
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && createdPixelId && (
                <InstallContent
                  pixelId={createdPixelId}
                  realPixelCode={realPixelCode}
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
            realPixelCode={pixel.snippet_code || null}
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
  }, []);

  const handlePixelCreated = useCallback((pendingId, result) => {
    // Remove the pending pixel — Firestore refetch will show the real one
    setPendingPixels(prev => prev.filter(p => p.id !== pendingId));
    if (result) {
      queryClient.invalidateQueries({ queryKey: ["domains"] });
    }
  }, [queryClient]);

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
        onPixelCreated={handlePixelCreated}
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
