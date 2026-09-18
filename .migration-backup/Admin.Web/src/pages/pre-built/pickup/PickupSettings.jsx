import React, { useCallback, useEffect, useState } from "react";
import { Alert, Spinner } from "reactstrap";
import { Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle, Button, Icon, Row, Col } from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPut } from "@/utils/apiClient";

const PickupSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await apiGet("/pickup/admin/config");
      setSettings(response?.data ?? null);
    } catch (cause) {
      setError(cause.message || "Could not load pickup settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setSettings((current) => current ? { ...current, [key]: value } : current);

  const save = async (event) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiPut("/pickup/admin/config", {
        isOrderingOpen: settings.isOrderingOpen,
        eventName: settings.eventName,
        streetAddress: settings.streetAddress,
        pickupInstructions: settings.pickupInstructions || "",
        asapWaitMinutes: Number(settings.asapWaitMinutes),
        taxRatePercent: Number(settings.taxRatePercent),
        schedulingEnabled: Boolean(settings.schedulingEnabled),
        eventDate: settings.eventDate || "",
        opensAt: settings.opensAt || "",
        shutsDownAt: settings.shutsDownAt || "",
        timezone: settings.timezone || "America/New_York",
        slotIntervalMinutes: Number(settings.slotIntervalMinutes || 15),
        minimumPrepMinutes: Number(settings.minimumPrepMinutes || 15),
        reminderLeadMinutes: Number(settings.reminderLeadMinutes ?? 15),
      });
      setSettings(response?.data ?? settings);
      setSuccess("Pickup settings saved.");
    } catch (cause) {
      setError(cause.message || "Could not save pickup settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head title="Phone Pickup" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Phone Pickup</BlockTitle>
              <BlockDes className="text-soft">Configure the active event, menu, wait time, and tax used by <code>/pickup</code>.</BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="light" outline className="btn-white" onClick={load} disabled={saving || loading}>
                <Icon name="reload" /><span>Refresh</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        {error && <Alert color="danger" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" toggle={() => setSuccess(null)}>{success}</Alert>}
        <Block>
          {loading || !settings ? (
            <div className="text-center py-5"><Spinner color="primary" /></div>
          ) : (
            <form onSubmit={save}>
              <div className="card card-bordered mb-4">
                <div className="card-inner">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                    <div style={{ minWidth: 0 }}>
                      <h5 className="mb-1">Ordering status</h5>
                      <p className="text-soft mb-0">Closing immediately prevents new phone pickup checkouts.</p>
                    </div>
                    <div className="custom-control custom-switch flex-shrink-0">
                      <input id="pickup-open" type="checkbox" className="custom-control-input" checked={Boolean(settings.isOrderingOpen)} onChange={(event) => update("isOrderingOpen", event.target.checked)} />
                      <label className="custom-control-label fw-medium" htmlFor="pickup-open">Open for orders</label>
                    </div>
                  </div>
                  <Row className="g-3">
                    <Col md="6">
                      <label className="form-label" htmlFor="pickup-event">Event / location name</label>
                      <input id="pickup-event" className="form-control" required maxLength="120" value={settings.eventName || ""} onChange={(event) => update("eventName", event.target.value)} />
                    </Col>
                    <Col md="6">
                      <label className="form-label" htmlFor="pickup-wait">ASAP wait (minutes)</label>
                      <input id="pickup-wait" className="form-control" type="number" min="1" max="240" required value={settings.asapWaitMinutes} onChange={(event) => update("asapWaitMinutes", Number(event.target.value))} />
                    </Col>
                    <Col md="12">
                      <label className="form-label" htmlFor="pickup-address">Street address</label>
                      <input id="pickup-address" className="form-control" required maxLength="300" value={settings.streetAddress || ""} onChange={(event) => update("streetAddress", event.target.value)} />
                    </Col>
                    <Col md="12">
                      <label className="form-label" htmlFor="pickup-instructions">Pickup instructions (optional)</label>
                      <textarea
                        id="pickup-instructions"
                        className="form-control"
                        rows="4"
                        maxLength="1000"
                        placeholder="Where customers should collect orders"
                        value={settings.pickupInstructions || ""}
                        onChange={(event) => update("pickupInstructions", event.target.value)}
                      />
                    </Col>
                    <Col md="4">
                      <label className="form-label" htmlFor="pickup-tax">Sales tax rate (%)</label>
                      <input id="pickup-tax" className="form-control" type="number" min="0" max="25" step="0.001" required value={settings.taxRatePercent} onChange={(event) => update("taxRatePercent", Number(event.target.value))} />
                    </Col>
                    <Col md="12">
                      <div className="border rounded p-3 mt-2">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                          <div>
                            <h6 className="mb-1">Scheduled pickup times</h6>
                            <p className="text-soft mb-0">Customers choose a pickup slot. The final slot is always at least 30 minutes before shutdown.</p>
                          </div>
                          <div className="custom-control custom-switch flex-shrink-0">
                            <input id="pickup-scheduling" type="checkbox" className="custom-control-input" checked={Boolean(settings.schedulingEnabled)} onChange={(event) => update("schedulingEnabled", event.target.checked)} />
                            <label className="custom-control-label fw-medium" htmlFor="pickup-scheduling">Enable scheduling</label>
                          </div>
                        </div>
                        <Row className="g-3">
                          <Col md="4">
                            <label className="form-label" htmlFor="pickup-event-date">Event date</label>
                            <input id="pickup-event-date" className="form-control" type="date" required={Boolean(settings.schedulingEnabled)} disabled={!settings.schedulingEnabled} value={settings.eventDate || ""} onChange={(event) => update("eventDate", event.target.value)} />
                          </Col>
                          <Col md="4">
                            <label className="form-label" htmlFor="pickup-opens">Opens</label>
                            <input id="pickup-opens" className="form-control" type="time" required={Boolean(settings.schedulingEnabled)} disabled={!settings.schedulingEnabled} value={settings.opensAt || ""} onChange={(event) => update("opensAt", event.target.value)} />
                          </Col>
                          <Col md="4">
                            <label className="form-label" htmlFor="pickup-shutdown">Shutdown</label>
                            <input id="pickup-shutdown" className="form-control" type="time" required={Boolean(settings.schedulingEnabled)} disabled={!settings.schedulingEnabled} value={settings.shutsDownAt || ""} onChange={(event) => update("shutsDownAt", event.target.value)} />
                          </Col>
                          <Col md="6">
                            <label className="form-label" htmlFor="pickup-timezone">Event timezone</label>
                            <input id="pickup-timezone" className="form-control" required={Boolean(settings.schedulingEnabled)} disabled={!settings.schedulingEnabled} placeholder="America/New_York" value={settings.timezone || "America/New_York"} onChange={(event) => update("timezone", event.target.value)} />
                            <small className="text-soft">Use an IANA timezone such as America/New_York.</small>
                          </Col>
                          <Col md="2">
                            <label className="form-label" htmlFor="pickup-interval">Slot interval</label>
                            <input id="pickup-interval" className="form-control" type="number" min="5" max="60" required disabled={!settings.schedulingEnabled} value={settings.slotIntervalMinutes || 15} onChange={(event) => update("slotIntervalMinutes", Number(event.target.value))} />
                          </Col>
                          <Col md="2">
                            <label className="form-label" htmlFor="pickup-min-prep">Minimum prep</label>
                            <input id="pickup-min-prep" className="form-control" type="number" min="1" max="240" required disabled={!settings.schedulingEnabled} value={settings.minimumPrepMinutes || 15} onChange={(event) => update("minimumPrepMinutes", Number(event.target.value))} />
                          </Col>
                          <Col md="2">
                            <label className="form-label" htmlFor="pickup-reminder">Prep alert lead</label>
                            <input id="pickup-reminder" className="form-control" type="number" min="0" max="240" required disabled={!settings.schedulingEnabled} value={settings.reminderLeadMinutes ?? 15} onChange={(event) => update("reminderLeadMinutes", Number(event.target.value))} />
                          </Col>
                        </Row>
                        <small className="text-soft d-block mt-2">Times are in minutes. Orders receive a durable staff preparation alert before their selected pickup time.</small>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
              <div className="card card-bordered">
                <div className="card-inner">
                  <h5 className="mb-1">Kiosk-synced menu</h5>
                  <p className="text-soft">Pickup automatically mirrors the current in-stock kiosk menu. Manage products, visibility, and inventory in the kiosk menu; there is no separate pickup selection.</p>
                  <Alert color="info" className="mb-0 mt-3">
                    New kiosk menu products become available for pickup automatically. Pickup hours, ordering status, wait time, and tax remain managed here.
                  </Alert>
                  <Row className="g-3 mt-1">
                    {(settings.menu?.products || []).map((product) => (
                      <Col sm="6" lg="4" key={product.id}>
                        <div className="border rounded p-3 d-flex h-100 bg-light">
                          <span style={{ minWidth: 0 }}>
                            <span className="fw-bold d-block text-break">{product.name}</span>
                            <small className="text-soft d-block">${Number(product.items?.[0]?.price || 0).toFixed(2)}{product.comboSideCount ? ` · includes ${product.comboSideCount} sides` : ""}</small>
                            {product.description && <small className="text-soft d-block mt-1">{product.description}</small>}
                          </span>
                        </div>
                        </Col>
                    ))}
                  </Row>
                  {!settings.menu?.products?.length && <p className="text-soft mt-4 mb-0">No in-stock kiosk menu items are currently available.</p>}
                </div>
              </div>
              <div className="text-end mt-4">
                <Button color="primary" type="submit" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : <Icon name="save" />}<span className="ms-1">Save pickup settings</span>
                </Button>
              </div>
            </form>
          )}
        </Block>
      </Content>
    </>
  );
};

export default PickupSettings;