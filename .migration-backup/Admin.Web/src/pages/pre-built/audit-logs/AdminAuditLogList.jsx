import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, ModalHeader, Spinner, Badge } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import { apiGet, apiPost, apiDelete, getAccessToken } from "@/utils/apiClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDt = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString();
};

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
};

const ACTION_COLORS = {
  USER_REGISTERED: "success", USER_UPDATED: "info", USER_DELETED: "danger",
  USER_LOGIN: "primary", USER_LOGOUT: "secondary",
  ORDER_PLACED: "success", ORDER_STATUS_CHANGED: "warning",
  PRODUCT_CREATED: "success", PRODUCT_UPDATED: "info", PRODUCT_DELETED: "danger",
};

const getActionColor = (action) => ACTION_COLORS[action] ?? "secondary";

// ─── SortIcon ─────────────────────────────────────────────────────────────────

const SortIcon = ({ field, sortField, sort }) => (
  <Icon name={sortField === field ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
);

// ─── Component ────────────────────────────────────────────────────────────────

const AdminAuditLogList = () => {
  // ── List state ────────────────────────────────────────────────────────────
  const [logs,        setLogs]        = useState([]);
  const [totalItems,  setTotalItems]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(20);
  const [sort,        setSort]        = useState("desc");
  const [sortField,   setSortField]   = useState("createdAt");
  const [searchOpen,  setSearchOpen]  = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [actionFilter,     setActionFilter]     = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [dateFrom,         setDateFrom]         = useState("");
  const [dateTo,           setDateTo]           = useState("");

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [detailModal,  setDetailModal]  = useState(false);
  const [detailLog,    setDetailLog]    = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Export state ──────────────────────────────────────────────────────────
  const [exporting,   setExporting]   = useState(false);
  const [exportError, setExportError] = useState(null);

  const searchActionTimer = useRef(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadLogs = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const fromIso = dateFrom ? new Date(dateFrom).toISOString() : undefined;
      const toIso   = dateTo   ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)).toISOString() : undefined;
      const opts = {
        page: currentPage, limit: itemPerPage,
        order: sort, orderBy: sortField,
        action:     actionFilter     || undefined,
        entityType: entityTypeFilter || undefined,
        from: fromIso, to: toIso,
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/audit-logs?${qs}`);
      setLogs(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, sortField, actionFilter, entityTypeFilter, dateFrom, dateTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // ── Pagination / sort ─────────────────────────────────────────────────────

  const paginate = (p) => setCurrentPage(p);

  const onSortClick = (field) => {
    if (sortField === field) setSort((s) => (s === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSort("desc"); }
    setCurrentPage(1);
  };

  // ── Action filter search ──────────────────────────────────────────────────

  const onActionSearch = (e) => {
    const val = e.target.value;
    setActionFilter(val);
    clearTimeout(searchActionTimer.current);
    searchActionTimer.current = setTimeout(() => {
      setCurrentPage(1);
      loadLogs({ page: 1, action: val || undefined });
    }, 400);
  };

  const applyFilters = () => { setCurrentPage(1); loadLogs({ page: 1 }); };

  // ── Detail modal ──────────────────────────────────────────────────────────

  const openDetail = async (log) => {
    setDetailLog(log);
    setDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await apiGet(`/audit-logs/${log.id}`);
      setDetailLog(res?.data ?? res);
    } catch { /* keep list-level data */ }
    finally { setDetailLoading(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/audit-logs/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      loadLogs();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const doExport = async (format) => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await apiPost("/exports", { entity: "audit-logs", format });
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
      a.download = `audit-logs-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const safeJson = (str) => {
    try { return JSON.stringify(JSON.parse(str || "null"), null, 2); }
    catch { return str || "—"; }
  };

  return (
    <React.Fragment>
      <Head title="Audit Logs" />
      <Content>
        {/* ── Page Header ────────────────────────────────────────────────── */}
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Audit Logs</BlockTitle>
              <BlockDes className="text-soft">
                <p>You have a total of {totalItems} audit log entries.</p>
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

        {/* ── Filter Bar ─────────────────────────────────────────────────── */}
        <Block>
          <div className="card card-bordered mb-3">
            <div className="card-inner">
              <Row className="g-3 align-end">
                <Col md="3">
                  <div className="form-group">
                    <label className="form-label">Action</label>
                    <input className="form-control" placeholder="e.g. USER_LOGIN" value={actionFilter} onChange={onActionSearch} />
                  </div>
                </Col>
                <Col md="3">
                  <div className="form-group">
                    <label className="form-label">Entity Type</label>
                    <input className="form-control" placeholder="e.g. Product" value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} />
                  </div>
                </Col>
                <Col md="2">
                  <div className="form-group">
                    <label className="form-label">From</label>
                    <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                </Col>
                <Col md="2">
                  <div className="form-group">
                    <label className="form-label">To</label>
                    <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </Col>
                <Col md="2">
                  <Button color="primary" onClick={applyFilters}>Apply Filters</Button>
                </Col>
              </Row>
            </div>
          </div>
        </Block>

        {/* ── Data Table ─────────────────────────────────────────────────── */}
        <Block>
          {error && <div className="alert alert-danger">{error}</div>}
          <DataTable className="card-stretch">
            {/* Toolbar */}
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools" />
                <div className="card-tools me-n1">
                  <ul className="btn-toolbar gx-1">
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                          <Icon name="setting" />
                        </DropdownToggle>
                        <DropdownMenu end className="dropdown-menu-xs">
                          <ul className="link-check">
                            <li><span>Show</span></li>
                            {[10, 20, 50].map((n) => (
                              <li key={n} className={itemPerPage === n ? "active" : ""}>
                                <DropdownItem onClick={() => { setItemPerPage(n); setCurrentPage(1); }}>{n}</DropdownItem>
                              </li>
                            ))}
                          </ul>
                          <ul className="link-check">
                            <li><span>Order</span></li>
                            <li className={sort === "desc" ? "active" : ""}><DropdownItem onClick={() => setSort("desc")}>Newest</DropdownItem></li>
                            <li className={sort === "asc"  ? "active" : ""}><DropdownItem onClick={() => setSort("asc")}>Oldest</DropdownItem></li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Table */}
            <DataTableBody>
              <DataTableHead>
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("createdAt")}>
                    Timestamp <SortIcon field="createdAt" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("action")}>
                    Action <SortIcon field="action" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("entityType")}>
                    Entity Type <SortIcon field="entityType" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">Entity ID</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">User</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">IP</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={7} className="text-center py-4"><Spinner /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">No audit logs found.</td></tr>
              ) : logs.map((log) => (
                <DataTableItem key={log.id}>
                  <DataTableRow>
                    <span className="tb-lead" style={{ whiteSpace: "nowrap" }}>{fmtDt(log.createdAt)}</span>
                  </DataTableRow>
                  <DataTableRow>
                    <Badge color={getActionColor(log.action)} className="badge-sm">{log.action}</Badge>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="text-soft">{log.entityType ?? "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-soft" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{log.entityId ?? "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="text-soft">{log.user?.emailAddress ?? "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-soft">{log.ip ?? "—"}</span>
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
                              <li><DropdownItem onClick={() => openDetail(log)}><Icon name="eye" /><span>Detail View</span></DropdownItem></li>
                              <li><DropdownItem onClick={() => { setDeleteTarget(log); setDeleteModal(true); }}><Icon name="trash" /><span>Delete</span></DropdownItem></li>
                            </ul>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </li>
                    </ul>
                  </DataTableRow>
                </DataTableItem>
              ))}
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

        {/* ── Detail Modal ───────────────────────────────────────────────── */}
        <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} size="lg">
          <ModalHeader toggle={() => setDetailModal(false)}>Audit Log Detail</ModalHeader>
          <ModalBody>
            {detailLoading ? (
              <div className="text-center py-4"><Spinner /></div>
            ) : detailLog && (
              <div>
                <Row className="g-3">
                  <Col md="6">
                    <p className="text-soft mb-1 small">Action</p>
                    <Badge color={getActionColor(detailLog.action)}>{detailLog.action}</Badge>
                  </Col>
                  <Col md="6">
                    <p className="text-soft mb-1 small">Timestamp</p>
                    <p className="mb-0">{fmtDt(detailLog.createdAt)}</p>
                  </Col>
                  <Col md="6">
                    <p className="text-soft mb-1 small">Entity Type</p>
                    <p className="mb-0">{detailLog.entityType ?? "—"}</p>
                  </Col>
                  <Col md="6">
                    <p className="text-soft mb-1 small">Entity ID</p>
                    <p className="mb-0" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{detailLog.entityId ?? "—"}</p>
                  </Col>
                  <Col md="6">
                    <p className="text-soft mb-1 small">User</p>
                    <p className="mb-0">{detailLog.user?.emailAddress ?? "—"}</p>
                  </Col>
                  <Col md="6">
                    <p className="text-soft mb-1 small">IP Address</p>
                    <p className="mb-0">{detailLog.ip ?? "—"}</p>
                  </Col>
                  <Col size="12">
                    <p className="text-soft mb-1 small">User Agent</p>
                    <p className="mb-0 text-soft small">{detailLog.userAgent ?? "—"}</p>
                  </Col>
                </Row>
                {(detailLog.beforeJson || detailLog.afterJson) && (
                  <Row className="g-3 mt-1">
                    {detailLog.beforeJson && (
                      <Col md="6">
                        <p className="text-soft mb-1 small fw-bold">Before</p>
                        <pre className="bg-light p-3 rounded small" style={{ maxHeight: 200, overflow: "auto" }}>
                          {safeJson(detailLog.beforeJson)}
                        </pre>
                      </Col>
                    )}
                    {detailLog.afterJson && (
                      <Col md="6">
                        <p className="text-soft mb-1 small fw-bold">After</p>
                        <pre className="bg-light p-3 rounded small" style={{ maxHeight: 200, overflow: "auto" }}>
                          {safeJson(detailLog.afterJson)}
                        </pre>
                      </Col>
                    )}
                  </Row>
                )}
              </div>
            )}
          </ModalBody>
        </Modal>

        {/* ── Delete Confirm Modal ───────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalBody className="modal-body-lg text-center">
            <div className="nk-modal">
              <Icon name="trash" className="nk-modal-icon icon-circle icon-circle-xxl bg-danger text-white" />
              <h4 className="nk-modal-title">Delete Audit Log?</h4>
              <div className="nk-modal-text">
                <p className="lead">Are you sure you want to permanently delete this log entry? This action cannot be undone.</p>
                {deleteTarget && (
                  <p className="text-soft small">{deleteTarget.action} — {fmtDt(deleteTarget.createdAt)}</p>
                )}
              </div>
              <div className="nk-modal-action mt-5 d-flex justify-content-center gap-2">
                <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
                <Button color="danger" onClick={doDelete} disabled={deleteLoading}>
                  {deleteLoading ? <Spinner size="sm" /> : "Delete"}
                </Button>
              </div>
            </div>
          </ModalBody>
        </Modal>

      </Content>
    </React.Fragment>
  );
};

export default AdminAuditLogList;
