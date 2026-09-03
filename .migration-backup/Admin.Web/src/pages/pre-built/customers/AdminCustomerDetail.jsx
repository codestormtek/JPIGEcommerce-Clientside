import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, UserAvatar, Button, RSelect,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  PaginationComponent,
} from "@/components/Component";
import { apiGet, apiPatch } from "@/utils/apiClient";

const avatarThemes = ["primary", "success", "info", "warning", "danger", "pink", "purple"];
const getTheme = (id) => avatarThemes[(id || "").charCodeAt(0) % avatarThemes.length];
const getInitials = (u) => {
  const f = (u.firstName || "")[0] || "";
  const l = (u.lastName || "")[0] || "";
  if (f || l) return (f + l).toUpperCase();
  return (u.emailAddress || "??").slice(0, 2).toUpperCase();
};

const roleSelectOpts = [
  { value: "user", label: "Registered" },
  { value: "admin", label: "Administrator" },
];

const fmtDate = (d) => d ? new Date(d).toLocaleString() : "—";
const fmtCurrency = (v, c) => {
  if (v == null) return "—";
  const num = typeof v === "object" && v.$numberDecimal ? parseFloat(v.$numberDecimal) : parseFloat(v);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD" }).format(num);
};

const AdminCustomerDetail = () => {
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", phoneNumber: "", role: "user", isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const [orders, setOrders] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);

  const [activityLogs, setActivityLogs] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet(`/users/${id}`);
      const user = res?.data ?? res;
      setCustomer(user);
      setForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        phoneNumber: user.phoneNumber ?? "",
        role: user.role ?? "user",
        isActive: user.isActive ?? true,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadOrders = useCallback(async () => {
    setOrderLoading(true);
    try {
      const res = await apiGet(`/users/${id}/orders?page=${orderPage}&limit=10`);
      setOrders(res?.data ?? []);
      setOrderTotal(res?.meta?.total ?? 0);
    } catch {}
    finally { setOrderLoading(false); }
  }, [id, orderPage]);

  const loadAddresses = useCallback(async () => {
    setAddressLoading(true);
    try {
      const res = await apiGet(`/users/${id}/addresses`);
      setAddresses(res?.data ?? res ?? []);
    } catch {}
    finally { setAddressLoading(false); }
  }, [id]);

  useEffect(() => { setActivityPage(1); }, [id]);

  const loadActivityLogs = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await apiGet(`/audit-logs?userId=${id}&page=${activityPage}&limit=10&orderBy=createdAt&order=desc`);
      setActivityLogs(res?.data ?? []);
      setActivityTotal(res?.meta?.total ?? 0);
    } catch {}
    finally { setActivityLoading(false); }
  }, [id, activityPage]);

  useEffect(() => { loadCustomer(); }, [loadCustomer]);
  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { loadAddresses(); }, [loadAddresses]);
  useEffect(() => { loadActivityLogs(); }, [loadActivityLogs]);

  const saveChanges = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveMsg(null);
    try {
      await apiPatch(`/users/${id}`, {
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phoneNumber: form.phoneNumber || undefined,
        role: form.role,
        isActive: form.isActive,
      });
      setSaveMsg("Customer updated successfully.");
      loadCustomer();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Content><div className="text-center py-5"><Spinner color="primary" /></div></Content>;
  if (error) return <Content><div className="alert alert-danger m-4">{error}</div></Content>;
  if (!customer) return <Content><div className="alert alert-warning m-4">Customer not found.</div></Content>;

  const fmtAddress = (ua) => {
    const a = ua.address;
    if (!a) return "—";
    const parts = [a.addressLine1, a.addressLine2, a.city, a.region, a.postalCode].filter(Boolean);
    if (a.country?.name) parts.push(a.country.name);
    return parts.join(", ");
  };

  return (
    <React.Fragment>
      <Head title={`Customer — ${customer.emailAddress}`} />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Edit customer details — {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.emailAddress}
              </BlockTitle>
              <BlockDes>
                <Link to="/customers" className="text-primary">
                  <Icon name="arrow-left" className="me-1" />back to customer list
                </Link>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <ul className="nk-block-tools g-3">
                <li>
                  <Button color="primary" disabled={saving} onClick={saveChanges}>
                    {saving ? <Spinner size="sm" className="me-1" /> : <Icon name="save" className="me-1" />}
                    Save
                  </Button>
                </li>
              </ul>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {saveMsg && <div className="alert alert-success">{saveMsg}</div>}
        {saveError && <div className="alert alert-danger">{saveError}</div>}

        {/* Customer Info Card */}
        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <div className="d-flex align-items-center mb-3">
                <UserAvatar theme={getTheme(customer.id)} className="md" text={getInitials(customer)} />
                <div className="ms-3">
                  <h6 className="mb-0">{[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—"}</h6>
                  <span className="text-muted">{customer.emailAddress}</span>
                </div>
              </div>
              <h6 className="overline-title-alt mb-3">
                <Icon name="user-fill" className="me-1" />
                Customer info
              </h6>
              <Row className="g-3">
                <Col md={6}>
                  <div className="form-group">
                    <label className="form-label">Email <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" value={customer.emailAddress} disabled />
                    <span className="form-note text-muted">Email cannot be changed.</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="form-group">
                    <label className="form-label">Phone number</label>
                    <input type="text" className="form-control" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="form-group">
                    <label className="form-label">First name</label>
                    <input type="text" className="form-control" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="form-group">
                    <label className="form-label">Last name</label>
                    <input type="text" className="form-control" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="form-group">
                    <label className="form-label">Customer roles</label>
                    <RSelect options={roleSelectOpts} value={roleSelectOpts.find((o) => o.value === form.role)} onChange={(opt) => setForm({ ...form, role: opt.value })} />
                  </div>
                </Col>
                <Col md={3}>
                  <div className="form-group">
                    <label className="form-label">Active</label>
                    <div className="custom-control custom-switch mt-1">
                      <input type="checkbox" className="custom-control-input form-check-input" id="isActiveSwitch" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                      <label className="custom-control-label form-check-label ms-2" htmlFor="isActiveSwitch">{form.isActive ? "Yes" : "No"}</label>
                    </div>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="form-group">
                    <label className="form-label">Admin comment</label>
                    <textarea className="form-control form-control-sm" rows={2} disabled placeholder="Coming soon" />
                  </div>
                </Col>
              </Row>
              <hr />
              <Row className="g-3 mt-1">
                <Col md={4}>
                  <span className="text-muted small">Created on</span>
                  <div className="fw-semibold">{fmtDate(customer.createdAt)}</div>
                </Col>
                <Col md={4}>
                  <span className="text-muted small">Last modified</span>
                  <div className="fw-semibold">{fmtDate(customer.lastModifiedAt)}</div>
                </Col>
                {customer._count && (
                  <Col md={4}>
                    <span className="text-muted small">Statistics</span>
                    <div className="fw-semibold">{customer._count.orders ?? 0} orders, {customer._count.reviews ?? 0} reviews</div>
                  </Col>
                )}
              </Row>
            </div>
          </div>
        </Block>

        {/* Orders Section */}
        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <h6 className="overline-title-alt mb-3">
                <Icon name="cart-fill" className="me-1" />
                Orders
              </h6>
              {orderLoading ? (
                <div className="text-center py-3"><Spinner size="sm" color="primary" /></div>
              ) : orders.length > 0 ? (
                <>
                  <DataTable className="border-top">
                    <DataTableBody compact>
                      <DataTableHead>
                        <DataTableRow><span className="sub-text">Order #</span></DataTableRow>
                        <DataTableRow size="md"><span className="sub-text">Order total</span></DataTableRow>
                        <DataTableRow><span className="sub-text">Order status</span></DataTableRow>
                        <DataTableRow size="md"><span className="sub-text">Type</span></DataTableRow>
                        <DataTableRow size="lg"><span className="sub-text">Created on</span></DataTableRow>
                        <DataTableRow className="text-end"><span className="sub-text">View</span></DataTableRow>
                      </DataTableHead>
                      {orders.map((o) => (
                        <DataTableItem key={o.id}>
                          <DataTableRow>
                            <Link to={`/orders/${o.id}`} className="text-primary fw-semibold">{o.id.slice(0, 8)}…</Link>
                          </DataTableRow>
                          <DataTableRow size="md">
                            <span>{fmtCurrency(o.grandTotal, o.currency)}</span>
                          </DataTableRow>
                          <DataTableRow>
                            <Badge color="outline-secondary" className="text-capitalize">{o.orderStatus?.status ?? "—"}</Badge>
                          </DataTableRow>
                          <DataTableRow size="md">
                            <span className="text-capitalize">{o.orderType || "—"}</span>
                          </DataTableRow>
                          <DataTableRow size="lg">
                            <span>{fmtDate(o.orderDate)}</span>
                          </DataTableRow>
                          <DataTableRow className="text-end">
                            <Link to={`/orders/${o.id}`} className="btn btn-sm btn-trigger"><Icon name="eye" /></Link>
                          </DataTableRow>
                        </DataTableItem>
                      ))}
                    </DataTableBody>
                  </DataTable>
                  {orderTotal > 10 && (
                    <div className="card-inner pt-0">
                      <PaginationComponent itemPerPage={10} totalItems={orderTotal} paginate={(p) => setOrderPage(p)} currentPage={orderPage} />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted text-center py-3">No orders found.</div>
              )}
            </div>
          </div>
        </Block>

        {/* Addresses Section */}
        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <h6 className="overline-title-alt mb-3">
                <Icon name="map-pin-fill" className="me-1" />
                Addresses
              </h6>
              {addressLoading ? (
                <div className="text-center py-3"><Spinner size="sm" color="primary" /></div>
              ) : addresses.length > 0 ? (
                <DataTable className="border-top">
                  <DataTableBody compact>
                    <DataTableHead>
                      <DataTableRow><span className="sub-text">Label</span></DataTableRow>
                      <DataTableRow><span className="sub-text">Address</span></DataTableRow>
                      <DataTableRow size="md"><span className="sub-text">City</span></DataTableRow>
                      <DataTableRow size="lg"><span className="sub-text">Postal Code</span></DataTableRow>
                      <DataTableRow size="lg"><span className="sub-text">Country</span></DataTableRow>
                      <DataTableRow size="sm"><span className="sub-text">Default</span></DataTableRow>
                    </DataTableHead>
                    {addresses.map((ua) => (
                      <DataTableItem key={ua.id}>
                        <DataTableRow>
                          <span className="fw-semibold">{ua.label || "—"}</span>
                        </DataTableRow>
                        <DataTableRow>
                          <span>{ua.address?.addressLine1}{ua.address?.addressLine2 ? `, ${ua.address.addressLine2}` : ""}</span>
                        </DataTableRow>
                        <DataTableRow size="md">
                          <span>{ua.address?.city}{ua.address?.region ? `, ${ua.address.region}` : ""}</span>
                        </DataTableRow>
                        <DataTableRow size="lg">
                          <span>{ua.address?.postalCode || "—"}</span>
                        </DataTableRow>
                        <DataTableRow size="lg">
                          <span>{ua.address?.country?.name || "—"}</span>
                        </DataTableRow>
                        <DataTableRow size="sm">
                          {ua.isDefault ? <Icon name="check-circle-fill" className="text-success" /> : <span className="text-muted">—</span>}
                        </DataTableRow>
                      </DataTableItem>
                    ))}
                  </DataTableBody>
                </DataTable>
              ) : (
                <div className="text-muted text-center py-3">No addresses on file.</div>
              )}
            </div>
          </div>
        </Block>

        {/* Contact Preferences */}
        {customer.contactPreference && (
          <Block>
            <div className="card card-bordered">
              <div className="card-inner">
                <h6 className="overline-title-alt mb-3">
                  <Icon name="mail-fill" className="me-1" />
                  Contact Preferences
                </h6>
                <Row className="g-3">
                  <Col md={3}>
                    <span className="text-muted small">Email opt-in</span>
                    <div>{customer.contactPreference.optInEmail ? <Badge color="success">Yes</Badge> : <Badge color="light">No</Badge>}</div>
                  </Col>
                  <Col md={3}>
                    <span className="text-muted small">SMS opt-in</span>
                    <div>{customer.contactPreference.optInSms ? <Badge color="success">Yes</Badge> : <Badge color="light">No</Badge>}</div>
                  </Col>
                  <Col md={3}>
                    <span className="text-muted small">SMS phone</span>
                    <div>{customer.contactPreference.smsPhone || "—"}</div>
                  </Col>
                  <Col md={3}>
                    <span className="text-muted small">Preferred language</span>
                    <div>{customer.contactPreference.preferredLanguage || "—"}</div>
                  </Col>
                </Row>
              </div>
            </div>
          </Block>
        )}

        {/* Activity Log */}
        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <h6 className="overline-title-alt mb-3">
                <Icon name="activity-round-fill" className="me-1" />
                Activity log
                {activityTotal > 0 && <span className="text-muted ms-2">({activityTotal})</span>}
              </h6>
              {activityLoading ? (
                <div className="text-center py-3"><Spinner size="sm" color="primary" /></div>
              ) : activityLogs.length > 0 ? (
                <>
                  <div className="timeline">
                    {activityLogs.map((log) => {
                      const isExpanded = expandedLog === log.id;
                      const actionColor =
                        log.action?.toLowerCase().includes("delete") ? "danger" :
                        log.action?.toLowerCase().includes("create") ? "success" :
                        log.action?.toLowerCase().includes("login") ? "info" :
                        "primary";
                      const actionIcon =
                        log.action?.toLowerCase().includes("delete") ? "trash" :
                        log.action?.toLowerCase().includes("create") ? "plus-circle" :
                        log.action?.toLowerCase().includes("update") ? "edit" :
                        log.action?.toLowerCase().includes("login") ? "signin" :
                        log.action?.toLowerCase().includes("logout") ? "signout" :
                        "activity-round";
                      let parsedBefore = null;
                      let parsedAfter = null;
                      try { parsedBefore = log.beforeJson ? JSON.parse(log.beforeJson) : null; } catch {}
                      try { parsedAfter = log.afterJson ? JSON.parse(log.afterJson) : null; } catch {}
                      const hasChanges = parsedBefore || parsedAfter;

                      return (
                        <div key={log.id} className="timeline-item pb-3">
                          <div className="d-flex align-items-start">
                            <div className={`timeline-status bg-${actionColor} rounded-circle d-flex align-items-center justify-content-center`}
                              style={{ width: 32, height: 32, minWidth: 32, marginRight: 12 }}>
                              <Icon name={actionIcon} style={{ color: "#fff", fontSize: 14 }} />
                            </div>
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <Badge color={actionColor} className="me-2 text-capitalize">
                                    {(log.action || "unknown").replace(/_/g, " ")}
                                  </Badge>
                                  {log.entityType && (
                                    <span className="text-muted small">
                                      on <strong>{log.entityType}</strong>
                                      {log.entityId && <span className="ms-1">({log.entityId.slice(0, 8)}…)</span>}
                                    </span>
                                  )}
                                </div>
                                <span className="text-muted small text-nowrap ms-2">{fmtDate(log.createdAt)}</span>
                              </div>
                              {log.ip && (
                                <div className="text-muted small mt-1">
                                  <Icon name="globe" className="me-1" style={{ fontSize: 11 }} />
                                  IP: {log.ip}
                                  {log.userAgent && (
                                    <span className="ms-2" title={log.userAgent}>
                                      <Icon name="monitor" className="me-1" style={{ fontSize: 11 }} />
                                      {log.userAgent.length > 60 ? log.userAgent.slice(0, 60) + "…" : log.userAgent}
                                    </span>
                                  )}
                                </div>
                              )}
                              {hasChanges && (
                                <div className="mt-1">
                                  <a href="#toggle" className="small text-primary" onClick={(e) => {
                                    e.preventDefault();
                                    setExpandedLog(isExpanded ? null : log.id);
                                  }}>
                                    <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="me-1" />
                                    {isExpanded ? "Hide changes" : "Show changes"}
                                  </a>
                                  {isExpanded && (
                                    <div className="mt-2 p-2 bg-lighter rounded" style={{ fontSize: "0.8rem" }}>
                                      {parsedBefore && parsedAfter ? (
                                        <div className="row g-2">
                                          <div className="col-md-6">
                                            <div className="fw-bold text-muted mb-1">Before</div>
                                            <pre className="mb-0" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflow: "auto" }}>
                                              {JSON.stringify(parsedBefore, null, 2)}
                                            </pre>
                                          </div>
                                          <div className="col-md-6">
                                            <div className="fw-bold text-muted mb-1">After</div>
                                            <pre className="mb-0" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflow: "auto" }}>
                                              {JSON.stringify(parsedAfter, null, 2)}
                                            </pre>
                                          </div>
                                        </div>
                                      ) : parsedAfter ? (
                                        <div>
                                          <div className="fw-bold text-muted mb-1">Details</div>
                                          <pre className="mb-0" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflow: "auto" }}>
                                            {JSON.stringify(parsedAfter, null, 2)}
                                          </pre>
                                        </div>
                                      ) : parsedBefore ? (
                                        <div>
                                          <div className="fw-bold text-muted mb-1">Previous state</div>
                                          <pre className="mb-0" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflow: "auto" }}>
                                            {JSON.stringify(parsedBefore, null, 2)}
                                          </pre>
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {activityTotal > 10 && (
                    <div className="card-inner pt-0">
                      <PaginationComponent itemPerPage={10} totalItems={activityTotal} paginate={(p) => setActivityPage(p)} currentPage={activityPage} />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted text-center py-3">No activity recorded for this customer.</div>
              )}
            </div>
          </div>
        </Block>
      </Content>
    </React.Fragment>
  );
};

export default AdminCustomerDetail;
