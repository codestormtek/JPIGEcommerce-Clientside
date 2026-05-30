import React, { useState, useEffect, useCallback } from "react";
import { Alert, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Row, Col, Button, Icon,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost } from "@/utils/apiClient";

const STRIPE_WEBHOOK_PATH = "/api/v1/payments/webhook";

const StatusBadge = ({ ok, label }) => (
  <span
    className={`badge badge-sm ${ok ? "bg-success" : "bg-secondary"} text-white`}
    style={{ fontSize: "0.72rem" }}
  >
    {ok ? "Connected" : label || "Not Configured"}
  </span>
);

const AdminPaymentGateway = () => {
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);

  const [activeGateway, setActiveGateway] = useState("stripe");
  const [saving, setSaving]               = useState(false);
  const [saveNote, setSaveNote]           = useState(null);

  const [squareForm, setSquareForm] = useState({
    appId: "",
    locationId: "",
    accessToken: "",
  });
  const [squareSaving, setSquareSaving] = useState(false);
  const [squareError, setSquareError]   = useState(null);
  const [squareSuccess, setSquareSuccess] = useState(null);

  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [webhookCopied, setWebhookCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/admin/payment-gateway/status");
      const data = res?.data;
      setStatus(data);
      setActiveGateway(data?.activeGateway ?? "stripe");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const saveGatewayChoice = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setSaveNote(null);
    try {
      const res = await apiPost("/admin/payment-gateway", { activeGateway });
      setSuccess(`Active gateway updated to ${activeGateway === "square" ? "Square" : "Stripe"}.`);
      if (res?.note) setSaveNote(res.note);
      setStatus(res?.data ?? status);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSquareCreds = async () => {
    setSquareSaving(true);
    setSquareError(null);
    setSquareSuccess(null);
    setSaveNote(null);
    try {
      const res = await apiPost("/admin/payment-gateway", {
        square: {
          appId:       squareForm.appId       || undefined,
          locationId:  squareForm.locationId  || undefined,
          accessToken: squareForm.accessToken || undefined,
        },
      });
      setSquareSuccess("Square credentials saved for this session.");
      if (res?.note) setSaveNote(res.note);
      setStatus(res?.data ?? status);
      setSquareForm({ appId: "", locationId: "", accessToken: "" });
      setTimeout(() => setSquareSuccess(null), 5000);
    } catch (e) {
      setSquareError(e.message);
    } finally {
      setSquareSaving(false);
    }
  };

  const testSquare = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiPost("/admin/payment-gateway/test", {});
      setTestResult({ ok: res?.success, message: res?.message });
    } catch (e) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const copyWebhook = () => {
    const url = `${window.location.protocol}//${window.location.hostname}${STRIPE_WEBHOOK_PATH}`;
    navigator.clipboard.writeText(url).then(() => {
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <React.Fragment>
        <Head title="Payment Gateway" />
        <Content>
          <div className="text-center py-5"><Spinner /></div>
        </Content>
      </React.Fragment>
    );
  }

  const stripeOk  = status?.stripe?.configured;
  const squareOk  = status?.square?.configured;

  return (
    <React.Fragment>
      <Head title="Payment Gateway" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">Payment Gateway</BlockTitle>
              <p className="text-soft">
                Choose the active payment processor and manage credentials for each gateway.
              </p>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error   && <Alert color="danger"  className="mb-3" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>{success}</Alert>}
        {saveNote && (
          <Alert color="info" className="mb-3" toggle={() => setSaveNote(null)}>
            <Icon name="info" className="me-1" />
            {saveNote}
          </Alert>
        )}

        {/* ── Active Gateway Selector ──────────────────────────────────── */}
        <Block>
          <div className="card card-bordered mb-4">
            <div className="card-inner py-3" style={{ background: "#f8f9ff", borderBottom: "1px solid #dee2e6" }}>
              <h6 className="overline-title mb-0" style={{ color: "#364a63" }}>
                Active Payment Processor
              </h6>
              <p className="text-soft mb-0 fs-12px mt-1">
                Choose which gateway processes customer payments at checkout.
              </p>
            </div>
            <div className="card-inner">
              <Row className="g-3 align-items-center">
                <Col md="6">
                  <div className="d-flex gap-4">
                    <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="activeGateway"
                        value="stripe"
                        checked={activeGateway === "stripe"}
                        onChange={() => setActiveGateway("stripe")}
                        className="form-check-input mt-0"
                      />
                      <span className="fw-medium">Stripe</span>
                      {stripeOk && <StatusBadge ok />}
                    </label>
                    <label className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="activeGateway"
                        value="square"
                        checked={activeGateway === "square"}
                        onChange={() => setActiveGateway("square")}
                        className="form-check-input mt-0"
                      />
                      <span className="fw-medium">Square</span>
                      {squareOk && <StatusBadge ok />}
                    </label>
                  </div>
                </Col>
                <Col md="6" className="text-md-end">
                  <Button color="primary" size="sm" onClick={saveGatewayChoice} disabled={saving}>
                    {saving ? <><Spinner size="sm" className="me-1" />Saving…</> : <><Icon name="save" className="me-1" />Save Gateway Choice</>}
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
        </Block>

        {/* ── Stripe Status Card ───────────────────────────────────────── */}
        <Block>
          <div className="card card-bordered mb-4">
            <div className="card-inner">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded"
                    style={{ width: 48, height: 48, background: "#635bff1a", flexShrink: 0 }}
                  >
                    <Icon name="cc-alt2-fill" style={{ fontSize: "1.5rem", color: "#635bff" }} />
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h6 className="mb-0">Stripe</h6>
                      <StatusBadge ok={stripeOk} label="Not Configured" />
                      {activeGateway === "stripe" && (
                        <span className="badge bg-primary badge-sm" style={{ fontSize: "0.68rem" }}>Active</span>
                      )}
                    </div>
                    <span className="text-soft small">Configured via environment variables</span>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="text-soft small d-none d-md-inline">Webhook:</span>
                  <code className="small px-2 py-1 rounded" style={{ background: "var(--bs-light)", fontSize: "0.72rem" }}>
                    {STRIPE_WEBHOOK_PATH}
                  </code>
                  <Button size="sm" color="light" outline onClick={copyWebhook}>
                    <Icon name={webhookCopied ? "check" : "copy"} />
                    <span className="ms-1">{webhookCopied ? "Copied!" : "Copy URL"}</span>
                  </Button>
                  <a
                    href="https://dashboard.stripe.com/webhooks"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-light btn-outline"
                  >
                    <Icon name="external-link" />
                    <span className="ms-1">Stripe Dashboard</span>
                  </a>
                </div>
              </div>
              <div className="mt-3 pt-3 border-top">
                <div className="d-flex flex-wrap gap-3">
                  <span className="text-soft small">
                    <Icon name={status?.stripe?.configured ? "check-circle" : "alert-circle"} className={`me-1 ${status?.stripe?.configured ? "text-success" : "text-warning"}`} />
                    Secret Key: {status?.stripe?.configured ? "Set" : "Not set"}
                  </span>
                  <span className="text-soft small">
                    <Icon name={status?.stripe?.webhookConfigured ? "check-circle" : "alert-circle"} className={`me-1 ${status?.stripe?.webhookConfigured ? "text-success" : "text-warning"}`} />
                    Webhook Secret: {status?.stripe?.webhookConfigured ? "Set" : "Not set"}
                  </span>
                </div>
                <p className="text-soft small mb-0 mt-2">
                  <Icon name="info" className="me-1" />
                  Stripe credentials are managed in your Replit Secrets panel (<code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>).
                </p>
              </div>
            </div>
          </div>
        </Block>

        {/* ── Square Status + Credentials Card ────────────────────────── */}
        <Block>
          <div className="card card-bordered mb-4">
            <div className="card-inner py-3" style={{ background: "#fff8f0", borderBottom: "1px solid #ffe0b2" }}>
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded"
                  style={{ width: 48, height: 48, background: "#3e206d1a", flexShrink: 0 }}
                >
                  <Icon name="grid-sq" style={{ fontSize: "1.5rem", color: "#3e206d" }} />
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h6 className="mb-0">Square</h6>
                    <StatusBadge ok={squareOk} label="Not Configured" />
                    {activeGateway === "square" && (
                      <span className="badge bg-primary badge-sm" style={{ fontSize: "0.68rem" }}>Active</span>
                    )}
                  </div>
                  <span className="text-soft small">Manage Square Application ID, Location ID, and Access Token</span>
                </div>
              </div>
            </div>

            <div className="card-inner">
              {/* Credential presence indicators */}
              <div className="d-flex flex-wrap gap-3 mb-4">
                <span className="text-soft small">
                  <Icon name={status?.square?.appIdSet ? "check-circle" : "alert-circle"} className={`me-1 ${status?.square?.appIdSet ? "text-success" : "text-muted"}`} />
                  Application ID: {status?.square?.appIdSet ? "Set" : "Not set"}
                </span>
                <span className="text-soft small">
                  <Icon name={status?.square?.locationIdSet ? "check-circle" : "alert-circle"} className={`me-1 ${status?.square?.locationIdSet ? "text-success" : "text-muted"}`} />
                  Location ID: {status?.square?.locationIdSet ? "Set" : "Not set"}
                </span>
                <span className="text-soft small">
                  <Icon name={status?.square?.accessTokenSet ? "check-circle" : "alert-circle"} className={`me-1 ${status?.square?.accessTokenSet ? "text-success" : "text-muted"}`} />
                  Access Token: {status?.square?.accessTokenSet ? "Set" : "Not set"}
                </span>
              </div>

              {squareError   && <Alert color="danger"  className="mb-3" toggle={() => setSquareError(null)}>{squareError}</Alert>}
              {squareSuccess && <Alert color="success" className="mb-3" toggle={() => setSquareSuccess(null)}>{squareSuccess}</Alert>}
              {testResult && (
                <Alert
                  color={testResult.ok ? "success" : "danger"}
                  className="mb-3"
                  toggle={() => setTestResult(null)}
                >
                  <Icon name={testResult.ok ? "check-circle" : "alert-circle"} className="me-1" />
                  {testResult.message}
                </Alert>
              )}

              <Row className="g-3">
                <Col md="12">
                  <label className="form-label">Application ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="sq0idp-…"
                    value={squareForm.appId}
                    onChange={(e) => setSquareForm((p) => ({ ...p, appId: e.target.value }))}
                    autoComplete="off"
                  />
                  <span className="form-note text-soft">Your Square Application ID from the Square Developer Dashboard.</span>
                </Col>
                <Col md="12">
                  <label className="form-label">Location ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="L…"
                    value={squareForm.locationId}
                    onChange={(e) => setSquareForm((p) => ({ ...p, locationId: e.target.value }))}
                    autoComplete="off"
                  />
                  <span className="form-note text-soft">The Square Location ID to process payments for.</span>
                </Col>
                <Col md="12">
                  <label className="form-label">Access Token</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="EAAAl… or sandbox token"
                    value={squareForm.accessToken}
                    onChange={(e) => setSquareForm((p) => ({ ...p, accessToken: e.target.value }))}
                    autoComplete="new-password"
                  />
                  <span className="form-note text-soft">Production or sandbox access token from your Square Developer account.</span>
                </Col>
              </Row>

              <div className="d-flex gap-2 mt-4 flex-wrap">
                <Button color="warning" onClick={saveSquareCreds} disabled={squareSaving}>
                  {squareSaving
                    ? <><Spinner size="sm" className="me-1" />Saving…</>
                    : <><Icon name="save" className="me-1" />Save Credentials</>}
                </Button>
                <Button color="light" outline onClick={testSquare} disabled={testing}>
                  {testing
                    ? <><Spinner size="sm" className="me-1" />Testing…</>
                    : <><Icon name="activity" className="me-1" />Test Connection</>}
                </Button>
                <a
                  href="https://developer.squareup.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-light btn-outline ms-auto"
                >
                  <Icon name="external-link" />
                  <span className="ms-1">Square Developer Dashboard</span>
                </a>
              </div>

              <div className="mt-4 pt-3 border-top">
                <p className="text-soft small mb-1">
                  <Icon name="info" className="me-1" />
                  Credentials saved here are active for the current server session only.
                  For persistence across restarts, add the following to your <strong>Replit Secrets</strong>:
                </p>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {["SQUARE_APP_ID", "SQUARE_LOCATION_ID", "SQUARE_ACCESS_TOKEN"].map((k) => (
                    <code key={k} className="small px-2 py-1 rounded" style={{ background: "var(--bs-light)", fontSize: "0.72rem" }}>{k}</code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Block>
      </Content>
    </React.Fragment>
  );
};

export default AdminPaymentGateway;
