import React, { useCallback, useEffect, useState, useRef } from "react";
import { Alert, Badge, Spinner, Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle, Button, Icon } from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/utils/apiClient";

const AdminOrderNotifications = () => {
  const [recipients, setRecipients] = useState([]);
  const [status, setStatus] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(null);

  const [newLabel, setNewLabel] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const isInitialMount = useRef(true);
  const loadVersion = useRef(0);
  const actionInFlight = useRef(false);

  const startAction = (key) => {
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    setBusy(key);
    setError(null);
    setSuccess(null);
    return true;
  };
  const finishAction = () => {
    actionInFlight.current = false;
    setBusy(null);
  };

  const load = useCallback(async (isSilent = false) => {
    const version = ++loadVersion.current;
    if (!isSilent) {
      setError(null);
      setLoading(true);
    }
    try {
      const [recipientsRes, statusRes, deliveriesRes] = await Promise.all([
        apiGet("/admin/order-notifications"),
        apiGet("/admin/order-notifications/status"),
        apiGet("/admin/order-notifications/deliveries")
      ]);
      if (version !== loadVersion.current) return;
      setRecipients(recipientsRes?.data || []);
      setStatus(statusRes?.data || null);
      setDeliveries(deliveriesRes?.data || []);
    } catch (cause) {
      if (version === loadVersion.current) setError(cause.message || "Could not refresh notification data. Previously loaded values may be outdated.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      load();
      isInitialMount.current = false;
    }
    const interval = setInterval(() => {
      if (!document.hidden && !editModal && !busy) {
        load(true);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [load, editModal, busy]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newPhone.trim()) return;
    if (!startAction("add")) return;
    try {
      await apiPost("/admin/order-notifications", { label: newLabel.trim(), phoneNumber: newPhone.trim(), isActive: true });
      setNewLabel("");
      setNewPhone("");
      setSuccess("Recipient added successfully.");
      await load(true);
    } catch (cause) {
      setError(cause.message || "Failed to add recipient.");
    } finally {
      finishAction();
    }
  };

  const openEdit = (r) => {
    setEditData({ id: r.id, label: r.label || "", phoneNumber: r.phoneNumber, isActive: r.isActive });
    setEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!startAction("edit")) return;
    try {
      await apiPatch(`/admin/order-notifications/${editData.id}`, {
        label: editData.label.trim(),
        phoneNumber: editData.phoneNumber.trim(),
        isActive: editData.isActive
      });
      setEditModal(false);
      setSuccess("Recipient updated successfully.");
      await load(true);
    } catch (cause) {
      setError(cause.message || "Failed to update recipient.");
    } finally {
      finishAction();
    }
  };

  const handleToggle = async (r) => {
    if (!startAction(`toggle-${r.id}`)) return;
    try {
      await apiPatch(`/admin/order-notifications/${r.id}`, { isActive: !r.isActive });
      await load(true);
    } catch (cause) {
      setError(cause.message || "Failed to toggle status.");
    } finally {
      finishAction();
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Are you sure you want to delete ${r.label || r.phoneNumber}?`)) return;
    if (!startAction(`delete-${r.id}`)) return;
    try {
      await apiDelete(`/admin/order-notifications/${r.id}`);
      setSuccess("Recipient deleted.");
      await load(true);
    } catch (cause) {
      setError(cause.message || "Failed to delete recipient.");
    } finally {
      finishAction();
    }
  };

  const handleTest = async (r) => {
    if (actionInFlight.current || !r.isActive || !status?.sms?.ready) return;
    if (!window.confirm(`Send an ACTUAL test SMS to ${r.phoneNumber}? This will use real SMS quota.`)) return;
    if (!startAction(`test-${r.id}`)) return;
    try {
      await apiPost(`/admin/order-notifications/${r.id}/test`, {});
      setSuccess("Test message requested.");
      await load(true);
    } catch (cause) {
      setError(cause.message || "Failed to send test message.");
    } finally {
      finishAction();
    }
  };

  return (
    <>
      <Head title="Order Alerts" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Order Alerts & Notifications</BlockTitle>
              <BlockDes className="text-soft">Manage staff notifications for new orders across SMS, Email, and Push.</BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="light" outline className="btn-white" onClick={() => load(false)} disabled={loading || Boolean(busy)}>
                <Icon name="reload" /><span>Refresh</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" toggle={() => setSuccess(null)}>{success}</Alert>}
        {status?.storageReady === false && (
          <Alert color="warning">Staff alert delivery storage is not ready. Apply the staff-alert database migration before enabling the new email and SMS workflow. Payment processing and existing phone-app alerts remain separate.</Alert>
        )}

        <Block>
          {loading && !recipients.length && !status && !deliveries.length ? (
            <div className="text-center py-5"><Spinner color="primary" /></div>
          ) : (
            <>
              <div className="row g-gs mb-4">
                <div className="col-lg-4">
                  <div className="card card-bordered h-100">
                    <div className="card-inner">
                      <h5>Phone App Notifications</h5>
                      <p className="text-soft mb-2">
                        Staff can receive alerts directly on the Jiggling Pig app. Tell staff to go to <strong>Settings &gt; Push Notifications</strong> in the app and enable <strong>Kitchen/New Orders</strong> or <strong>All Updates</strong>.
                      </p>
                      <p className="text-soft mb-0 text-dark">
                        The app provides cashier ready alerts. Remember: for paid pickups, never collect payment again.
                      </p>
                      {status?.app?.note && <p className="text-info mt-2 mb-0">{status.app.note}</p>}
                    </div>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="card card-bordered h-100">
                    <div className="card-inner d-flex flex-column">
                      <h5>Email Alerts</h5>
                      <p className="text-soft mb-3">Email notifications are read-only and managed via the <code>ADMIN_EMAIL</code> configuration.</p>
                      {status?.email ? (
                        <div className="mt-auto">
                          <div className="mb-2">
                            <Badge color={status.email.ready ? "success" : "warning"} className="me-2">
                              {status.email.ready ? "READY" : "NOT READY"}
                            </Badge>
                            <span><strong>Enabled:</strong> {status.email.enabled ? "Yes" : "No"}</span>
                          </div>
                          <div className="mb-1 text-break"><strong>Recipient:</strong> {status.email.recipient || "None"}</div>
                          {status.email.reason && <div className="text-danger small">{status.email.reason}</div>}
                        </div>
                      ) : (
                        <span className="text-soft mt-auto">Loading email status...</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="card card-bordered h-100">
                    <div className="card-inner d-flex flex-column">
                      <h5>SMS Alerts Status</h5>
                      <p className="text-soft mb-3">Summary of your active SMS provider and active staff recipients below.</p>
                      {status?.sms ? (
                        <div className="mt-auto">
                          <div className="mb-2">
                            <Badge color={status.sms.ready ? "success" : "warning"} className="me-2">
                              {status.sms.ready ? "READY" : "NOT READY"}
                            </Badge>
                            <span><strong>Enabled:</strong> {status.sms.enabled ? "Yes" : "No"}</span>
                          </div>
                          <div className="mb-1"><strong>Active Recipients:</strong> {status.sms.activeRecipients}</div>
                          {status.sms.reason && <div className="text-danger small">{status.sms.reason}</div>}
                        </div>
                      ) : (
                        <span className="text-soft mt-auto">Loading SMS status...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card card-bordered mb-4">
                <div className="card-inner border-bottom">
                  <h5>Staff SMS Recipients</h5>
                  <p className="text-soft mb-0">
                    Add staff phone numbers below to receive SMS alerts for new orders.
                    <strong> Explicit staff consent is required.</strong> Staff can reply <code>STOP</code> to opt out at any time.
                  </p>
                </div>
                <div className="card-inner bg-light border-bottom">
                  <form className="d-flex gap-2 flex-wrap" onSubmit={handleAdd}>
                    <input className="form-control" aria-label="Staff name" maxLength={80} style={{ flex: "1 1 200px", minWidth: 0 }} placeholder="Staff Name" value={newLabel} onChange={e => setNewLabel(e.target.value)} required />
                    <input className="form-control" type="tel" aria-label="Staff phone number" maxLength={20} style={{ flex: "1 1 200px", minWidth: 0 }} placeholder="Phone Number (e.g. +15551234567)" value={newPhone} onChange={e => setNewPhone(e.target.value)} required />
                    <Button type="submit" color="primary" disabled={Boolean(busy) || loading}>
                      {busy === "add" ? <Spinner size="sm" /> : <><Icon name="plus" /><span>Add</span></>}
                    </Button>
                  </form>
                </div>
                {!recipients.length ? (
                  <div className="card-inner text-center text-soft py-5">No SMS recipients configured.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th className="ps-4">Label</th>
                          <th>Phone Number</th>
                          <th>Status</th>
                          <th className="text-end pe-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.map(r => (
                          <tr key={r.id}>
                            <td className="ps-4">{r.label || "-"}</td>
                            <td>{r.phoneNumber}</td>
                            <td>
                              <Badge color={r.isActive ? "success" : "light"}>{r.isActive ? "ACTIVE" : "PAUSED"}</Badge>
                            </td>
                            <td className="text-end pe-4">
                              <div className="d-inline-flex gap-1">
                                <Button size="sm" color="light" outline disabled={Boolean(busy) || !r.isActive || !status?.sms?.ready} onClick={() => handleTest(r)}>
                                  {busy === `test-${r.id}` ? <Spinner size="sm" /> : "Test SMS"}
                                </Button>
                                <Button size="sm" color="light" outline disabled={Boolean(busy)} onClick={() => handleToggle(r)}>
                                  {busy === `toggle-${r.id}` ? <Spinner size="sm" /> : (r.isActive ? "Pause" : "Activate")}
                                </Button>
                                <Button size="sm" color="light" outline disabled={Boolean(busy)} onClick={() => openEdit(r)}>Edit</Button>
                                <Button size="sm" color="danger" outline disabled={Boolean(busy)} onClick={() => handleDelete(r)}>
                                  {busy === `delete-${r.id}` ? <Spinner size="sm" /> : "Delete"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card card-bordered mb-4">
                <div className="card-inner border-bottom">
                  <h5>Recent Deliveries</h5>
                  <p className="text-soft mb-0">
                    "Accepted" or "Sent" means the provider accepted the request, not proof of delivery.
                    If a message is unknown or missing, check with the provider before resending.
                    Uncertain sends are held for review to avoid duplicate messages.
                  </p>
                </div>
                {!deliveries.length ? (
                  <div className="card-inner text-center text-soft py-5">No recent deliveries.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th className="ps-4">Time</th>
                          <th>Order</th>
                          <th>Channel</th>
                          <th>Recipient</th>
                          <th>Status</th>
                          <th>Attempts</th>
                          <th className="pe-4">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map(d => (
                          <tr key={d.id}>
                            <td className="ps-4">{d.createdAt ? new Date(d.createdAt).toLocaleString() : ""}</td>
                            <td>
                              <div>{d.orderNumber}</div>
                              <div className="small text-soft">{d.source}</div>
                            </td>
                            <td>{d.channel}</td>
                            <td>{d.recipient}</td>
                            <td>
                              <Badge color={
                                d.status === "sent" || d.status === "accepted" ? "success" :
                                d.status === "error" || d.status === "failed" ? "danger" : "warning"
                              }>{d.status.toUpperCase()}</Badge>
                            </td>
                            <td>{d.attempts}</td>
                            <td className="text-danger small pe-4">{d.lastError || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </Block>

        <Modal isOpen={editModal} toggle={() => setEditModal(false)}>
          <ModalHeader toggle={() => setEditModal(false)}>Edit Recipient</ModalHeader>
          <ModalBody>
            {error && <Alert color="danger">{error}</Alert>}
            {editData && (
              <form id="edit-form" onSubmit={handleEditSubmit}>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="edit-label">Label</label>
                  <div className="form-control-wrap">
                    <input type="text" className="form-control" id="edit-label" value={editData.label} onChange={e => setEditData({ ...editData, label: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="edit-phone">Phone Number</label>
                  <div className="form-control-wrap">
                    <input type="text" className="form-control" id="edit-phone" value={editData.phoneNumber} onChange={e => setEditData({ ...editData, phoneNumber: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <div className="custom-control custom-switch">
                    <input type="checkbox" className="custom-control-input" id="edit-active" checked={editData.isActive} onChange={e => setEditData({ ...editData, isActive: e.target.checked })} />
                    <label className="custom-control-label" htmlFor="edit-active">Active</label>
                  </div>
                </div>
              </form>
            )}
          </ModalBody>
          <ModalFooter className="bg-light">
            <Button color="light" outline onClick={() => setEditModal(false)}>Cancel</Button>
            <Button color="primary" type="submit" form="edit-form" disabled={busy === "edit"}>
              {busy === "edit" ? <Spinner size="sm" /> : "Save Changes"}
            </Button>
          </ModalFooter>
        </Modal>

      </Content>
    </>
  );
};

export default AdminOrderNotifications;
