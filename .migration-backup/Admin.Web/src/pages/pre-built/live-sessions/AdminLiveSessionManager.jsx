import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalHeader, Spinner, Alert, Badge, Input } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const STATUS_COLORS = {
  DRAFT: "light",
  SCHEDULED: "info",
  LIVE: "success",
  CLOSED: "secondary",
  CANCELLED: "danger",
};

const STATUS_OPTIONS = ["DRAFT", "SCHEDULED", "LIVE", "CLOSED", "CANCELLED"];

const formatDateTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

const toLocalDatetimeInput = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const off = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
};

const blankForm = () => ({
  title: "",
  locationName: "",
  address: "",
  lat: "",
  lng: "",
  message: "",
  startTime: "",
  endTime: "",
});

const AdminLiveSessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [currentLive, setCurrentLive] = useState(null);
  const [subscriberCount, setSubscriberCount] = useState(null);

  const [formModal, setFormModal] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const [alertModal, setAlertModal] = useState(false);
  const [alertTarget, setAlertTarget] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [sendingAlert, setSendingAlert] = useState(false);

  const [testSmsModal, setTestSmsModal] = useState(false);
  const [testSmsTarget, setTestSmsTarget] = useState(null);
  const [testSmsPhone, setTestSmsPhone] = useState("");
  const [testSmsBody, setTestSmsBody] = useState("");
  const [sendingTestSms, setSendingTestSms] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [actionLoading, setActionLoading] = useState(null);

  const loadSessions = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "15");
      params.set("orderBy", "createdAt");
      params.set("order", "desc");
      if (filterStatus) params.set("status", filterStatus);
      const res = await apiGet(`/live-sessions?${params.toString()}`);
      setSessions(res?.data ?? []);
      setTotal(res?.meta?.total ?? res?.total ?? 0);
      setPage(res?.meta?.page ?? res?.page ?? p);
      setTotalPages(res?.meta?.totalPages ?? res?.totalPages ?? 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const loadCurrentLive = useCallback(async () => {
    try {
      const res = await apiGet("/live-sessions/public/current");
      setCurrentLive(res?.data ?? res ?? null);
    } catch {
      setCurrentLive(null);
    }
  }, []);

  const loadSubscriberCount = useCallback(async () => {
    try {
      const res = await apiGet("/live-sessions/subscribers/count");
      setSubscriberCount(res?.data?.count ?? res?.count ?? null);
    } catch {
      setSubscriberCount(null);
    }
  }, []);

  useEffect(() => {
    loadSessions(1);
    loadCurrentLive();
    loadSubscriberCount();
  }, [loadSessions, loadCurrentLive, loadSubscriberCount]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditSession(null);
    setForm(blankForm());
    setFormError(null);
    setFormModal(true);
  };

  const openEdit = (session) => {
    setEditSession(session);
    setForm({
      title: session.title || "",
      locationName: session.locationName || "",
      address: session.address || "",
      lat: session.lat ?? "",
      lng: session.lng ?? "",
      message: session.message || "",
      startTime: toLocalDatetimeInput(session.startTime),
      endTime: toLocalDatetimeInput(session.endTime),
    });
    setFormError(null);
    setFormModal(true);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setFormError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm((f) => ({ ...f, lat: String(lat), lng: String(lng) }));
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await resp.json();
          if (data?.display_name) {
            setForm((f) => ({ ...f, address: data.display_name }));
          }
        } catch {}
        setGeoLoading(false);
      },
      (err) => {
        setFormError("Failed to get location: " + err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const saveSession = async (andGoLive = false) => {
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        title: form.title,
        locationName: form.locationName || null,
        address: form.address || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        message: form.message || null,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
      };

      let session;
      if (editSession) {
        const res = await apiPatch(`/live-sessions/${editSession.id}`, body);
        session = res?.data ?? res;
        setSuccess("Session updated.");
      } else {
        const res = await apiPost("/live-sessions", body);
        session = res?.data ?? res;
        setSuccess("Session created.");
      }

      setFormModal(false);

      if (andGoLive && session?.id) {
        try {
          await apiPost(`/live-sessions/${session.id}/go-live`, { message: form.message || null });
          setSuccess("Session is now LIVE!");
          loadCurrentLive();
        } catch (e) {
          setError("Session saved but failed to go live: " + e.message);
        }
      }

      loadSessions(page);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGoLive = async (session) => {
    setActionLoading(session.id);
    try {
      await apiPost(`/live-sessions/${session.id}/go-live`, { message: session.message || null });
      setSuccess(`"${session.title}" is now LIVE!`);
      loadSessions(page);
      loadCurrentLive();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (session) => {
    setActionLoading(session.id);
    try {
      await apiPost(`/live-sessions/${session.id}/close`, {});
      setSuccess(`"${session.title}" has been closed.`);
      loadSessions(page);
      loadCurrentLive();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openAlert = (session) => {
    setAlertTarget(session);
    setAlertMessage(
      session.message ||
      `We're live at ${session.locationName || session.address || "our roadside location"}! Come grab some BBQ!`
    );
    setAlertModal(true);
  };

  const sendAlert = async () => {
    if (!alertTarget) return;
    setSendingAlert(true);
    try {
      const res = await apiPost(`/live-sessions/${alertTarget.id}/send-alert`, {
        messageBody: alertMessage,
        audienceType: "all",
      });
      const data = res?.data ?? res;
      setSuccess(`Alert sent! ${data?.totalSent ?? 0} messages delivered, ${data?.totalFailed ?? 0} failed.`);
      setAlertModal(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSendingAlert(false);
    }
  };

  const openTestSms = (session) => {
    setTestSmsTarget(session);
    setTestSmsPhone("");
    setTestSmsBody(session.message || `Test: We're live at ${session.locationName || "our location"}!`);
    setTestSmsModal(true);
  };

  const sendTestSms = async () => {
    if (!testSmsTarget) return;
    setSendingTestSms(true);
    try {
      await apiPost(`/live-sessions/${testSmsTarget.id}/test-sms`, {
        to: testSmsPhone,
        body: testSmsBody || undefined,
      });
      setSuccess("Test SMS sent!");
      setTestSmsModal(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSendingTestSms(false);
    }
  };

  const openDelete = (session) => {
    setDeleteTarget(session);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/live-sessions/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setSuccess("Session deleted.");
      loadSessions(page);
      loadCurrentLive();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const repeatLast = async () => {
    try {
      const res = await apiGet("/live-sessions?limit=1&orderBy=createdAt&order=desc");
      const last = (res?.data ?? [])[0];
      if (!last) {
        setError("No previous session to repeat.");
        return;
      }
      setEditSession(null);
      setForm({
        title: last.title || "",
        locationName: last.locationName || "",
        address: last.address || "",
        lat: last.lat ?? "",
        lng: last.lng ?? "",
        message: last.message || "",
        startTime: "",
        endTime: "",
      });
      setFormError(null);
      setFormModal(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const copyDirectionsLink = (session) => {
    const url = session.mapUrl ||
      (session.lat && session.lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${session.lat},${session.lng}`
        : session.address
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(session.address)}`
          : null);
    if (!url) {
      setError("No location data to generate directions link.");
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      setSuccess("Directions link copied to clipboard!");
    }).catch(() => {
      setError("Failed to copy link.");
    });
  };

  const mapEmbedUrl = (session) => {
    if (session?.lat && session?.lng) {
      return `https://www.google.com/maps?q=${session.lat},${session.lng}&output=embed`;
    }
    if (session?.address) {
      return `https://www.google.com/maps?q=${encodeURIComponent(session.address)}&output=embed`;
    }
    return null;
  };

  return (
    <>
      <Head title="Roadside BBQ Live Manager" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Roadside BBQ Live Manager</BlockTitle>
              <BlockDes className="text-soft">
                <p>Manage live roadside sessions, broadcast your location, and send SMS alerts.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="d-flex gap-2 flex-wrap">
                <Button color="light" onClick={repeatLast}>
                  <Icon name="reload" /> <span>Repeat Last</span>
                </Button>
                <Button color="primary" onClick={openCreate}>
                  <Icon name="plus" /> <span>New Session</span>
                </Button>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" className="mb-3" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>{success}</Alert>}

        {currentLive && (
          <Block>
            <div className="card card-bordered" style={{ borderColor: "#28a745", borderWidth: 2 }}>
              <div className="card-inner">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%", background: "#d4edda",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="map-pin" style={{ fontSize: 24, color: "#28a745" }} />
                    </div>
                    <div>
                      <h6 className="mb-0">
                        <Badge color="success" className="me-2">LIVE NOW</Badge>
                        {currentLive.title}
                      </h6>
                      <div className="text-soft fs-13px">
                        {currentLive.locationName || currentLive.address || "No location set"}
                        {currentLive.startTime && ` | Started ${formatDateTime(currentLive.startTime)}`}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button size="sm" color="warning" onClick={() => openAlert(currentLive)}>
                      <Icon name="send" /> Send Alert
                    </Button>
                    <Button size="sm" color="light" onClick={() => copyDirectionsLink(currentLive)}>
                      <Icon name="link" /> Copy Directions
                    </Button>
                    <Button size="sm" color="danger" onClick={() => handleClose(currentLive)}
                      disabled={actionLoading === currentLive.id}>
                      {actionLoading === currentLive.id ? <Spinner size="sm" /> : <Icon name="cross-circle" />} End Session
                    </Button>
                  </div>
                </div>

                {mapEmbedUrl(currentLive) && (
                  <div className="mt-3" style={{ borderRadius: 8, overflow: "hidden" }}>
                    <iframe
                      src={mapEmbedUrl(currentLive)}
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Live location map"
                    />
                  </div>
                )}
              </div>
            </div>
          </Block>
        )}

        <Block>
          <Row className="g-gs mb-3">
            <Col sm="6" lg="3">
              <div className="card card-bordered">
                <div className="card-inner py-3">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0" style={{
                      width: 44, height: 44, borderRadius: "50%", background: currentLive ? "#d4edda" : "#f8d7da",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="signal" style={{ fontSize: 20, color: currentLive ? "#28a745" : "#dc3545" }} />
                    </div>
                    <div className="ms-3">
                      <h6 className="mb-0 text-soft fs-12px text-uppercase">Status</h6>
                      <h5 className="mb-0">{currentLive ? "LIVE" : "Offline"}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col sm="6" lg="3">
              <div className="card card-bordered">
                <div className="card-inner py-3">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0" style={{
                      width: 44, height: 44, borderRadius: "50%", background: "#cce5ff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="users" style={{ fontSize: 20, color: "#0069d9" }} />
                    </div>
                    <div className="ms-3">
                      <h6 className="mb-0 text-soft fs-12px text-uppercase">SMS Subscribers</h6>
                      <h5 className="mb-0">{subscriberCount ?? "—"}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col sm="6" lg="3">
              <div className="card card-bordered">
                <div className="card-inner py-3">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0" style={{
                      width: 44, height: 44, borderRadius: "50%", background: "#fff3cd",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="list" style={{ fontSize: 20, color: "#e09200" }} />
                    </div>
                    <div className="ms-3">
                      <h6 className="mb-0 text-soft fs-12px text-uppercase">Total Sessions</h6>
                      <h5 className="mb-0">{total}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Block>

        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h6 className="mb-0">All Sessions</h6>
                <div className="d-flex gap-2">
                  <Input type="select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); }}
                    style={{ width: 160 }}>
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Input>
                  <Button size="sm" color="primary" onClick={() => loadSessions(1)}>
                    <Icon name="search" />
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-4"><Spinner /></div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-soft py-4">No sessions found. Create one to get started.</div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Location</th>
                          <th>Status</th>
                          <th>Start Time</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s) => (
                          <tr key={s.id}>
                            <td className="fw-bold">{s.title}</td>
                            <td>
                              <div>{s.locationName || "—"}</div>
                              {s.address && <small className="text-soft d-block" style={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.address}</small>}
                            </td>
                            <td>
                              <Badge color={STATUS_COLORS[s.status] || "light"}>{s.status}</Badge>
                            </td>
                            <td>{formatDateTime(s.startTime)}</td>
                            <td className="text-end">
                              <div className="d-flex gap-1 justify-content-end flex-wrap">
                                <Button size="sm" outline color="primary" onClick={() => openEdit(s)} title="Edit">
                                  <Icon name="edit" />
                                </Button>
                                {(s.status === "DRAFT" || s.status === "SCHEDULED") && (
                                  <Button size="sm" color="success" onClick={() => handleGoLive(s)} title="Go Live"
                                    disabled={actionLoading === s.id}>
                                    {actionLoading === s.id ? <Spinner size="sm" /> : <Icon name="play" />}
                                  </Button>
                                )}
                                {s.status === "LIVE" && (
                                  <>
                                    <Button size="sm" color="warning" onClick={() => openAlert(s)} title="Send Alert">
                                      <Icon name="send" />
                                    </Button>
                                    <Button size="sm" color="danger" onClick={() => handleClose(s)} title="End Session"
                                      disabled={actionLoading === s.id}>
                                      {actionLoading === s.id ? <Spinner size="sm" /> : <Icon name="cross-circle" />}
                                    </Button>
                                  </>
                                )}
                                <Button size="sm" outline color="info" onClick={() => openTestSms(s)} title="Send Test SMS">
                                  <Icon name="mobile" />
                                </Button>
                                <Button size="sm" outline color="light" onClick={() => copyDirectionsLink(s)} title="Copy Directions">
                                  <Icon name="link" />
                                </Button>
                                <Button size="sm" outline color="danger" onClick={() => openDelete(s)} title="Delete">
                                  <Icon name="trash" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="text-soft fs-12px">
                        Page {page} of {totalPages} ({total} sessions)
                      </span>
                      <div className="d-flex gap-2">
                        <Button size="sm" color="light" disabled={page <= 1} onClick={() => loadSessions(page - 1)}>
                          <Icon name="chevron-left" /> Prev
                        </Button>
                        <Button size="sm" color="light" disabled={page >= totalPages} onClick={() => loadSessions(page + 1)}>
                          Next <Icon name="chevron-right" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Block>
      </Content>

      <Modal isOpen={formModal} toggle={() => setFormModal(false)} size="lg">
        <ModalHeader toggle={() => setFormModal(false)}>
          {editSession ? "Edit Session" : "New Live Session"}
        </ModalHeader>
        <ModalBody>
          {formError && <Alert color="danger" className="mb-3">{formError}</Alert>}
          <Row className="g-3">
            <Col md="12">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input type="text" className="form-control" value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g. Friday Roadside BBQ" />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Location Name</label>
                <input type="text" className="form-control" value={form.locationName}
                  onChange={(e) => setField("locationName", e.target.value)}
                  placeholder="e.g. Corner of Main & Oak" />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Full street address" />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input type="number" step="any" className="form-control" value={form.lat}
                  onChange={(e) => setField("lat", e.target.value)}
                  placeholder="e.g. 35.2271" />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input type="number" step="any" className="form-control" value={form.lng}
                  onChange={(e) => setField("lng", e.target.value)}
                  placeholder="e.g. -80.8431" />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group d-flex align-items-end" style={{ height: "100%" }}>
                <Button color="outline-primary" className="w-100" onClick={useMyLocation}
                  disabled={geoLoading} style={{ minHeight: 38 }}>
                  {geoLoading ? <Spinner size="sm" /> : <><Icon name="crosshair" /> Use My Location</>}
                </Button>
              </div>
            </Col>

            {(form.lat && form.lng) && (
              <Col md="12">
                <div style={{ borderRadius: 8, overflow: "hidden" }}>
                  <iframe
                    src={`https://www.google.com/maps?q=${form.lat},${form.lng}&output=embed`}
                    width="100%"
                    height="180"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    title="Map preview"
                  />
                </div>
              </Col>
            )}

            <Col md="12">
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-control" rows="3" value={form.message}
                  onChange={(e) => setField("message", e.target.value)}
                  placeholder="Message to display on the public page and include in SMS alerts..." />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input type="datetime-local" className="form-control" value={form.startTime}
                  onChange={(e) => setField("startTime", e.target.value)} />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input type="datetime-local" className="form-control" value={form.endTime}
                  onChange={(e) => setField("endTime", e.target.value)} />
              </div>
            </Col>
          </Row>
          <div className="mt-4 d-flex justify-content-between flex-wrap gap-2">
            <Button color="light" onClick={() => setFormModal(false)}>Cancel</Button>
            <div className="d-flex gap-2 flex-wrap">
              <Button color="secondary" onClick={() => saveSession(false)}
                disabled={saving || !form.title} style={{ minHeight: 44, minWidth: 120 }}>
                {saving ? <Spinner size="sm" /> : <><Icon name="save" /> Save Draft</>}
              </Button>
              <Button color="success" onClick={() => saveSession(true)}
                disabled={saving || !form.title} style={{ minHeight: 44, minWidth: 160 }}>
                {saving ? <Spinner size="sm" /> : <><Icon name="play" /> Save & Go Live</>}
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={alertModal} toggle={() => setAlertModal(false)}>
        <ModalHeader toggle={() => setAlertModal(false)}>Send SMS Alert</ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <label className="form-label">Alert Message *</label>
            <textarea className="form-control" rows="4" value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="Enter the SMS message to send to all subscribers..." />
          </div>
          {subscriberCount !== null && (
            <div className="mb-3">
              <Badge color="info">~{subscriberCount} subscribers</Badge> will receive this message.
            </div>
          )}
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setAlertModal(false)}>Cancel</Button>
            <Button color="warning" onClick={sendAlert} disabled={sendingAlert || !alertMessage}
              style={{ minHeight: 44 }}>
              {sendingAlert ? <Spinner size="sm" /> : <><Icon name="send" /> Send Alert</>}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={testSmsModal} toggle={() => setTestSmsModal(false)}>
        <ModalHeader toggle={() => setTestSmsModal(false)}>Send Test SMS</ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <label className="form-label">Phone Number *</label>
            <input type="tel" className="form-control" value={testSmsPhone}
              onChange={(e) => setTestSmsPhone(e.target.value)}
              placeholder="+1234567890" />
          </div>
          <div className="mb-3">
            <label className="form-label">Message</label>
            <textarea className="form-control" rows="3" value={testSmsBody}
              onChange={(e) => setTestSmsBody(e.target.value)} />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setTestSmsModal(false)}>Cancel</Button>
            <Button color="info" onClick={sendTestSms} disabled={sendingTestSms || !testSmsPhone}
              style={{ minHeight: 44 }}>
              {sendingTestSms ? <Spinner size="sm" /> : <><Icon name="mobile" /> Send Test</>}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
        <ModalHeader toggle={() => setDeleteModal(false)}>Delete Session</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.</p>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button color="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : "Delete"}
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default AdminLiveSessionManager;
