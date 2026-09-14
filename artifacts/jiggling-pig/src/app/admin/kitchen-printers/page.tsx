"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, Loader2, Plus, Printer, RefreshCw, Send, Wifi, WifiOff } from "lucide-react";
import { apiAuthFetch, apiAuthGet, apiAuthPatch, apiAuthPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Job = {
  id: string; orderId: string | null; originalJobId: string | null; ticketKind: string;
  status: string; attemptCount: number; createdAt: string; fetchedAt: string | null;
  acknowledgedAt: string | null; printedAt: string | null; lastError: string | null;
};

type PrinterInfo = {
  id: string; name: string; isActive: boolean; status: string; lastSeenAt: string | null;
  online: boolean; printerMac: string | null; printerModel: string | null; firmwareVersion: string | null;
  lastError: string | null; jobCount: number; latestJob: Job | null;
};

export default function KitchenPrintersPage() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [creating, setCreating] = useState(false);
  const [credential, setCredential] = useState<{ id: string; name: string; token: string } | null>(null);
  const [openJobs, setOpenJobs] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const result = await apiAuthGet<{ data: PrinterInfo[] }>("/cloudprnt/printers");
      setPrinters(result.data ?? []);
      const settings = await apiAuthGet<{ data: { canonicalUrl: string | null } }>("/cloudprnt/settings");
      setCanonicalUrl(settings.data?.canonicalUrl ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load kitchen printers.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const createPrinter = async (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await apiAuthPost<{ data: { id: string; name: string; token: string } }>("/cloudprnt/printers", { name: newName.trim() });
      setCredential(result.data);
      setNewName("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create printer.");
    } finally {
      setCreating(false);
    }
  };

  const saveCanonicalUrl = async (event: FormEvent) => {
    event.preventDefault();
    setSavingUrl(true);
    setError(null);
    try {
      const result = await apiAuthFetch<{ data: { canonicalUrl: string } }>("/cloudprnt/settings", {
        method: "PUT", body: { canonicalUrl },
      });
      setCanonicalUrl(result.data.canonicalUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the canonical URL.");
    } finally {
      setSavingUrl(false);
    }
  };

  const action = async (key: string, callback: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await callback();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Printer action failed.");
    } finally {
      setBusy(null);
    }
  };

  const showJobs = async (printerId: string) => {
    setOpenJobs(openJobs === printerId ? null : printerId);
    if (openJobs === printerId) return;
    try {
      const result = await apiAuthGet<{ data: Job[] }>(`/cloudprnt/printers/${printerId}/jobs`);
      setJobs(result.data ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load ticket history.");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-foreground">Kitchen Printers</h1>
          <p className="text-muted-foreground mt-2 text-lg">Star CloudPRNT printers POST polls, GET ticket data, then DELETE to confirm completion. A missing confirmation is never automatically reprinted.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold text-lg">Verified public HTTPS URL</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the canonical production website URL supplied by deployment. The printer CloudPRNT URL is this origin plus <span className="font-mono">/api/v1/cloudprnt</span>; preview and LAN addresses are rejected.</p>
          <form onSubmit={saveCanonicalUrl} className="mt-4 flex gap-3">
            <Input type="url" required value={canonicalUrl} onChange={(event) => setCanonicalUrl(event.target.value)} placeholder="https://your-production-domain.example" aria-label="Verified public HTTPS URL" />
            <Button type="submit" disabled={savingUrl}>{savingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save URL"}</Button>
          </form>
        </CardContent>
      </Card>

      {credential && (
        <Card className="border-primary">
          <CardContent className="p-6 space-y-3">
            <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-bold">Save this printer credential now</h2><p className="text-sm text-muted-foreground">It is shown once and is not stored in the browser. Configure HTTP Basic authentication with this printer ID as username and the secret as password.</p></div></div>
            <div className="rounded bg-muted p-3 font-mono text-xs break-all">CloudPRNT URL: {canonicalUrl ? `${canonicalUrl.replace(/\/$/, "")}/api/v1/cloudprnt` : "Save the production URL above first"}<br />Username (printer ID): {credential.id}<br />Password (secret): {credential.token}</div>
            <div className="flex gap-2"><Button onClick={() => navigator.clipboard.writeText(`CloudPRNT URL: ${canonicalUrl ? `${canonicalUrl.replace(/\/$/, "")}/api/v1/cloudprnt` : ""}\nUsername: ${credential.id}\nPassword: ${credential.token}`)}><Clipboard className="w-4 h-4 mr-2" />Copy configuration</Button><Button variant="outline" onClick={() => setCredential(null)}>I saved it</Button></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold text-lg mb-4">Add CloudPRNT printer</h2>
          <form onSubmit={createPrinter} className="flex gap-3">
            <Input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={100} placeholder="e.g. Kitchen pass printer" aria-label="Printer name" />
            <Button type="submit" disabled={creating}>{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" />Add</>}</Button>
          </form>
        </CardContent>
      </Card>

      {loading ? <div className="py-16 text-center text-muted-foreground">Loading printers…</div> : printers.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center text-muted-foreground"><Printer className="w-10 h-10 mx-auto mb-3 opacity-40" />No CloudPRNT printers configured.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {printers.map((printer) => (
            <Card key={printer.id}>
              <CardContent className="p-6 space-y-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-xl">{printer.name}</h2><Badge variant={printer.isActive ? "default" : "secondary"}>{printer.isActive ? "ACTIVE" : "PAUSED"}</Badge><Badge variant="outline" className={printer.online ? "border-green-600 text-green-700" : ""}>{printer.online ? <Wifi className="mr-1 w-3 h-3" /> : <WifiOff className="mr-1 w-3 h-3" />}{printer.online ? "ONLINE" : "OFFLINE"}</Badge></div>
                    <p className="mt-2 text-sm text-muted-foreground">{printer.printerModel ?? "Waiting for first printer poll"}{printer.firmwareVersion ? ` · firmware ${printer.firmwareVersion}` : ""}{printer.lastSeenAt ? ` · last seen ${new Date(printer.lastSeenAt).toLocaleString()}` : ""}</p>
                    {printer.lastError && <p className="mt-2 text-sm text-destructive">{printer.lastError}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={busy === `test-${printer.id}`} onClick={() => void action(`test-${printer.id}`, () => apiAuthPost(`/cloudprnt/printers/${printer.id}/test-ticket`, {}))}><Send className="w-4 h-4 mr-1" />Test ticket</Button>
                    <Button variant="outline" size="sm" disabled={busy === `toggle-${printer.id}`} onClick={() => void action(`toggle-${printer.id}`, () => apiAuthPatch(`/cloudprnt/printers/${printer.id}`, { isActive: !printer.isActive }))}>{printer.isActive ? "Pause" : "Activate"}</Button>
                    <Button variant="outline" size="sm" onClick={() => void showJobs(printer.id)}>Ticket history</Button>
                  </div>
                </div>
                {openJobs === printer.id && <TicketHistory jobs={jobs} busy={busy} onReprint={(job) => void action(`reprint-${job.id}`, () => apiAuthPost(`/cloudprnt/printers/${printer.id}/jobs/${job.id}/reprint`, {}))} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketHistory({ jobs, busy, onReprint }: { jobs: Job[]; busy: string | null; onReprint: (job: Job) => void }) {
  if (!jobs.length) return <p className="border-t pt-4 text-sm text-muted-foreground">No tickets sent to this printer yet.</p>;
  return <div className="border-t pt-4 space-y-2">{jobs.map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm"><div><strong>{job.ticketKind === "test" ? "Test ticket" : job.orderId ? `Order ${job.orderId.slice(0, 8)}` : "Kitchen ticket"}</strong><span className="ml-2 text-muted-foreground">{new Date(job.createdAt).toLocaleString()} · {job.status}</span>{job.lastError && <p className="mt-1 text-destructive">{job.lastError}</p>}</div><Button variant="outline" size="sm" disabled={busy === `reprint-${job.id}`} onClick={() => onReprint(job)}>{busy === `reprint-${job.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" />Reprint</>}</Button></div>)}</div>;
}