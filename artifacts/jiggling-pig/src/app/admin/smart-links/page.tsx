"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive, BarChart3, Copy, Download, ExternalLink, FileText, Link2,
  Loader2, Plus, QrCode, RefreshCw, RotateCcw, SquarePen, X,
} from "lucide-react";
import { apiAuthFetch, apiAuthGet, apiAuthPatch, apiAuthPost } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SmartLink = {
  id: string;
  title: string;
  slug: string;
  targetUrl: string;
  fallbackUrl: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  goUrl: string;
  visitCount: number;
};

type Metrics = {
  totalVisits: number;
  days: number;
  daily: Array<{ date: string; visits: number }>;
};

type AuditEntry = { id: string; action: string; createdAt: string; beforeJson: string | null; afterJson: string | null };
type SmartLinkConfig = { canonicalOrigin: string; allowedOrigins: string[] };
type DownloadKind = "qr.png" | "qr.svg" | "sign.pdf";
type Preview = { title: string; kind: DownloadKind; url: string };

export default function SmartLinksPage() {
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [history, setHistory] = useState<Record<string, AuditEntry[]>>({});
  const [config, setConfig] = useState<SmartLinkConfig>({ canonicalOrigin: "", allowedOrigins: [] });
  const [allowedOriginsText, setAllowedOriginsText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const load = async () => {
    setError(null);
    try {
      const [linksResponse, configResponse] = await Promise.all([
        apiAuthGet<{ data: SmartLink[] }>("/admin/smart-links"),
        apiAuthGet<{ data: SmartLinkConfig }>("/admin/smart-links/config"),
      ]);
      setLinks(linksResponse.data ?? []);
      setConfig(configResponse.data);
      setAllowedOriginsText((configResponse.data?.allowedOrigins ?? []).join("\n"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load smart links.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const filteredLinks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return links.filter((link) => {
      const statusMatches = statusFilter === "all"
        || (statusFilter === "active" && !link.isArchived)
        || (statusFilter === "archived" && link.isArchived);
      return statusMatches && (!normalized
        || `${link.title} ${link.slug} ${link.targetUrl}`.toLowerCase().includes(normalized));
    });
  }, [links, query, statusFilter]);
  const totalVisits = links.reduce((total, link) => total + link.visitCount, 0);
  const activeCount = links.filter((link) => !link.isArchived).length;

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Smart link action failed.");
    } finally {
      setBusy(null);
    }
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    void withBusy("create", async () => {
      await apiAuthPost("/admin/smart-links", {
        title, slug: slug.trim().toLowerCase(), targetUrl, fallbackUrl: fallbackUrl || null,
      });
      setTitle(""); setSlug(""); setTargetUrl(""); setFallbackUrl("");
      await load();
    });
  };

  const copy = async (value: string) => {
    if (!navigator.clipboard) throw new Error("Clipboard access is unavailable. Copy the displayed URL manually.");
    await navigator.clipboard.writeText(value);
  };

  const fetchArtifact = async (link: SmartLink, kind: DownloadKind) => {
    const token = localStorage.getItem("jpig_access_token");
    const response = await fetch(`/api/v1/admin/smart-links/${link.id}/${kind}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`Could not retrieve ${kind}.`);
    return response.blob();
  };

  const download = async (link: SmartLink, kind: DownloadKind) => {
    const blob = await fetchArtifact(link, kind);
    const objectUrl = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = objectUrl;
    element.download = `${link.slug}-${kind.replace(".", "-")}`;
    element.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  };

  const previewArtifact = async (link: SmartLink, kind: DownloadKind) => {
    const blob = await fetchArtifact(link, kind);
    const objectUrl = URL.createObjectURL(blob);
    setPreview({ title: link.title, kind, url: objectUrl });
  };

  const loadMetrics = async (link: SmartLink) => {
    const response = await apiAuthGet<{ data: Metrics }>(`/admin/smart-links/${link.id}/metrics?days=30`);
    setMetrics((current) => ({ ...current, [link.id]: response.data }));
  };

  const loadHistory = async (link: SmartLink) => {
    const response = await apiAuthGet<{ data: AuditEntry[] }>(`/admin/smart-links/${link.id}/history`);
    setHistory((current) => ({ ...current, [link.id]: response.data ?? [] }));
  };
  const saveConfig = (event: FormEvent) => {
    event.preventDefault();
    void withBusy("config", async () => {
      const allowedOrigins = allowedOriginsText.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean);
      const response = await apiAuthFetch<{ data: SmartLinkConfig }>("/admin/smart-links/config", {
        method: "PUT", body: { canonicalOrigin: config.canonicalOrigin, allowedOrigins },
      });
      setConfig(response.data);
      setAllowedOriginsText(response.data.allowedOrigins.join("\n"));
      await load();
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight">Smart Links</h1>
          <p className="mt-2 text-lg text-muted-foreground">Permanent short links for QR codes. Slugs are never changed or reused; links can be set inactive and later reactivated.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">All links</p><p className="text-2xl font-bold">{links.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active links</p><p className="text-2xl font-bold">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Recorded visits</p><p className="text-2xl font-bold">{totalVisits}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-bold">Canonical Smart Links origin</h2>
          <p className="mt-1 text-sm text-muted-foreground">This is the stable public origin encoded in new QR codes. It starts with the verified deployment URL and can be changed to your custom HTTPS domain before printing more codes.</p>
          <form onSubmit={saveConfig} className="mt-4 grid gap-3">
            <Input required type="url" value={config.canonicalOrigin} onChange={(event) => setConfig((current) => ({ ...current, canonicalOrigin: event.target.value }))} placeholder="https://your-stable-domain.example" aria-label="Canonical Smart Links origin" />
            <textarea value={allowedOriginsText} onChange={(event) => setAllowedOriginsText(event.target.value)} rows={3} className="rounded-md border bg-background px-3 py-2 text-sm" placeholder={"Optional exact HTTPS destination origins, one per line\nhttps://another-approved-domain.example"} aria-label="Allowed external destination origins" />
            <p className="text-xs text-muted-foreground">Only exact public HTTPS origins listed here may be used as destinations. Paths, credentials, local addresses, and Smart Link redirect chains are rejected.</p>
            <div><Button type="submit" disabled={busy === "config"}>{busy === "config" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save canonical origin"}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-bold">New smart link</h2>
          <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-2">
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Campaign name" aria-label="Campaign name" />
            <Input required value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} placeholder="spring-festival" aria-label="Permanent slug" />
            <Input required type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://your-approved-domain.example/order" aria-label="Active destination URL" />
            <Input type="url" value={fallbackUrl} onChange={(e) => setFallbackUrl(e.target.value)} placeholder="Optional approved fallback after archive" aria-label="Archive fallback URL" />
            <p className="text-xs text-muted-foreground md:col-span-2">Destinations must be the configured site origin or an explicitly allowlisted HTTPS origin. Smart Link-to-Smart Link redirects are blocked.</p>
            <div className="md:col-span-2"><Button type="submit" disabled={busy === "create"}>{busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" />Create permanent link</>}</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, slug, or destination" aria-label="Search smart links" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filter smart links by status" className="h-9 rounded-md border bg-background px-3 text-sm sm:w-48">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Inactive</option>
        </select>
      </div>

      {loading ? <div className="py-16 text-center text-muted-foreground">Loading smart links…</div> : filteredLinks.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center text-muted-foreground"><Link2 className="mx-auto mb-3 h-10 w-10 opacity-40" />{links.length ? "No links match this search or filter." : "No smart links have been created."}</CardContent></Card>
      ) : <div className="space-y-4">
        {filteredLinks.map((link) => <SmartLinkCard key={link.id} link={link} busy={busy} metrics={metrics[link.id]} visits={history[link.id]}
          onAction={(key, callback) => void withBusy(key, callback)}
          onCopy={copy} onDownload={download} onPreview={previewArtifact} onMetrics={loadMetrics} onHistory={loadHistory} onReload={load} />)}
      </div>}

      {preview && <ArtifactPreview preview={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function SmartLinkCard({ link, busy, metrics, visits, onAction, onCopy, onDownload, onPreview, onMetrics, onHistory, onReload }: {
  link: SmartLink; busy: string | null; metrics?: Metrics; visits?: AuditEntry[];
  onAction: (key: string, callback: () => Promise<void>) => void;
  onCopy: (url: string) => Promise<void>; onDownload: (link: SmartLink, kind: DownloadKind) => Promise<void>;
  onPreview: (link: SmartLink, kind: DownloadKind) => Promise<void>; onMetrics: (link: SmartLink) => Promise<void>;
  onHistory: (link: SmartLink) => Promise<void>; onReload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(link.title);
  const [editTargetUrl, setEditTargetUrl] = useState(link.targetUrl);
  const [editFallbackUrl, setEditFallbackUrl] = useState(link.fallbackUrl ?? "");
  const action = (key: string, callback: () => Promise<void>) => onAction(`${key}-${link.id}`, callback);
  const saveEdit = (event: FormEvent) => {
    event.preventDefault();
    action("edit", async () => {
      await apiAuthPatch(`/admin/smart-links/${link.id}`, {
        title: editTitle, targetUrl: editTargetUrl, fallbackUrl: editFallbackUrl || null,
      });
      setEditing(false);
      await onReload();
    });
  };
  const cancelEdit = () => {
    setEditTitle(link.title); setEditTargetUrl(link.targetUrl); setEditFallbackUrl(link.fallbackUrl ?? ""); setEditing(false);
  };

  return <Card className={link.isArchived ? "opacity-70" : ""}><CardContent className="space-y-5 p-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">{link.title}</h2><Badge variant={link.isArchived ? "secondary" : "default"}>{link.isArchived ? "INACTIVE" : "ACTIVE"}</Badge></div>
        <p className="mt-2 break-all font-mono text-sm">{link.goUrl}</p>
        <p className="mt-1 break-all text-sm text-muted-foreground">{link.isArchived ? `Fallback: ${link.fallbackUrl ?? "Configured site home"}` : `Destination: ${link.targetUrl}`}</p>
      </div>
      <div className="text-sm text-muted-foreground">{link.visitCount} recorded visits</div>
    </div>
    {!link.isArchived && editing && <form onSubmit={saveEdit} className="grid gap-3 rounded-md border bg-muted/30 p-4 md:grid-cols-2">
      <Input required value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={120} aria-label="Link title" />
      <Input value={link.slug} disabled aria-label="Permanent slug" title="Slugs are permanent and cannot be changed" />
      <Input required type="url" value={editTargetUrl} onChange={(event) => setEditTargetUrl(event.target.value)} aria-label="Destination URL" />
      <Input type="url" value={editFallbackUrl} onChange={(event) => setEditFallbackUrl(event.target.value)} placeholder="Optional archive fallback" aria-label="Fallback URL" />
       <p className="text-xs text-muted-foreground md:col-span-2">The slug is immutable. Inactive links can be reactivated, then edited.</p>
      <div className="flex gap-2 md:col-span-2"><Button type="submit" size="sm" disabled={Boolean(busy)}>Save changes</Button><Button type="button" variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button></div>
    </form>}
    <div className="flex flex-wrap gap-2 border-t pt-4">
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("copy", () => onCopy(link.goUrl))}><Copy className="mr-1 h-4 w-4" />Copy URL</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("test", async () => { const opened = window.open(`${link.goUrl}?test=1`, "_blank", "noopener,noreferrer"); if (!opened) throw new Error("The browser blocked the test window. Allow popups to test this link."); })}><ExternalLink className="mr-1 h-4 w-4" />Test link</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("preview-png", () => onPreview(link, "qr.png"))}><QrCode className="mr-1 h-4 w-4" />Preview QR</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("png", () => onDownload(link, "qr.png"))}><Download className="mr-1 h-4 w-4" />QR PNG</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("preview-svg", () => onPreview(link, "qr.svg"))}><QrCode className="mr-1 h-4 w-4" />Preview SVG</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("svg", () => onDownload(link, "qr.svg"))}><Download className="mr-1 h-4 w-4" />QR SVG</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("preview-pdf", () => onPreview(link, "sign.pdf"))}><FileText className="mr-1 h-4 w-4" />Preview 5×7 PDF</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("pdf", () => onDownload(link, "sign.pdf"))}><Download className="mr-1 h-4 w-4" />Download PDF</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("metrics", () => onMetrics(link))}><BarChart3 className="mr-1 h-4 w-4" />30-day stats</Button>
      <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("history", () => onHistory(link))}>Change history</Button>
      {!link.isArchived && <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => setEditing(!editing)}><SquarePen className="mr-1 h-4 w-4" />{editing ? "Close edit" : "Edit"}</Button>}
      {!link.isArchived && <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("duplicate", async () => { await apiAuthPost(`/admin/smart-links/${link.id}/duplicate`, {}); await onReload(); })}><Copy className="mr-1 h-4 w-4" />Duplicate</Button>}
      {!link.isArchived && <Button variant="destructive" size="sm" disabled={Boolean(busy)} onClick={() => action("deactivate", async () => { if (!window.confirm("Set this link inactive? It will use its fallback until reactivated.")) return; await apiAuthPost(`/admin/smart-links/${link.id}/deactivate`, {}); await onReload(); })}><Archive className="mr-1 h-4 w-4" />Set inactive</Button>}
      {link.isArchived && <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => action("reactivate", async () => { await apiAuthPost(`/admin/smart-links/${link.id}/reactivate`, {}); await onReload(); })}><RotateCcw className="mr-1 h-4 w-4" />Reactivate</Button>}
    </div>
    {metrics && <div className="rounded-md bg-muted p-3 text-sm"><strong>{metrics.totalVisits} visits in the last {metrics.days} days.</strong>{metrics.daily.length ? <span className="ml-2 text-muted-foreground">Latest: {metrics.daily.at(-1)?.date} ({metrics.daily.at(-1)?.visits})</span> : <span className="ml-2 text-muted-foreground">No visits recorded.</span>}</div>}
    {visits && <div className="space-y-2 rounded-md border p-3 text-sm"><strong>Change history (up to 100)</strong>{visits.length ? visits.map((entry) => <div key={entry.id} className="flex flex-wrap justify-between gap-2 border-t pt-2 text-muted-foreground"><span>{new Date(entry.createdAt).toLocaleString()}</span><span>{entry.action.replaceAll("_", " ")}</span></div>) : <p className="text-muted-foreground">No changes recorded.</p>}</div>}
  </CardContent></Card>;
}

function ArtifactPreview({ preview, onClose }: { preview: Preview; onClose: () => void }) {
  const isPdf = preview.kind === "sign.pdf";
  return <div role="dialog" aria-modal="true" aria-label={`${preview.title} ${preview.kind} preview`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <Card className="max-h-full w-full max-w-3xl overflow-auto">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">{preview.title}</h2><p className="text-sm text-muted-foreground">{isPdf ? "5 × 7 inch sign preview" : "QR code preview"}</p></div><Button variant="outline" size="icon" onClick={onClose} aria-label="Close preview"><X className="h-4 w-4" /></Button></div>
        {isPdf ? <iframe title="5 by 7 smart link sign preview" src={preview.url} className="h-[70vh] w-full border" /> : <img src={preview.url} alt={`QR code for ${preview.title}`} className="mx-auto max-h-[70vh] max-w-full" />}
      </CardContent>
    </Card>
  </div>;
}