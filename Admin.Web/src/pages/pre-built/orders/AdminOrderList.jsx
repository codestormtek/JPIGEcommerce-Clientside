import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, getAccessToken } from "@/utils/apiClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPrice = (p) => `$${Number(p ?? 0).toFixed(2)}`;
const fmtDate  = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const shortId  = (id = "") => id.slice(-8).toUpperCase();

const ORDER_STATUS_COLORS = {
  pending:    "warning",
  processing: "info",
  complete:   "success",
  completed:  "success",
  cancelled:  "danger",
  refunded:   "secondary",
};
const PAYMENT_STATUS_COLORS = {
  authorized: "info",
  captured:   "success",
  paid:       "success",
  failed:     "danger",
  refunded:   "secondary",
  pending:    "warning",
};
const SHIP_STATUS_COLORS = {
  pending:   "warning",
  shipped:   "info",
  delivered: "success",
  cancelled: "danger",
};

const statusBadge = (status, map) => {
  const color = map[status?.toLowerCase()] ?? "secondary";
  return <Badge color={color} className="badge-sm text-capitalize">{status ?? "—"}</Badge>;
};

const SortIcon = ({ field, sortField, sort }) => (
  <Icon name={sortField === field ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
);

// ─── Component ────────────────────────────────────────────────────────────────

const AdminOrderList = () => {
  // List state
  const [orders,      setOrders]      = useState([]);
  const [totalItems,  setTotalItems]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [sort,        setSort]        = useState("desc");
  const [sortField,   setSortField]   = useState("orderDate");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchText,  setSearchText]  = useState("");

  // Filters
  const [statusFilter,    setStatusFilter]    = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const [statuses,        setStatuses]        = useState([]);  // [{id, status}]

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Update-status modal
  const [statusModal,   setStatusModal]   = useState(false);
  const [statusTarget,  setStatusTarget]  = useState(null);
  const [newStatusId,   setNewStatusId]   = useState("");
  const [statusSaving,  setStatusSaving]  = useState(false);
  const [statusError,   setStatusError]   = useState(null);

  // Invoice modal
  const [invoiceModal,   setInvoiceModal]   = useState(false);
  const [invoiceOrder,   setInvoiceOrder]   = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Email invoice modal
  const [emailModal,   setEmailModal]   = useState(false);
  const [emailTo,      setEmailTo]      = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError,   setEmailError]   = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Export
  const [exporting,   setExporting]   = useState(false);
  const [exportError, setExportError] = useState(null);

  const searchTimer = useRef(null);

  // ─── Load orders ────────────────────────────────────────────────────────────

  const loadOrders = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const opts = {
        page:    currentPage,
        limit:   itemPerPage,
        order:   sort,
        orderBy: sortField,
        ...(statusFilter    ? { statusId:  statusFilter }    : {}),
        ...(orderTypeFilter ? { orderType: orderTypeFilter } : {}),
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/orders/admin?${qs}`);
      setOrders(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, sortField, statusFilter, orderTypeFilter]);

  // Load statuses on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet("/orders/statuses");
        setStatuses(Array.isArray(res) ? res : (res?.data ?? []));
      } catch { /* non-fatal */ }
    })();
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const paginate    = (p) => setCurrentPage(p);
  const onSortClick = (field) => {
    if (sortField === field) setSort((s) => s === "asc" ? "desc" : "asc");
    else { setSortField(field); setSort("desc"); }
    setCurrentPage(1);
  };

  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setCurrentPage(1), 400);
  };

  const openDetail = async (order) => {
    setDetailModal(true);
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const res = await apiGet(`/orders/admin/${order.id}`);
      setDetailOrder(res?.data ?? res);
    } catch { setDetailOrder(order); }
    finally { setDetailLoading(false); }
  };

  const openStatusModal = (order) => {
    setStatusTarget(order);
    setNewStatusId(order.orderStatusId ?? "");
    setStatusError(null);
    setStatusModal(true);
  };

  const doExport = async (format) => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await apiPost("/exports", { entity: "orders", format });
      const jobId = res?.data?.id ?? res?.id;
      let status = "pending";
      let attempts = 0;
      while (status !== "done" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await apiGet(`/exports/${jobId}`);
        status = poll?.data?.status ?? poll?.status;
        attempts++;
      }
      if (status !== "done") throw new Error("Export timed out");
      const token = getAccessToken();
      const dl = await fetch(`/api/v1/exports/${jobId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!dl.ok) throw new Error("Download failed");
      const blob = await dl.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e.message);
    } finally {
      setExporting(false);
    }
  };

  const openInvoice = async (order) => {
    setInvoiceModal(true);
    setInvoiceLoading(true);
    setInvoiceOrder(null);
    try {
      const res = await apiGet(`/orders/admin/${order.id}`);
      setInvoiceOrder(res?.data ?? res);
    } catch { setInvoiceOrder(order); }
    finally { setInvoiceLoading(false); }
  };

  const printInvoice = () => {
    const style = document.createElement("style");
    style.id = "invoice-print-style";
    style.innerHTML = `@media print {
      body * { visibility: hidden !important; }
      #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
      #invoice-print-area { position: fixed; left: 0; top: 0; width: 100%; z-index: 9999; background: white; }
      .no-print { display: none !important; }
    }`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("invoice-print-style");
      if (el) el.remove();
    }, 1000);
  };

  const doEmailInvoice = async () => {
    if (!emailTo || !invoiceOrder) return;
    setEmailSending(true);
    setEmailError(null);
    setEmailSuccess(false);
    try {
      await apiPost(`/orders/admin/${invoiceOrder.id}/email-invoice`, { emailTo });
      setEmailSuccess(true);
      setTimeout(() => { setEmailModal(false); setEmailSuccess(false); }, 2000);
    } catch (e) {
      setEmailError(e.message);
    } finally {
      setEmailSending(false);
    }
  };

  const doUpdateStatus = async () => {
    if (!newStatusId || !statusTarget) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      await apiPatch(`/orders/admin/${statusTarget.id}/status`, { statusId: newStatusId });
      setStatusModal(false);
      loadOrders();
    } catch (e) {
      setStatusError(e.message);
    } finally {
      setStatusSaving(false);
    }
  };

  // Filter displayed rows by search text (client-side on current page)
  const displayedOrders = searchText
    ? orders.filter((o) => {
        const q = searchText.toLowerCase();
        const customer = `${o.user?.firstName ?? ""} ${o.user?.lastName ?? ""} ${o.user?.emailAddress ?? ""}`.toLowerCase();
        return shortId(o.id).toLowerCase().includes(q) || customer.includes(q);
      })
    : orders;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <Head title="Orders" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Orders</BlockTitle>
              <BlockDes className="text-soft">
                <p>You have a total of {totalItems} orders.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <div className="toggle-expand-content">
                  <ul className="nk-block-tools g-3">
                    {exportError && <li><span className="text-danger small">{exportError}</span></li>}
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-white btn-outline-light" disabled={exporting}>
                          {exporting ? <Spinner size="sm" /> : <Icon name="download-cloud" />}
                          <span>Export</span>
                        </DropdownToggle>
                        <DropdownMenu end>
                          <ul className="link-list-opt no-bdr">
                            <li><DropdownItem onClick={() => doExport("csv")}><Icon name="file-text" /><span>CSV</span></DropdownItem></li>
                            <li><DropdownItem onClick={() => doExport("xlsx")}><Icon name="file-sheets" /><span>Excel</span></DropdownItem></li>
                            <li><DropdownItem onClick={() => doExport("pdf")}><Icon name="file-pdf" /><span>PDF</span></DropdownItem></li>
                            <li><DropdownItem onClick={() => doExport("txt")}><Icon name="file-text-fill" /><span>Text</span></DropdownItem></li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {error && <div className="alert alert-danger">{error}</div>}
          <DataTable className="card-stretch">
            {/* Toolbar */}
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools">
                  <div className="d-flex g-2 flex-wrap">
                    {/* Status filter */}
                    <div style={{ minWidth: 160 }}>
                      <select
                        className="form-select form-select-sm"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                      >
                        <option value="">All Statuses</option>
                        {statuses.map((s) => (
                          <option key={s.id} value={s.id}>{s.status}</option>
                        ))}
                      </select>
                    </div>
                    {/* Order type filter */}
                    <div style={{ minWidth: 140 }}>
                      <select
                        className="form-select form-select-sm"
                        value={orderTypeFilter}
                        onChange={(e) => { setOrderTypeFilter(e.target.value); setCurrentPage(1); }}
                      >
                        <option value="">All Types</option>
                        <option value="retail">Retail</option>
                        <option value="catering">Catering</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="card-tools me-n1">
                  <ul className="btn-toolbar gx-1">
                    <li>
                      <Button className="btn-icon search-toggle toggle-search" onClick={() => setSearchOpen((s) => !s)}>
                        <Icon name="search" />
                      </Button>
                    </li>
                    <li className="btn-toolbar-sep" />
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                          <Icon name="setting" />
                        </DropdownToggle>
                        <DropdownMenu end className="dropdown-menu-xs">
                          <ul className="link-check">
                            <li><span>Show</span></li>
                            {[10, 25, 50].map((n) => (
                              <li key={n} className={itemPerPage === n ? "active" : ""}>
                                <DropdownItem onClick={() => { setItemPerPage(n); setCurrentPage(1); }}>{n}</DropdownItem>
                              </li>
                            ))}
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                  </ul>
                </div>
              </div>
              {searchOpen && (
                <div className="card-search search-wrap active">
                  <div className="card-body">
                    <div className="search-content">
                      <Button className="search-back btn-icon toggle-search" onClick={() => { setSearchOpen(false); setSearchText(""); }}>
                        <Icon name="arrow-left" />
                      </Button>
                      <input
                        type="text"
                        className="border-transparent form-focus-none form-control"
                        placeholder="Search by order # or customer..."
                        value={searchText}
                        onChange={onSearchChange}
                      />
                      <Button className="search-submit btn-icon"><Icon name="search" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <DataTableBody>
              <DataTableHead>
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("orderDate")}>
                    Order # <SortIcon field="orderDate" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Order Status</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Payment</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Shipping</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">Customer</span></DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("orderDate")}>
                    Created On <SortIcon field="orderDate" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("grandTotal")}>
                    Order Total <SortIcon field="grandTotal" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Type</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={9} className="text-center py-4"><Spinner /></td></tr>
              ) : displayedOrders.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-4 text-muted">No orders found.</td></tr>
              ) : displayedOrders.map((order) => {
                const paymentStatus = order.payments?.[0]?.status ?? null;
                const shipStatus    = order.shipment?.status ?? null;
                const customer      = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <DataTableItem key={order.id}>
                    <DataTableRow>
                      <span className="tb-lead">#{shortId(order.id)}</span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      {statusBadge(order.orderStatus?.status, ORDER_STATUS_COLORS)}
                    </DataTableRow>
                    <DataTableRow size="md">
                      {paymentStatus ? statusBadge(paymentStatus, PAYMENT_STATUS_COLORS) : <span className="text-soft">—</span>}
                    </DataTableRow>
                    <DataTableRow size="md">
                      {shipStatus ? statusBadge(shipStatus, SHIP_STATUS_COLORS) : <span className="text-soft">—</span>}
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <div>
                        <span className="tb-lead">{customer}</span>
                        <span className="d-block text-soft small">{order.user?.emailAddress ?? ""}</span>
                      </div>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className="text-soft">{fmtDate(order.orderDate)}</span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <span className="tb-lead">{fmtPrice(order.grandTotal)}</span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <Badge color="outline-secondary" className="badge-sm text-capitalize">{order.orderType ?? "—"}</Badge>
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools text-end">
                      <ul className="nk-tb-actions gx-1">
                        <li>
                          <UncontrolledDropdown>
                            <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger">
                              <Icon name="more-h" />
                            </DropdownToggle>
                            <DropdownMenu end>
                              <ul className="link-list-opt no-bdr">
                                <li><DropdownItem onClick={() => openDetail(order)}><Icon name="eye" /><span>Detail View</span></DropdownItem></li>
                                <li><DropdownItem onClick={() => openStatusModal(order)}><Icon name="edit" /><span>Update Status</span></DropdownItem></li>
                                <li><DropdownItem onClick={() => openInvoice(order)}><Icon name="file-text" /><span>Invoice</span></DropdownItem></li>
                              </ul>
                            </DropdownMenu>
                          </UncontrolledDropdown>
                        </li>
                      </ul>
                    </DataTableRow>
                  </DataTableItem>
                );
              })}
            </DataTableBody>

            <div className="card-inner">
              {totalItems > 0 && (
                <PaginationComponent
                  itemPerPage={itemPerPage}
                  totalItems={totalItems}
                  paginate={paginate}
                  currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Detail Modal ────────────────────────────────────────────────── */}
        <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} size="xl">
          <ModalHeader toggle={() => setDetailModal(false)}>
            Order Detail {detailOrder ? `#${shortId(detailOrder.id)}` : ""}
          </ModalHeader>
          <ModalBody>
            {detailLoading && <div className="text-center py-4"><Spinner /></div>}
            {!detailLoading && detailOrder && (
              <div>
                {/* Summary row */}
                <Row className="g-3 mb-4">
                  <Col md="3">
                    <div className="data-label">Order Status</div>
                    <div className="data-value">{statusBadge(detailOrder.orderStatus?.status, ORDER_STATUS_COLORS)}</div>
                  </Col>
                  <Col md="3">
                    <div className="data-label">Payment Status</div>
                    <div className="data-value">{statusBadge(detailOrder.payments?.[0]?.status, PAYMENT_STATUS_COLORS)}</div>
                  </Col>
                  <Col md="3">
                    <div className="data-label">Shipping Status</div>
                    <div className="data-value">{statusBadge(detailOrder.shipment?.status, SHIP_STATUS_COLORS)}</div>
                  </Col>
                  <Col md="3">
                    <div className="data-label">Order Type</div>
                    <div className="data-value text-capitalize">{detailOrder.orderType ?? "—"}</div>
                  </Col>
                  <Col md="3">
                    <div className="data-label">Customer</div>
                    <div className="data-value">
                      {[detailOrder.user?.firstName, detailOrder.user?.lastName].filter(Boolean).join(" ") || "—"}
                      <span className="d-block text-soft small">{detailOrder.user?.emailAddress ?? ""}</span>
                    </div>
                  </Col>
                  <Col md="3">
                    <div className="data-label">Order Date</div>
                    <div className="data-value">{fmtDate(detailOrder.orderDate)}</div>
                  </Col>
                  <Col md="3">
                    <div className="data-label">Shipping Method</div>
                    <div className="data-value">{detailOrder.shippingMethod?.name ?? "—"}</div>
                  </Col>
                  {detailOrder.shipment?.trackingNumber && (
                    <Col md="3">
                      <div className="data-label">Tracking #</div>
                      <div className="data-value">{detailOrder.shipment.trackingNumber}</div>
                    </Col>
                  )}
                </Row>

                {/* Line items */}
                <h6 className="overline-title text-base mb-2">Order Lines</h6>
                <table className="table table-bordered table-sm mb-4">
                  <thead className="table-light">
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailOrder.lines ?? []).map((line) => (
                      <tr key={line.id}>
                        <td>{line.productNameSnapshot || line.productItem?.product?.name || "—"}</td>
                        <td className="text-soft">{line.skuSnapshot || line.productItem?.sku || "—"}</td>
                        <td className="text-end">{fmtPrice(line.unitPriceSnapshot)}</td>
                        <td className="text-center">{line.qty}</td>
                        <td className="text-end">{fmtPrice(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <Row className="justify-content-end mb-4">
                  <Col md="4">
                    <table className="table table-sm">
                      <tbody>
                        <tr><td>Subtotal</td><td className="text-end">{fmtPrice(detailOrder.subtotal)}</td></tr>
                        <tr><td>Discount</td><td className="text-end">-{fmtPrice(detailOrder.discountTotal)}</td></tr>
                        <tr><td>Tax</td><td className="text-end">{fmtPrice(detailOrder.taxTotal)}</td></tr>
                        <tr><td>Shipping</td><td className="text-end">{fmtPrice(detailOrder.shippingTotal)}</td></tr>
                        <tr className="fw-bold"><td>Grand Total</td><td className="text-end">{fmtPrice(detailOrder.grandTotal)}</td></tr>
                      </tbody>
                    </table>
                  </Col>
                </Row>

                {/* Addresses */}
                {(detailOrder.addresses ?? []).length > 0 && (
                  <>
                    <h6 className="overline-title text-base mb-2">Addresses</h6>
                    <Row className="g-3 mb-4">
                      {detailOrder.addresses.map((addr) => (
                        <Col md="4" key={addr.id}>
                          <div className="card card-bordered p-3">
                            <div className="text-soft small text-capitalize mb-1">{addr.addressType ?? "Address"}</div>
                            <div>{addr.line1}</div>
                            {addr.line2 && <div>{addr.line2}</div>}
                            <div>{[addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}</div>
                            <div>{addr.country}</div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </>
                )}

                {/* Special instructions */}
                {detailOrder.specialInstructions && (
                  <div className="mb-3">
                    <h6 className="overline-title text-base mb-1">Special Instructions</h6>
                    <p className="text-soft">{detailOrder.specialInstructions}</p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
        </Modal>

        {/* ── Update Status Modal ─────────────────────────────────────────── */}
        <Modal isOpen={statusModal} toggle={() => setStatusModal(false)} size="sm">
          <ModalHeader toggle={() => setStatusModal(false)}>Update Order Status</ModalHeader>
          <ModalBody>
            {statusError && <div className="alert alert-danger mb-2">{statusError}</div>}
            <div className="form-group mb-3">
              <label className="form-label">New Status</label>
              <select
                className="form-select"
                value={newStatusId}
                onChange={(e) => setNewStatusId(e.target.value)}
              >
                <option value="">— Select Status —</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.status}</option>
                ))}
              </select>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <Button color="light" onClick={() => setStatusModal(false)}>Cancel</Button>
              <Button color="primary" onClick={doUpdateStatus} disabled={statusSaving || !newStatusId}>
                {statusSaving ? <Spinner size="sm" /> : "Save"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Invoice Modal ───────────────────────────────────────────────── */}
        <Modal isOpen={invoiceModal} toggle={() => setInvoiceModal(false)} size="xl">
          <ModalBody className="p-0">
            {/* Close button */}
            <a href="#close" className="close position-absolute top-0 end-0 p-3" style={{ zIndex: 10 }}
              onClick={(e) => { e.preventDefault(); setInvoiceModal(false); }}>
              <em className="icon ni ni-cross-sm" />
            </a>
            {invoiceLoading && <div className="text-center py-5"><Spinner /></div>}
            {!invoiceLoading && invoiceOrder && (() => {
              const o = invoiceOrder;
              const customer = [o.user?.firstName, o.user?.lastName].filter(Boolean).join(" ") || "—";
              const billingAddr = (o.addresses ?? []).find((a) => a.addressType === "billing") ?? o.addresses?.[0];
              return (
                <div className="invoice">
                  {/* Print / Email action bar — hidden during print */}
                  <div className="no-print d-flex justify-content-start gap-3 px-4 pt-3">
                    <button
                      className="btn btn-icon btn-lg"
                      style={{ border: "none", background: "transparent", color: "#526484" }}
                      title="Print Invoice"
                      onClick={printInvoice}
                    >
                      <Icon name="printer" style={{ fontSize: "1.5rem" }} />
                    </button>
                    <button
                      className="btn btn-icon btn-lg"
                      style={{ border: "none", background: "transparent", color: "#6576ff" }}
                      title="Email Invoice"
                      onClick={() => {
                        setEmailTo(invoiceOrder?.user?.emailAddress ?? "");
                        setEmailError(null);
                        setEmailSuccess(false);
                        setEmailModal(true);
                      }}
                    >
                      <Icon name="mail" style={{ fontSize: "1.5rem" }} />
                    </button>
                  </div>
                  <div className="invoice-wrap" id="invoice-print-area">
                    {/* Brand / Logo */}
                    <div className="invoice-brand text-center py-4">
                      <img
                        src="/uploads/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png"
                        alt="The Jiggling Pig, LLC"
                        style={{ maxHeight: 80, objectFit: "contain" }}
                      />
                      <div className="mt-1 fw-bold text-dark">The Jiggling Pig, LLC</div>
                    </div>

                    {/* Invoice head */}
                    <div className="invoice-head">
                      <div className="invoice-contact">
                        <span className="overline-title">Invoice To</span>
                        <div className="invoice-contact-info">
                          <h4 className="title">{customer}</h4>
                          <ul className="list-plain">
                            {billingAddr && (
                              <li>
                                <Icon name="map-pin-fill" />
                                <span>
                                  {billingAddr.line1}
                                  {billingAddr.line2 ? <><br />{billingAddr.line2}</> : null}
                                  <br />
                                  {[billingAddr.city, billingAddr.state, billingAddr.postalCode].filter(Boolean).join(", ")}
                                </span>
                              </li>
                            )}
                            {o.user?.emailAddress && (
                              <li><Icon name="mail-fill" /><span>{o.user.emailAddress}</span></li>
                            )}
                          </ul>
                        </div>
                      </div>
                      <div className="invoice-desc">
                        <h3 className="title">Invoice</h3>
                        <ul className="list-plain">
                          <li className="invoice-id">
                            <span>Invoice ID</span>:<span>#{shortId(o.id)}</span>
                          </li>
                          <li className="invoice-date">
                            <span>Date</span>:<span>{fmtDate(o.orderDate).split(",")[0]}</span>
                          </li>
                          <li>
                            <span>Status</span>:<span className="text-capitalize">{o.orderStatus?.status ?? "—"}</span>
                          </li>
                          <li>
                            <span>Type</span>:<span className="text-capitalize">{o.orderType ?? "—"}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Line items */}
                    <div className="invoice-bills">
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th className="w-60">Description</th>
                              <th style={{ width: "180px", whiteSpace: "nowrap" }}>SKU</th>
                              <th>Unit Price</th>
                              <th>Qty</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(o.lines ?? []).map((line) => (
                              <tr key={line.id}>
                                <td>{line.productNameSnapshot || line.productItem?.product?.name || "—"}</td>
                                <td className="text-soft" style={{ whiteSpace: "nowrap" }}>{line.skuSnapshot || line.productItem?.sku || "—"}</td>
                                <td>{fmtPrice(line.unitPriceSnapshot)}</td>
                                <td>{line.qty}</td>
                                <td>{fmtPrice(line.lineTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="3"></td>
                              <td>Subtotal</td>
                              <td>{fmtPrice(o.subtotal)}</td>
                            </tr>
                            {Number(o.discountTotal) > 0 && (
                              <tr>
                                <td colSpan="3"></td>
                                <td>Discount</td>
                                <td>-{fmtPrice(o.discountTotal)}</td>
                              </tr>
                            )}
                            <tr>
                              <td colSpan="3"></td>
                              <td>Tax</td>
                              <td>{fmtPrice(o.taxTotal)}</td>
                            </tr>
                            {Number(o.shippingTotal) > 0 && (
                              <tr>
                                <td colSpan="3"></td>
                                <td>Shipping ({o.shippingMethod?.name ?? ""})</td>
                                <td>{fmtPrice(o.shippingTotal)}</td>
                              </tr>
                            )}
                            <tr>
                              <td colSpan="3"></td>
                              <td><strong>Grand Total</strong></td>
                              <td><strong>{fmtPrice(o.grandTotal)}</strong></td>
                            </tr>
                          </tfoot>
                        </table>
                        <div className="nk-notes ff-italic fs-12px text-soft">
                          Invoice was created on a computer and is valid without the signature and seal.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </ModalBody>
        </Modal>

        {/* ── Email Invoice Modal ─────────────────────────────────────────── */}
        <Modal isOpen={emailModal} toggle={() => setEmailModal(false)} size="sm">
          <ModalHeader toggle={() => setEmailModal(false)}>Email Invoice</ModalHeader>
          <ModalBody>
            {emailSuccess ? (
              <div className="alert alert-success text-center">
                <Icon name="check-circle" className="me-1" /> Invoice emailed successfully!
              </div>
            ) : (
              <>
                <p className="text-soft mb-3">
                  Enter the email address to send Invoice #{invoiceOrder ? shortId(invoiceOrder.id) : ""} to:
                </p>
                <div className="form-group mb-3">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="customer@example.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doEmailInvoice()}
                  />
                </div>
                {emailError && (
                  <div className="alert alert-danger py-2 mb-3">
                    <Icon name="alert-circle" className="me-1" /> {emailError}
                  </div>
                )}
                <div className="d-flex justify-content-end gap-2">
                  <Button color="light" onClick={() => setEmailModal(false)} disabled={emailSending}>
                    Cancel
                  </Button>
                  <Button color="primary" onClick={doEmailInvoice} disabled={emailSending || !emailTo}>
                    {emailSending ? <Spinner size="sm" /> : <><Icon name="send" /> Send</>}
                  </Button>
                </div>
              </>
            )}
          </ModalBody>
        </Modal>

      </Content>
    </React.Fragment>
  );
};

export default AdminOrderList;
