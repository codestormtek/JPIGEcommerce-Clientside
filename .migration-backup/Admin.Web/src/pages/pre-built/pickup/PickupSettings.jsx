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
        asapWaitMinutes: Number(settings.asapWaitMinutes),
        taxRatePercent: Number(settings.taxRatePercent),
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
                    <Col md="4">
                      <label className="form-label" htmlFor="pickup-tax">Sales tax rate (%)</label>
                      <input id="pickup-tax" className="form-control" type="number" min="0" max="25" step="0.001" required value={settings.taxRatePercent} onChange={(event) => update("taxRatePercent", Number(event.target.value))} />
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