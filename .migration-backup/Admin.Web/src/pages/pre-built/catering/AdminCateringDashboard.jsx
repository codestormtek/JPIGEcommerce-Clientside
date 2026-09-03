import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalHeader, Spinner, Alert, Badge, Input } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPatch, apiDelete } from "@/utils/apiClient";

const STATUS_COLORS = {
  DRAFT: "light",
  PENDING: "warning",
  QUOTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CONVERTED: "primary",
  EXPIRED: "secondary",
};

const STATUS_OPTIONS = ["DRAFT", "PENDING", "QUOTED", "APPROVED", "REJECTED", "CONVERTED", "EXPIRED"];

const STATUS_TRANSITIONS = {
  DRAFT: ["PENDING"],
  PENDING: ["QUOTED", "REJECTED"],
  QUOTED: ["APPROVED", "REJECTED"],
  APPROVED: ["CONVERTED", "REJECTED"],
  REJECTED: [],
  CONVERTED: [],
  EXPIRED: [],
};

const formatCurrency = (val) => {
  const num = Number(val);
  return isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`;
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const AdminCateringDashboard = () => {
  const [stats, setStats] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [quotesTotal, setQuotesTotal] = useState(0);
  const [quotesPage, setQuotesPage] = useState(1);
  const [quotesTotalPages, setQuotesTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [production, setProduction] = useState([]);
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loadingProduction, setLoadingProduction] = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiGet("/catering/dashboard");
      setStats(res?.data ?? res);
    } catch {}
  }, []);

  const loadQuotes = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");
      params.set("orderBy", "createdAt");
      params.set("order", "desc");
      if (searchText) params.set("search", searchText);
      if (filterStatus) params.set("status", filterStatus);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const res = await apiGet(`/catering/quotes?${params.toString()}`);
      setQuotes(res?.data ?? []);
      setQuotesTotal(res?.meta?.total ?? res?.total ?? 0);
      setQuotesPage(res?.meta?.page ?? res?.page ?? page);
      setQuotesTotalPages(res?.meta?.totalPages ?? res?.totalPages ?? 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [searchText, filterStatus, filterDateFrom, filterDateTo]);

  const loadProduction = useCallback(async (date) => {
    setLoadingProduction(true);
    try {
      const res = await apiGet(`/catering/production?date=${date}`);
      setProduction(res?.data ?? []);
    } catch {
      setProduction([]);
    } finally {
      setLoadingProduction(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadQuotes(1);
  }, [loadStats, loadQuotes]);

  useEffect(() => {
    loadProduction(productionDate);
  }, [productionDate, loadProduction]);

  const openDetail = async (quote) => {
    setDetailModal(true);
    setLoadingDetail(true);
    setAdminNotes(quote.adminNotes || "");
    try {
      const res = await apiGet(`/catering/quotes/${quote.id}`);
      setSelectedQuote(res?.data ?? res);
      setAdminNotes((res?.data ?? res)?.adminNotes || "");
    } catch {
      setSelectedQuote(quote);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedQuote) return;
    setSavingStatus(true);
    try {
      const body = { status: newStatus, adminNotes: adminNotes || null };
      const res = await apiPatch(`/catering/quotes/${selectedQuote.id}`, body);
      const updated = res?.data ?? res;
      setSelectedQuote(updated);
      setSuccess(`Quote status updated to ${newStatus}`);
      loadStats();
      loadQuotes(quotesPage);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedQuote) return;
    setSavingStatus(true);
    try {
      const res = await apiPatch(`/catering/quotes/${selectedQuote.id}`, { adminNotes: adminNotes || null });
      setSelectedQuote(res?.data ?? res);
      setSuccess("Notes saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const openDelete = (q) => {
    setDeleteTarget(q);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/catering/quotes/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setSuccess("Quote deleted.");
      loadStats();
      loadQuotes(quotesPage);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const applyFilters = () => {
    loadQuotes(1);
  };

  const clearFilters = () => {
    setSearchText("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setTimeout(() => loadQuotes(1), 0);
  };

  const transitions = selectedQuote ? (STATUS_TRANSITIONS[selectedQuote.status] || []) : [];

  return (
    <>
      <Head title="Catering Dashboard" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Catering Dashboard</BlockTitle>
              <BlockDes className="text-soft">
                <p>Overview of catering quotes, events, and production.</p>
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" className="mb-3" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>{success}</Alert>}

        <Block>
          <Row className="g-gs">
            <Col sm="6" lg="3">
              <div className="card card-bordered">
                <div className="card-inner">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0" style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff3cd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="file-text" style={{ fontSize: 22, color: "#e09200" }} />
                    </div>
                    <div className="ms-3">
                      <h6 className="mb-0 text-soft fs-12px text-uppercase">Pending Quotes</h6>
                      <h4 className="mb-0">{stats?.pendingQuotes ?? "—"}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col sm="6" lg="3">
              <div className="card card-bordered">
                <div className="card-inner">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0" style={{ width: 48, height: 48, borderRadius: "50%", background: "#d4edda", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="calendar" style={{ fontSize: 22, color: "#28a745" }} />
                    </div>
                    <div className="ms-3">
                      <h6 className="mb-0 text-soft fs-12px text-uppercase">Booked Events</h6>
                      <h4 className="mb-0">{stats?.bookedEvents ?? "—"}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col sm="6" lg="3">
              <div className="card card-bordered">
                <div className="card-inner">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0" style={{ width: 48, height: 48, borderRadius: "50%", background: "#cce5ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="sign-dollar" style={{ fontSize: 22, color: "#0069d9" }} />
                    </div>
                    <div className="ms-3">
                      <h6 className="mb-0 text-soft fs-12px text-uppercase">Projected Revenue</h6>
                      <h4 className="mb-0">{stats ? formatCurrency(stats.projectedRevenue) : "—"}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col sm="6" lg="3">
              <div className="card card-bordered">
                <div className="card-inner">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0" style={{ width: 48, height: 48, borderRadius: "50%", background: "#e2d9f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="package" style={{ fontSize: 22, color: "#6f42c1" }} />
                    </div>
                    <div className="ms-3">
                      <h6 className="mb-0 text-soft fs-12px text-uppercase">Kitchen Prep Items</h6>
                      <h4 className="mb-0">{stats?.prepItems ?? "—"}</h4>
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
                <h6 className="mb-0">Quote / Order Queue</h6>
              </div>

              <Row className="g-3 mb-3">
                <Col md="3">
                  <Input
                    type="text"
                    placeholder="Search name, email, quote #..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  />
                </Col>
                <Col md="2">
                  <Input type="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Input>
                </Col>
                <Col md="2">
                  <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} placeholder="From date" />
                </Col>
                <Col md="2">
                  <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} placeholder="To date" />
                </Col>
                <Col md="3">
                  <div className="d-flex gap-2">
                    <Button color="primary" size="sm" onClick={applyFilters}>
                      <Icon name="search" /> Filter
                    </Button>
                    <Button color="light" size="sm" onClick={clearFilters}>
                      Clear
                    </Button>
                  </div>
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-4"><Spinner /></div>
              ) : quotes.length === 0 ? (
                <div className="text-center text-soft py-4">No quotes found.</div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Quote #</th>
                          <th>Customer / Event</th>
                          <th>Event Date</th>
                          <th>Guests</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotes.map((q) => (
                          <tr key={q.id}>
                            <td className="fw-bold">{q.quoteNumber}</td>
                            <td>
                              <div>{q.customerName}</div>
                              <small className="text-soft">{q.customerEmail}</small>
                              {q.eventType && <small className="text-soft d-block">{q.eventType}</small>}
                            </td>
                            <td>{formatDate(q.eventDate)}</td>
                            <td>{q.guestCount}</td>
                            <td>{formatCurrency(q.totalEstimate)}</td>
                            <td>
                              <Badge color={STATUS_COLORS[q.status] || "light"}>{q.status}</Badge>
                            </td>
                            <td>{formatDate(q.createdAt)}</td>
                            <td className="text-end">
                              <div className="d-flex gap-1 justify-content-end">
                                <Button size="sm" outline color="primary" onClick={() => openDetail(q)} title="View details">
                                  <Icon name="eye" />
                                </Button>
                                <Button size="sm" outline color="danger" onClick={() => openDelete(q)} title="Delete">
                                  <Icon name="trash" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {quotesTotalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="text-soft fs-12px">
                        Showing page {quotesPage} of {quotesTotalPages} ({quotesTotal} quotes)
                      </span>
                      <div className="d-flex gap-2">
                        <Button size="sm" color="light" disabled={quotesPage <= 1} onClick={() => loadQuotes(quotesPage - 1)}>
                          <Icon name="chevron-left" /> Prev
                        </Button>
                        <Button size="sm" color="light" disabled={quotesPage >= quotesTotalPages} onClick={() => loadQuotes(quotesPage + 1)}>
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

        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h6 className="mb-0">Production Summary</h6>
                <Input
                  type="date"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  style={{ width: 200 }}
                />
              </div>
              {loadingProduction ? (
                <div className="text-center py-3"><Spinner size="sm" /></div>
              ) : production.length === 0 ? (
                <div className="text-center text-soft py-3">No production items for this date.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Total Qty</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {production.map((item, idx) => (
                        <tr key={idx}>
                          <td className="fw-bold">{item.name}</td>
                          <td><Badge color="outline-secondary" className="text-uppercase" style={{ fontSize: 10 }}>{item.category}</Badge></td>
                          <td>{item.totalQty}</td>
                          <td>{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Block>

        <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} size="lg">
          <ModalHeader toggle={() => setDetailModal(false)}>
            Quote Detail {selectedQuote ? `— ${selectedQuote.quoteNumber}` : ""}
          </ModalHeader>
          <ModalBody>
            {loadingDetail ? (
              <div className="text-center py-4"><Spinner /></div>
            ) : selectedQuote ? (
              <>
                <Row className="g-3 mb-4">
                  <Col md="6">
                    <h6 className="text-soft mb-1">Customer</h6>
                    <div className="fw-bold">{selectedQuote.customerName}</div>
                    <div>{selectedQuote.customerEmail}</div>
                    {selectedQuote.customerPhone && <div>{selectedQuote.customerPhone}</div>}
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Status</h6>
                    <Badge color={STATUS_COLORS[selectedQuote.status] || "light"} className="fs-14px">
                      {selectedQuote.status}
                    </Badge>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Quote #</h6>
                    <div className="fw-bold">{selectedQuote.quoteNumber}</div>
                  </Col>
                </Row>

                <Row className="g-3 mb-4">
                  <Col md="3">
                    <h6 className="text-soft mb-1">Event Date</h6>
                    <div>{formatDate(selectedQuote.eventDate)}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Event Time</h6>
                    <div>{selectedQuote.eventTime || "—"}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Event Type</h6>
                    <div>{selectedQuote.eventType || "—"}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Guests</h6>
                    <div>{selectedQuote.guestCount}</div>
                  </Col>
                </Row>

                <Row className="g-3 mb-4">
                  <Col md="3">
                    <h6 className="text-soft mb-1">Appetite</h6>
                    <div>{selectedQuote.appetiteLevel || "—"}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Service Style</h6>
                    <div>{selectedQuote.serviceStyle || "—"}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Setup Requested</h6>
                    <div>{selectedQuote.setupRequested ? "Yes" : "No"}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Disposable Kit</h6>
                    <div>{selectedQuote.disposableKit ? "Yes" : "No"}</div>
                  </Col>
                </Row>

                {(selectedQuote.deliveryAddress || selectedQuote.deliveryZip) && (
                  <Row className="g-3 mb-4">
                    <Col md="6">
                      <h6 className="text-soft mb-1">Delivery Address</h6>
                      <div>{selectedQuote.deliveryAddress || "—"}</div>
                    </Col>
                    <Col md="3">
                      <h6 className="text-soft mb-1">ZIP</h6>
                      <div>{selectedQuote.deliveryZip || "—"}</div>
                    </Col>
                    <Col md="3">
                      <h6 className="text-soft mb-1">Delivery Notes</h6>
                      <div>{selectedQuote.deliveryNotes || "—"}</div>
                    </Col>
                  </Row>
                )}

                {selectedQuote.allergyNotes && (
                  <div className="mb-4">
                    <h6 className="text-soft mb-1">Allergy Notes</h6>
                    <div className="text-danger">{selectedQuote.allergyNotes}</div>
                  </div>
                )}

                <div className="mb-4">
                  <h6 className="mb-2">Line Items</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Unit Price</th>
                          <th>Line Total</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedQuote.items || []).map((item) => (
                          <tr key={item.id}>
                            <td>
                              {item.itemName}
                              {item.isPackageItem && <Badge color="outline-info" className="ms-1" style={{ fontSize: 9 }}>PKG</Badge>}
                            </td>
                            <td>{Number(item.quantity)}</td>
                            <td>{item.unitOfMeasure}</td>
                            <td>{formatCurrency(item.unitPrice)}</td>
                            <td>{formatCurrency(item.lineTotal)}</td>
                            <td>{item.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Row className="g-3 mb-4">
                  <Col md="3">
                    <h6 className="text-soft mb-1">Food Subtotal</h6>
                    <div className="fw-bold">{formatCurrency(selectedQuote.foodSubtotal)}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Delivery Fee</h6>
                    <div>{formatCurrency(selectedQuote.deliveryFee)}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Setup Fee</h6>
                    <div>{formatCurrency(selectedQuote.setupFee)}</div>
                  </Col>
                  <Col md="3">
                    <h6 className="text-soft mb-1">Total Estimate</h6>
                    <div className="fw-bold fs-18px">{formatCurrency(selectedQuote.totalEstimate)}</div>
                  </Col>
                </Row>

                <div className="mb-4">
                  <h6 className="mb-2">Admin Notes</h6>
                  <Input
                    type="textarea"
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this quote..."
                  />
                  <Button size="sm" color="light" className="mt-2" onClick={saveNotes} disabled={savingStatus}>
                    {savingStatus ? <Spinner size="sm" /> : "Save Notes"}
                  </Button>
                </div>

                {transitions.length > 0 && (
                  <div className="mb-3">
                    <h6 className="mb-2">Status Actions</h6>
                    <div className="d-flex gap-2 flex-wrap">
                      {transitions.map((t) => (
                        <Button
                          key={t}
                          color={STATUS_COLORS[t] || "primary"}
                          onClick={() => handleStatusChange(t)}
                          disabled={savingStatus}
                        >
                          {savingStatus ? <Spinner size="sm" /> : t === "QUOTED" ? "Send Quote" : t === "APPROVED" ? "Approve" : t === "CONVERTED" ? "Convert to Order" : t === "REJECTED" ? "Reject" : t}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-soft fs-12px">
                  Created: {formatDateTime(selectedQuote.createdAt)} | Updated: {formatDateTime(selectedQuote.updatedAt)}
                  {selectedQuote.expiresAt && <> | Expires: {formatDateTime(selectedQuote.expiresAt)}</>}
                </div>
              </>
            ) : null}
          </ModalBody>
        </Modal>

        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
          <ModalHeader toggle={() => setDeleteModal(false)}>Delete Quote</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to delete quote <strong>{deleteTarget?.quoteNumber}</strong>?</p>
            <div className="d-flex gap-2 justify-content-end">
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
              <Button color="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <Spinner size="sm" /> : "Delete"}
              </Button>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </>
  );
};

export default AdminCateringDashboard;
