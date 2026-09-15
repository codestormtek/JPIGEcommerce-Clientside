import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import { Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle, Button, Icon, Row, Col } from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiDownload, apiGet, apiPatch, apiPost, apiPut } from "@/utils/apiClient";

const artifactName = (link, kind) => `${link.slug}-${kind.replace(".", "-")}`;

const SmartLinks = () => {
  const [links, setLinks] = useState([]);
  const [config, setConfig] = useState({ canonicalOrigin: "", allowedOrigins: [] });
  const [allowedOriginsText, setAllowedOriginsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState({ title: "", slug: "", targetUrl: "", fallbackUrl: "" });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", targetUrl: "", fallbackUrl: "" });
  const [metrics, setMetrics] = useState({});
  const [history, setHistory] = useState({});
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [linksResult, configResult] = await Promise.all([apiGet("/admin/smart-links"), apiGet("/admin/smart-links/config")]);
      setLinks(linksResult?.data || []);
      const savedConfig = configResult?.data || { canonicalOrigin: "", allowedOrigins: [] };
      setConfig(savedConfig);
      setAllowedOriginsText((savedConfig.allowedOrigins || []).join("\n"));
    } catch (cause) {
      setError(cause.message || "Could not load smart links.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const action = async (key, fn, message) => {
    setBusy(key); setError(null); setSuccess(null);
    try {
      await fn();
      if (message) setSuccess(message);
    } catch (cause) {
      setError(cause.message || "Smart link action failed.");
    } finally { setBusy(null); }
  };
  const create = (event) => {
    event.preventDefault();
    action("create", async () => {
      await apiPost("/admin/smart-links", { ...form, slug: form.slug.trim().toLowerCase(), fallbackUrl: form.fallbackUrl || null });
      setForm({ title: "", slug: "", targetUrl: "", fallbackUrl: "" });
      await load();
    }, "Permanent smart link created.");
  };
  const saveConfig = (event) => {
    event.preventDefault();
    action("config", async () => {
      const allowedOrigins = allowedOriginsText.split(/\r?\n|,/).map((origin) => origin.trim()).filter(Boolean);
      const response = await apiPut("/admin/smart-links/config", { canonicalOrigin: config.canonicalOrigin, allowedOrigins });
      const saved = response?.data || config;
      setConfig(saved); setAllowedOriginsText((saved.allowedOrigins || []).join("\n"));
    }, "Canonical Smart Links origin saved.");
  };
  const copy = async (url) => {
    if (!navigator.clipboard) throw new Error("Clipboard access is unavailable. Copy the displayed URL manually.");
    await navigator.clipboard.writeText(url);
  };
  const fetchArtifact = (link, kind) => apiDownload(`/admin/smart-links/${link.id}/${kind}`);
  const download = (link, kind) => action(`download-${kind}-${link.id}`, async () => {
    const blob = await fetchArtifact(link, kind);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = artifactName(link, kind); document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  const previewArtifact = (link, kind) => action(`preview-${kind}-${link.id}`, async () => {
    const blob = await fetchArtifact(link, kind);
    if (!blob) return;
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview({ title: link.title, kind, url: URL.createObjectURL(blob) });
  });
  const loadMetrics = (link) => action(`metrics-${link.id}`, async () => {
    const result = await apiGet(`/admin/smart-links/${link.id}/metrics?days=30`);
    setMetrics((current) => ({ ...current, [link.id]: result?.data || { totalVisits: 0, days: 30, daily: [] } }));
  });
  const loadHistory = (link) => action(`history-${link.id}`, async () => {
    const result = await apiGet(`/admin/smart-links/${link.id}/history`);
    setHistory((current) => ({ ...current, [link.id]: result?.data || [] }));
  });
  const startEdit = (link) => {
    setEditing(editing === link.id ? null : link.id);
    setEditForm({ title: link.title, targetUrl: link.targetUrl, fallbackUrl: link.fallbackUrl || "" });
  };
  const saveEdit = (event, link) => {
    event.preventDefault();
    action(`edit-${link.id}`, async () => {
      await apiPatch(`/admin/smart-links/${link.id}`, { ...editForm, fallbackUrl: editForm.fallbackUrl || null });
      setEditing(null); await load();
    }, "Smart link updated.");
  };
  const visibleLinks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return links.filter((link) => (status === "all" || (status === "active" ? !link.isArchived : link.isArchived))
      && (!needle || `${link.title} ${link.slug} ${link.targetUrl}`.toLowerCase().includes(needle)));
  }, [links, query, status]);
  const totalVisits = links.reduce((sum, link) => sum + Number(link.visitCount || 0), 0);

  return (
    <>
      <Head title="Smart Links" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent><BlockTitle page>Smart Links</BlockTitle><BlockDes className="text-soft">Permanent short links for QR and NFC. Slugs are never changed or reused; links can be made inactive and later reactivated.</BlockDes></BlockHeadContent>
            <BlockHeadContent><Button color="light" outline className="btn-white" onClick={load} disabled={loading}><Icon name="reload" /><span>Refresh</span></Button></BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        {error && <Alert color="danger" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" toggle={() => setSuccess(null)}>{success}</Alert>}
        <Block>
          <Row className="g-3 mb-4">
            <Col sm="4"><div className="card card-bordered"><div className="card-inner"><span className="text-soft small">All links</span><h3 className="mb-0">{links.length}</h3></div></div></Col>
            <Col sm="4"><div className="card card-bordered"><div className="card-inner"><span className="text-soft small">Active links</span><h3 className="mb-0">{links.filter((link) => !link.isArchived).length}</h3></div></div></Col>
            <Col sm="4"><div className="card card-bordered"><div className="card-inner"><span className="text-soft small">Recorded visits</span><h3 className="mb-0">{totalVisits}</h3></div></div></Col>
          </Row>
          <div className="card card-bordered mb-4"><div className="card-inner">
            <h5>Canonical Smart Links origin</h5><p className="text-soft">The stable public origin encoded in new QR codes. Set a custom HTTPS domain before printing more codes. Only exact public HTTPS origins listed below may be used as destinations.</p>
            <form onSubmit={saveConfig}><label className="form-label mb-1 small text-soft">Stable canonical domain</label><input className="form-control mb-3" required type="url" value={config.canonicalOrigin || ""} onChange={(event) => setConfig((current) => ({ ...current, canonicalOrigin: event.target.value }))} placeholder="https://your-stable-domain.example" aria-label="Canonical Smart Links origin" />
              <label className="form-label mb-1 small text-soft">Allowed external destination origins</label><textarea className="form-control mb-2" rows="3" value={allowedOriginsText} onChange={(event) => setAllowedOriginsText(event.target.value)} placeholder={"Optional exact HTTPS destination origins, one per line\nhttps://another-approved-domain.example"} aria-label="Allowed external destination origins" />
              <p className="form-note text-soft">Paths, credentials, local addresses, and Smart Link redirect chains are rejected.</p><Button color="primary" type="submit" disabled={busy === "config"}>{busy === "config" ? <Spinner size="sm" /> : "Save canonical origin"}</Button>
            </form>
          </div></div>
          <div className="card card-bordered mb-4"><div className="card-inner">
            <h5>New smart link</h5><form className="mt-3" onSubmit={create}><Row className="g-3">
              <Col md="6"><label className="form-label mb-1 small text-soft">Campaign name</label><input className="form-control" required maxLength="120" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Campaign name" aria-label="Campaign name" /></Col>
              <Col md="6"><label className="form-label mb-1 small text-soft">Permanent slug</label><input className="form-control" required maxLength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="spring-festival" aria-label="Permanent slug" /></Col>
              <Col md="6"><label className="form-label mb-1 small text-soft">Active destination URL</label><input className="form-control" required type="url" value={form.targetUrl} onChange={(event) => setForm((current) => ({ ...current, targetUrl: event.target.value }))} placeholder="https://your-approved-domain.example/order" aria-label="Active destination URL" /></Col>
              <Col md="6"><label className="form-label mb-1 small text-soft">Archive fallback URL (optional)</label><input className="form-control" type="url" value={form.fallbackUrl} onChange={(event) => setForm((current) => ({ ...current, fallbackUrl: event.target.value }))} placeholder="Optional approved fallback after archive" aria-label="Archive fallback URL" /></Col>
              <Col md="12"><p className="form-note text-soft mb-0">The slug is permanent. Destinations must be the configured site origin or explicitly allowlisted HTTPS origin.</p></Col>
              <Col md="12"><Button color="primary" type="submit" disabled={busy === "create"}>{busy === "create" ? <Spinner size="sm" /> : <><Icon name="plus" /><span>Create permanent link</span></>}</Button></Col>
            </Row></form>
          </div></div>
          <div className="d-flex gap-3 flex-wrap mb-4"><input className="form-control" style={{ flex: "1 1 200px", minWidth: 0 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, slug, or destination" aria-label="Search smart links" /><select className="form-select" style={{ width: 180 }} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter smart links by status"><option value="all">All statuses</option><option value="active">Active</option><option value="archived">Inactive</option></select></div>
          {loading ? <div className="text-center py-5"><Spinner color="primary" /></div> : visibleLinks.length === 0 ? <div className="card card-bordered"><div className="card-inner text-center text-soft py-5">{links.length ? "No links match this search or filter." : "No smart links have been created."}</div></div> : visibleLinks.map((link) => <LinkCard key={link.id} link={link} busy={busy} editing={editing === link.id} editForm={editForm} setEditForm={setEditForm} onStartEdit={startEdit} onSaveEdit={saveEdit} action={action} copy={copy} download={download} preview={previewArtifact} metrics={metrics[link.id]} history={history[link.id]} loadMetrics={loadMetrics} loadHistory={loadHistory} reload={load} />)}
        </Block>
      </Content>
      <Modal isOpen={Boolean(preview)} toggle={() => setPreview(null)} size="lg"><ModalHeader toggle={() => setPreview(null)}>{preview?.title} — {preview?.kind === "sign.pdf" ? "5 × 7 sign preview" : "QR code preview"}</ModalHeader><ModalBody>{preview?.kind === "sign.pdf" ? <iframe title="Smart Link sign preview" src={preview?.url} style={{ width: "100%", height: "70vh", border: 0 }} /> : <img src={preview?.url} alt={`QR code for ${preview?.title || ""}`} className="img-fluid d-block mx-auto" />}</ModalBody></Modal>
    </>
  );
};

const LinkCard = ({ link, busy, editing, editForm, setEditForm, onStartEdit, onSaveEdit, action, copy, download, preview, metrics, history, loadMetrics, loadHistory, reload }) => {
  const key = (name) => `${name}-${link.id}`;
  const disabled = Boolean(busy);
  const button = (name, label, callback, color = "light") => <Button size="sm" color={color} outline={color === "light"} disabled={disabled} onClick={() => action(key(name), callback)}>{label}</Button>;
  return <div className={`card card-bordered mb-4 ${link.isArchived ? "opacity-75" : ""}`} style={{ height: "auto", flexShrink: 0 }}><div className="card-inner">
    {!link.isArchived && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
      <Button color="primary" disabled={disabled} aria-expanded={editing} onClick={() => onStartEdit(link)}>
        <Icon name="edit" /><span>{editing ? "Close editor" : "Edit link"}</span>
      </Button>
    </div>}
    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap"><div style={{ minWidth: 0 }}><div className="d-flex align-items-center gap-2 flex-wrap"><h5 className="mb-0 text-break">{link.title}</h5><Badge color={link.isArchived ? "secondary" : "success"}>{link.isArchived ? "INACTIVE" : "ACTIVE"}</Badge></div><div className="text-break font-monospace mt-2 small">{link.goUrl}</div><p className="text-soft text-break mb-0 mt-1 small">{link.isArchived ? `Fallback: ${link.fallbackUrl || "Configured site home"}` : `Destination: ${link.targetUrl}`}</p></div><span className="text-soft small flex-shrink-0">{link.visitCount} recorded visits</span></div>
    {editing && !link.isArchived && <form className="border rounded bg-light p-3 mt-4" onSubmit={(event) => onSaveEdit(event, link)}><Row className="g-3"><Col md="6"><label className="form-label mb-1 small text-soft">Campaign Name</label><input className="form-control" required maxLength="120" value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} /></Col><Col md="6"><label className="form-label mb-1 small text-soft">Permanent Slug</label><input className="form-control" disabled value={link.slug} title="Slugs are permanent and cannot be changed" /></Col><Col md="6"><label className="form-label mb-1 small text-soft">Destination URL</label><input className="form-control" type="url" required value={editForm.targetUrl} onChange={(event) => setEditForm((current) => ({ ...current, targetUrl: event.target.value }))} /></Col><Col md="6"><label className="form-label mb-1 small text-soft">Archive Fallback</label><input className="form-control" type="url" value={editForm.fallbackUrl} placeholder="Optional archive fallback" onChange={(event) => setEditForm((current) => ({ ...current, fallbackUrl: event.target.value }))} /></Col><Col><p className="form-note text-soft">Slug is immutable. Set the link active before editing.</p><Button size="sm" color="primary" type="submit" disabled={disabled}>Save changes</Button><Button size="sm" color="light" outline className="ms-2" type="button" onClick={() => onStartEdit(link)}>Cancel</Button></Col></Row></form>}
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e9f2" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#8094ae", letterSpacing: "0.05em" }}>Open / Share</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {button("copy", "Copy URL / NFC URL", () => copy(link.goUrl))}
          {button("test", "Test link", async () => { const opened = window.open(`${link.goUrl}?test=1`, "_blank", "noopener,noreferrer"); if (!opened) throw new Error("The browser blocked the test window. Allow popups to test this link."); })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#8094ae", letterSpacing: "0.05em" }}>QR / Downloads</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {button("preview-png", "Preview QR", () => preview(link, "qr.png"))}{button("png", "QR PNG", () => download(link, "qr.png"))}
          {button("preview-svg", "Preview SVG", () => preview(link, "qr.svg"))}{button("svg", "QR SVG", () => download(link, "qr.svg"))}
          {button("preview-pdf", "Preview 5×7 PDF", () => preview(link, "sign.pdf"))}{button("pdf", "Download PDF", () => download(link, "sign.pdf"))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", color: "#8094ae", letterSpacing: "0.05em" }}>Activity / Manage</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {button("metrics", "30-day stats", () => loadMetrics(link))}{button("history", "Change history", () => loadHistory(link))}
          {!link.isArchived && button("duplicate", "Duplicate", async () => { await apiPost(`/admin/smart-links/${link.id}/duplicate`, {}); await reload(); })}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem", paddingTop: "1rem", borderTop: "1px dashed #e5e9f2" }}>
        {!link.isArchived && <Button size="sm" color="danger" outline disabled={disabled} onClick={() => action(key("deactivate"), async () => { if (!window.confirm("Set this link inactive? It will use its fallback until reactivated.")) return; await apiPost(`/admin/smart-links/${link.id}/deactivate`, {}); await reload(); })}>Set inactive</Button>}
        {link.isArchived && button("reactivate", "Reactivate", async () => { await apiPost(`/admin/smart-links/${link.id}/reactivate`, {}); await reload(); })}
      </div>
    </div>
    {metrics && <div className="bg-light rounded p-3 small mt-3"><strong>{metrics.totalVisits} visits in the last {metrics.days} days.</strong>{metrics.daily?.length ? <span className="text-soft ms-2">Latest: {metrics.daily[metrics.daily.length - 1]?.date} ({metrics.daily[metrics.daily.length - 1]?.visits})</span> : <span className="text-soft ms-2">No visits recorded.</span>}</div>}
    {history && <div className="border rounded p-3 small mt-3"><strong>Change history (up to 100)</strong>{history.length ? history.map((entry) => <div className="d-flex justify-content-between flex-wrap gap-2 border-top mt-2 pt-2 text-soft" key={entry.id}><span>{new Date(entry.createdAt).toLocaleString()}</span><span>{entry.action.replaceAll("_", " ")}</span></div>) : <p className="text-soft mb-0 mt-2">No changes recorded.</p>}</div>}
  </div></div>;
};

export default SmartLinks;