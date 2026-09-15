import React, { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Spinner } from "reactstrap";
import { Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle, Button, Icon } from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPatch, apiPost, apiPut } from "@/utils/apiClient";

const dateTime = (value) => value ? new Date(value).toLocaleString() : "never";

const KitchenPrinters = () => {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [credential, setCredential] = useState(null);
  const [jobsFor, setJobsFor] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(null);
  const [savingUrl, setSavingUrl] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [printerResponse, settingsResponse] = await Promise.all([apiGet("/cloudprnt/printers"), apiGet("/cloudprnt/settings")]);
      setPrinters(printerResponse?.data || []);
      setCanonicalUrl(settingsResponse?.data?.canonicalUrl || "");
    } catch (cause) {
      setError(cause.message || "Could not load kitchen printers.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doAction = async (key, fn, shouldReload = true) => {
    setBusy(key); setError(null); setSuccess(null);
    try {
      await fn();
      if (shouldReload) await load();
    } catch (cause) {
      setError(cause.message || "Printer action failed.");
    } finally {
      setBusy(null);
    }
  };
  const saveCanonicalUrl = async (event) => {
    event.preventDefault();
    setSavingUrl(true); setError(null); setSuccess(null);
    try {
      const result = await apiPut("/cloudprnt/settings", { canonicalUrl });
      setCanonicalUrl(result?.data?.canonicalUrl || canonicalUrl);
      setSuccess("Verified public HTTPS URL saved.");
    } catch (cause) {
      setError(cause.message || "Could not save the canonical URL.");
    } finally { setSavingUrl(false); }
  };
  const createPrinter = (event) => {
    event.preventDefault();
    if (!newName.trim()) return;
    doAction("create", async () => {
      const response = await apiPost("/cloudprnt/printers", { name: newName.trim() });
      setCredential(response?.data || null);
      setNewName("");
    });
  };
  const showJobs = async (printerId) => {
    if (jobsFor === printerId) { setJobsFor(null); return; }
    setJobsFor(printerId); setError(null);
    try {
      const response = await apiGet(`/cloudprnt/printers/${printerId}/jobs`);
      setJobs(response?.data || []);
    } catch (cause) { setError(cause.message || "Could not load ticket history."); }
  };
  const reprint = (printer, job) => {
    const quarantined = job.status === "error" && !job.acknowledgedAt && job.lastError?.includes("CloudPRNT is quarantined");
    if (quarantined && !window.confirm("The printer did not confirm this ticket, so its outcome is unknown. Check the kitchen first. Continuing retires the current password and queues one labelled reprint. Clear any pending printer request and install the replacement password before polling resumes. Continue?")) return;
    doAction(`reprint-${job.id}`, async () => {
      const response = await apiPost(`/cloudprnt/printers/${printer.id}/jobs/${job.id}/reprint`, {});
      if (response?.data?.replacementCredential) setCredential({ ...response.data.replacementCredential, retiredPreviousCredential: true });
    });
  };
  const cloudUrl = canonicalUrl ? `${canonicalUrl.replace(/\/$/, "")}/api/v1/cloudprnt` : "";
  const copyCredential = async () => {
    try {
      await navigator.clipboard.writeText(`CloudPRNT URL: ${cloudUrl}\nUsername: ${credential.id}\nPassword: ${credential.token}`);
      setSuccess("Printer configuration copied.");
    } catch { setError("Clipboard access is unavailable. Copy the displayed configuration manually."); }
  };

  return (
    <>
      <Head title="Kitchen Printers" />
      <Content>
        <BlockHead size="sm"><BlockBetween><BlockHeadContent><BlockTitle page>Kitchen Printers</BlockTitle><BlockDes className="text-soft">Star CloudPRNT printers poll for tickets and must confirm completion. Missing confirmations are never automatically reprinted.</BlockDes></BlockHeadContent><BlockHeadContent><Button color="light" outline className="btn-white" onClick={load} disabled={loading}><Icon name="reload" /><span>Refresh</span></Button></BlockHeadContent></BlockBetween></BlockHead>
        {error && <Alert color="danger" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" toggle={() => setSuccess(null)}>{success}</Alert>}
        <Block>
          <div className="card card-bordered mb-4"><div className="card-inner">
            <h5>Verified public HTTPS URL</h5><p className="text-soft">Use the canonical production URL. The printer URL is this origin plus <code>/api/v1/cloudprnt</code>; preview and LAN addresses are rejected.</p>
            <form className="d-flex gap-2 flex-wrap" onSubmit={saveCanonicalUrl}><input className="form-control" style={{ flex: "1 1 250px", minWidth: 0 }} type="url" required value={canonicalUrl} placeholder="https://your-production-domain.example" onChange={(event) => setCanonicalUrl(event.target.value)} /><Button color="primary" type="submit" disabled={savingUrl}>{savingUrl ? <Spinner size="sm" /> : "Save URL"}</Button></form>
          </div></div>
          {credential && <div className="card card-bordered border-primary mb-4"><div className="card-inner">
            <div className="d-flex gap-2"><Icon name="alert-circle" className="text-primary mt-1 flex-shrink-0" /><div style={{ minWidth: 0 }}><h5>{credential.retiredPreviousCredential ? "Replace this printer credential before printing resumes" : "Save this printer credential now"}</h5><p className="text-soft mb-3">{credential.retiredPreviousCredential ? "The previous password was retired to prevent a delayed DELETE confirming another ticket. Clear or cancel any pending CloudPRNT request, configure this replacement password, then restart polling. Do not only change the password while the old request remains pending." : "This secret is shown once and is not stored in the browser. Configure HTTP Basic authentication with the printer ID as username and this secret as password."}</p></div></div>
            <pre className="bg-light rounded p-3 mb-3 small text-break" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>CloudPRNT URL: {cloudUrl || "Save the production URL above first"}{"\n"}Username (printer ID): {credential.id}{"\n"}Password (secret): {credential.token}</pre>
            <div className="d-flex gap-2 flex-wrap"><Button color="primary" size="sm" onClick={copyCredential}><Icon name="copy" /><span>Copy configuration</span></Button><Button color="light" outline size="sm" onClick={() => setCredential(null)}>I saved it</Button></div>
          </div></div>}
          <div className="card card-bordered mb-4"><div className="card-inner"><h5>Add CloudPRNT printer</h5><form className="d-flex gap-2 flex-wrap mt-3" onSubmit={createPrinter}><input className="form-control" style={{ flex: "1 1 200px", minWidth: 0 }} maxLength="100" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. Kitchen pass printer" /><Button type="submit" color="primary" disabled={busy === "create"}>{busy === "create" ? <Spinner size="sm" /> : <><Icon name="plus" /><span>Add</span></>}</Button></form></div></div>
          {loading ? <div className="text-center py-5"><Spinner color="primary" /></div> : printers.length === 0 ? <div className="card card-bordered"><div className="card-inner text-center text-soft py-5">No CloudPRNT printers configured.</div></div> : printers.map((printer) => (
            <div className="card card-bordered mb-3" key={printer.id}><div className="card-inner">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div style={{ minWidth: 0 }}><div className="d-flex align-items-center flex-wrap gap-2"><h5 className="mb-0 text-break">{printer.name}</h5><Badge color={printer.isActive ? "success" : "light"}>{printer.isActive ? "ACTIVE" : "PAUSED"}</Badge><Badge color={printer.online ? "success" : "secondary"}>{printer.online ? "ONLINE" : "OFFLINE"}</Badge></div><p className="text-soft mb-0 mt-2 text-break">{printer.printerModel || "Waiting for first printer poll"}{printer.firmwareVersion ? ` · firmware ${printer.firmwareVersion}` : ""}{printer.lastSeenAt ? ` · last seen ${dateTime(printer.lastSeenAt)}` : ""}</p>{printer.lastError && <p className="text-danger small mb-0 mt-2 text-break">{printer.lastError}</p>}</div>
                <div className="d-flex gap-2 flex-wrap"><Button size="sm" color="light" outline disabled={busy === `test-${printer.id}`} onClick={() => doAction(`test-${printer.id}`, () => apiPost(`/cloudprnt/printers/${printer.id}/test-ticket`, {}))}><Icon name="send" /><span>Test ticket</span></Button><Button size="sm" color="light" outline disabled={busy === `toggle-${printer.id}`} onClick={() => doAction(`toggle-${printer.id}`, () => apiPatch(`/cloudprnt/printers/${printer.id}`, { isActive: !printer.isActive }))}>{printer.isActive ? "Pause" : "Activate"}</Button><Button size="sm" color="light" outline onClick={() => showJobs(printer.id)}>Ticket history</Button></div>
              </div>
              {jobsFor === printer.id && <TicketHistory jobs={jobs} busy={busy} onReprint={(job) => reprint(printer, job)} />}
            </div></div>
          ))}
        </Block>
      </Content>
    </>
  );
};

const TicketHistory = ({ jobs, busy, onReprint }) => <div className="border-top mt-4 pt-3">{!jobs.length ? <p className="text-soft mb-0">No tickets sent to this printer yet.</p> : jobs.map((job) => {
  const quarantined = job.status === "error" && !job.acknowledgedAt && job.lastError?.includes("CloudPRNT is quarantined");
  return <div className="border rounded p-3 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-3" key={job.id}><div style={{ minWidth: 0 }}><strong>{job.ticketKind === "test" ? "Test ticket" : job.orderId ? `Order ${job.orderId.slice(0, 8)}` : "Kitchen ticket"}</strong><span className="text-soft ms-2 small d-inline-block">{dateTime(job.createdAt)} · {job.status}</span>{job.lastError && <p className="text-danger small mb-0 mt-1 text-break">{job.lastError}</p>}{quarantined && <p className="text-warning small fw-bold mb-0 mt-2">Check the kitchen before resolving. Resolving retires the password; clear the pending request and install the replacement credential before delivery resumes.</p>}</div><Button size="sm" color="light" outline disabled={busy === `reprint-${job.id}`} onClick={() => onReprint(job)}>{busy === `reprint-${job.id}` ? <Spinner size="sm" /> : quarantined ? "Resolve & reprint" : "Reprint"}</Button></div>;
})}</div>;

export default KitchenPrinters;