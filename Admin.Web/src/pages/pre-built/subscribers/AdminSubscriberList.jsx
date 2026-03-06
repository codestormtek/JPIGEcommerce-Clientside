import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, Spinner } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button, RSelect,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const OPT_IN_FILTER = [
  { value: "true", label: "Opted In" },
  { value: "false", label: "Opted Out" },
];

const SUBSCRIPTION_TYPES = [
  { value: "sales", label: "Sales" },
  { value: "truck_schedule", label: "Truck Schedule" },
  { value: "menu_updates", label: "Menu Updates" },
  { value: "news", label: "News" },
];

const SUB_TYPE_COLORS = {
  sales: "primary",
  truck_schedule: "info",
  menu_updates: "warning",
  news: "success",
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never";

const BLANK_FORM = { email: "", phone: "", zip: "", optInEmail: false, optInSms: false };

const AdminSubscriberList = () => {
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemPerPage, setItemPerPage]   = useState(20);
  const [sort, setSort]                 = useState("desc");
  const [sortField, setSortField]       = useState("createdAt");

  const [subscribers, setSubscribers]   = useState([]);
  const [totalItems, setTotalItems]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  const [emailFilter, setEmailFilter]   = useState(null);
  const [smsFilter, setSmsFilter]       = useState(null);

  const [addModal, setAddModal]         = useState(false);
  const [addForm, setAddForm]           = useState(BLANK_FORM);
  const [addSaving, setAddSaving]       = useState(false);
  const [addError, setAddError]         = useState(null);

  const [editModal, setEditModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [editForm, setEditForm]         = useState(BLANK_FORM);
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState(null);

  const [detailModal, setDetailModal]   = useState(false);
  const [detailSub, setDetailSub]       = useState(null);

  const [deleteModal, setDeleteModal]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [stats, setStats]               = useState({ total: 0, emailOptIn: 0, smsOptIn: 0 });

  const searchTimer = useRef(null);

  const loadSubscribers = useCallback(async (overrides = {}) => {
    setLoading(true); setError(null);
    try {
      const opts = {
        page: currentPage, limit: itemPerPage, order: sort, orderBy: sortField,
        optInEmail: emailFilter?.value ?? undefined,
        optInSms: smsFilter?.value ?? undefined,
        search: searchText || undefined,
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/subscribers?${qs}`);
      setSubscribers(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [currentPage, itemPerPage, sort, sortField, emailFilter, smsFilter, searchText]);

  const loadStats = useCallback(async () => {
    try {
      const [allRes, emailRes, smsRes] = await Promise.all([
        apiGet("/subscribers?limit=1"),
        apiGet("/subscribers?limit=1&optInEmail=true"),
        apiGet("/subscribers?limit=1&optInSms=true"),
      ]);
      setStats({
        total: allRes?.meta?.total ?? 0,
        emailOptIn: emailRes?.meta?.total ?? 0,
        smsOptIn: smsRes?.meta?.total ?? 0,
      });
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadSubscribers(); }, [loadSubscribers]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setCurrentPage(1); loadSubscribers({ page: 1, search: val || undefined }); }, 400);
  };

  const openAddModal = () => {
    setAddForm(BLANK_FORM); setAddError(null); setAddModal(true);
  };

  const onAddSubmit = async () => {
    setAddSaving(true); setAddError(null);
    try {
      await apiPost("/subscribers", {
        email: addForm.email || undefined,
        phone: addForm.phone || undefined,
        zip: addForm.zip || undefined,
        optInEmail: addForm.optInEmail,
        optInSms: addForm.optInSms,
      });
      setAddModal(false); loadSubscribers(); loadStats();
    } catch (e) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  const openEditModal = (sub) => {
    setEditTarget(sub);
    setEditForm({
      email: sub.email ?? "",
      phone: sub.phone ?? "",
      zip: sub.zip ?? "",
      optInEmail: sub.optInEmail ?? false,
      optInSms: sub.optInSms ?? false,
    });
    setEditError(null); setEditModal(true);
  };

  const onEditSubmit = async () => {
    setEditSaving(true); setEditError(null);
    try {
      await apiPatch(`/subscribers/${editTarget.id}`, {
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        zip: editForm.zip || undefined,
        optInEmail: editForm.optInEmail,
        optInSms: editForm.optInSms,
      });
      setEditModal(false); loadSubscribers(); loadStats();
    } catch (e) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  const openDetail = (sub) => { setDetailSub(sub); setDetailModal(true); };

  const confirmDelete = (sub) => { setDeleteTarget(sub); setDeleteModal(true); };

  const doDelete = async () => {
    setDeleteLoading(true);
    try { await apiDelete(`/subscribers/${deleteTarget.id}`); setDeleteModal(false); setDeleteTarget(null); loadSubscribers(); loadStats(); }
    catch (e) { alert(e.message); }
    finally { setDeleteLoading(false); }
  };

  return (
    <React.Fragment>
      <Head title="Subscribers" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Subscribers</BlockTitle>
              <BlockDes className="text-soft">
                <p>You have {stats.total} subscriber{stats.total !== 1 ? "s" : ""}.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <div className="toggle-expand-content">
                  <ul className="nk-block-tools g-3">
                    <li className="nk-block-tools-opt">
                      <Button color="primary" onClick={openAddModal}>
                        <Icon name="plus" /><span>Add Subscriber</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <Row className="g-3 mb-3">
            <Col sm={4} md={3}>
              <div className="card card-bordered text-center p-3">
                <div className="fw-bold fs-3 text-primary">{stats.total}</div>
                <div className="text-muted small">Total Subscribers</div>
              </div>
            </Col>
            <Col sm={4} md={3}>
              <div className="card card-bordered text-center p-3">
                <div className="fw-bold fs-3 text-success">{stats.emailOptIn}</div>
                <div className="text-muted small">Email Opted In</div>
              </div>
            </Col>
            <Col sm={4} md={3}>
              <div className="card card-bordered text-center p-3">
                <div className="fw-bold fs-3 text-info">{stats.smsOptIn}</div>
                <div className="text-muted small">SMS Opted In</div>
              </div>
            </Col>
          </Row>
        </Block>

        <Block>
          {error && <div className="alert alert-danger">{error}</div>}
          <DataTable className="card-stretch">
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools">
                  <div className="d-flex g-2 flex-wrap">
                    <div style={{ minWidth: 150 }}>
                      <RSelect placeholder="Email Opt-in" options={OPT_IN_FILTER} value={emailFilter} isClearable
                        onChange={(opt) => { setEmailFilter(opt); setCurrentPage(1); }} />
                    </div>
                    <div style={{ minWidth: 150 }}>
                      <RSelect placeholder="SMS Opt-in" options={OPT_IN_FILTER} value={smsFilter} isClearable
                        onChange={(opt) => { setSmsFilter(opt); setCurrentPage(1); }} />
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
                            {[10, 20, 50].map((n) => (
                              <li key={n} className={itemPerPage === n ? "active" : ""}>
                                <DropdownItem onClick={() => { setItemPerPage(n); setCurrentPage(1); }}>{n}</DropdownItem>
                              </li>
                            ))}
                          </ul>
                          <ul className="link-check">
                            <li><span>Order</span></li>
                            <li className={sort === "desc" ? "active" : ""}><DropdownItem onClick={() => setSort("desc")}>Newest</DropdownItem></li>
                            <li className={sort === "asc" ? "active" : ""}><DropdownItem onClick={() => setSort("asc")}>Oldest</DropdownItem></li>
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
                      <Button className="search-back btn-icon toggle-search"
                        onClick={() => { setSearchOpen(false); setSearchText(""); loadSubscribers({ search: undefined }); }}>
                        <Icon name="arrow-left" />
                      </Button>
                      <input type="text" className="border-transparent form-focus-none form-control"
                        placeholder="Search by email or phone…" value={searchText} onChange={onSearchChange} />
                      <Button className="search-submit btn-icon"><Icon name="search" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DataTableBody>
              <DataTableHead>
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => { setSortField("email"); setSort((s) => s === "asc" ? "desc" : "asc"); }}>
                    Email <Icon name={sortField === "email" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Phone</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">ZIP</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Email</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">SMS</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">Subscriptions</span></DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => { setSortField("createdAt"); setSort((s) => s === "asc" ? "desc" : "asc"); }}>
                    Joined <Icon name={sortField === "createdAt" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={8} className="text-center py-4"><Spinner /></td></tr>
              ) : subscribers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-4 text-muted">No subscribers found.</td></tr>
              ) : subscribers.map((sub) => (
                <DataTableItem key={sub.id}>
                  <DataTableRow>
                    <div className="user-info">
                      <span className="tb-lead">{sub.email || "—"}</span>
                      {sub.user && (
                        <span className="d-block text-muted small">
                          Linked: {sub.user.username || sub.user.email}
                        </span>
                      )}
                    </div>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span>{sub.phone || "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span>{sub.zip || "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    {sub.optInEmail ? (
                      <Badge color="success" pill className="px-2">Yes</Badge>
                    ) : (
                      <Badge color="outline-secondary" pill className="px-2">No</Badge>
                    )}
                  </DataTableRow>
                  <DataTableRow size="sm">
                    {sub.optInSms ? (
                      <Badge color="info" pill className="px-2">Yes</Badge>
                    ) : (
                      <Badge color="outline-secondary" pill className="px-2">No</Badge>
                    )}
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <div className="d-flex flex-wrap gap-1">
                      {(sub.subscriptions ?? []).map((s, i) => (
                        <Badge key={i} color={SUB_TYPE_COLORS[s.subscriptionType] ?? "secondary"} pill className="text-capitalize px-2">
                          {s.subscriptionType?.replace(/_/g, " ")}
                          {s.location ? ` (${s.location.name})` : ""}
                        </Badge>
                      ))}
                      {(!sub.subscriptions || sub.subscriptions.length === 0) && (
                        <span className="text-muted small">None</span>
                      )}
                    </div>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="small">{fmtDate(sub.createdAt)}</span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li className="nk-tb-action-hidden">
                        <a href="#view" onClick={(e) => { e.preventDefault(); openDetail(sub); }}
                          className="btn btn-trigger btn-icon" title="View Details">
                          <Icon name="eye" />
                        </a>
                      </li>
                      <li className="nk-tb-action-hidden">
                        <a href="#edit" onClick={(e) => { e.preventDefault(); openEditModal(sub); }}
                          className="btn btn-trigger btn-icon" title="Edit">
                          <Icon name="edit" />
                        </a>
                      </li>
                      <li className="nk-tb-action-hidden">
                        <a href="#delete" onClick={(e) => { e.preventDefault(); confirmDelete(sub); }}
                          className="btn btn-trigger btn-icon text-danger" title="Remove">
                          <Icon name="trash" />
                        </a>
                      </li>
                    </ul>
                  </DataTableRow>
                </DataTableItem>
              ))}
            </DataTableBody>

            <div className="card-inner">
              {totalItems > 0 && (
                <PaginationComponent
                  itemPerPage={itemPerPage} totalItems={totalItems}
                  paginate={setCurrentPage} currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Add Subscriber Modal ──────────────────────────────────────────── */}
        <Modal isOpen={addModal} toggle={() => setAddModal(false)} size="md">
          <ModalBody>
            <div className="nk-modal-head mb-3">
              <h5 className="title">Add Subscriber</h5>
            </div>
            <Row className="g-3">
              <Col md={12}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-control" placeholder="subscriber@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-control" placeholder="(555) 123-4567"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="form-group">
                  <label className="form-label">ZIP Code</label>
                  <input type="text" className="form-control" placeholder="12345"
                    value={addForm.zip}
                    onChange={(e) => setAddForm((f) => ({ ...f, zip: e.target.value }))}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="form-check form-switch mt-2">
                  <input className="form-check-input" type="checkbox" id="addOptEmail"
                    checked={addForm.optInEmail}
                    onChange={(e) => setAddForm((f) => ({ ...f, optInEmail: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="addOptEmail">Opt in to Email</label>
                </div>
              </Col>
              <Col md={6}>
                <div className="form-check form-switch mt-2">
                  <input className="form-check-input" type="checkbox" id="addOptSms"
                    checked={addForm.optInSms}
                    onChange={(e) => setAddForm((f) => ({ ...f, optInSms: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="addOptSms">Opt in to SMS</label>
                </div>
              </Col>
            </Row>
            {addError && <div className="alert alert-danger mt-3">{addError}</div>}
            <div className="mt-3 d-flex justify-content-end gap-2">
              <Button color="light" onClick={() => setAddModal(false)}>Cancel</Button>
              <Button color="primary" onClick={onAddSubmit} disabled={addSaving}>
                {addSaving ? <Spinner size="sm" /> : "Add Subscriber"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Edit Subscriber Modal ─────────────────────────────────────────── */}
        <Modal isOpen={editModal} toggle={() => setEditModal(false)} size="md">
          <ModalBody>
            <div className="nk-modal-head mb-3">
              <h5 className="title">Edit Subscriber</h5>
            </div>
            <Row className="g-3">
              <Col md={12}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-control"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-control"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="form-group">
                  <label className="form-label">ZIP Code</label>
                  <input type="text" className="form-control"
                    value={editForm.zip}
                    onChange={(e) => setEditForm((f) => ({ ...f, zip: e.target.value }))}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="form-check form-switch mt-2">
                  <input className="form-check-input" type="checkbox" id="editOptEmail"
                    checked={editForm.optInEmail}
                    onChange={(e) => setEditForm((f) => ({ ...f, optInEmail: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="editOptEmail">Opt in to Email</label>
                </div>
              </Col>
              <Col md={6}>
                <div className="form-check form-switch mt-2">
                  <input className="form-check-input" type="checkbox" id="editOptSms"
                    checked={editForm.optInSms}
                    onChange={(e) => setEditForm((f) => ({ ...f, optInSms: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="editOptSms">Opt in to SMS</label>
                </div>
              </Col>
            </Row>
            {editError && <div className="alert alert-danger mt-3">{editError}</div>}
            <div className="mt-3 d-flex justify-content-end gap-2">
              <Button color="light" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button color="primary" onClick={onEditSubmit} disabled={editSaving}>
                {editSaving ? <Spinner size="sm" /> : "Save Changes"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Detail Modal ──────────────────────────────────────────────────── */}
        <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} size="md">
          <ModalBody>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h5 className="title mb-0">Subscriber Details</h5>
              <a href="#close" onClick={(e) => { e.preventDefault(); setDetailModal(false); }}
                style={{ fontSize: 22 }}>
                <Icon name="cross" />
              </a>
            </div>

            {detailSub && (
              <>
                <div className="card card-bordered p-3 mb-3">
                  <Row className="g-3">
                    <Col xs={6}>
                      <div className="text-muted small">Email</div>
                      <div className="fw-semibold">{detailSub.email || "—"}</div>
                    </Col>
                    <Col xs={6}>
                      <div className="text-muted small">Phone</div>
                      <div className="fw-semibold">{detailSub.phone || "—"}</div>
                    </Col>
                    <Col xs={6}>
                      <div className="text-muted small">ZIP Code</div>
                      <div className="fw-semibold">{detailSub.zip || "—"}</div>
                    </Col>
                    <Col xs={6}>
                      <div className="text-muted small">Joined</div>
                      <div className="fw-semibold">{fmtDateTime(detailSub.createdAt)}</div>
                    </Col>
                    <Col xs={6}>
                      <div className="text-muted small">Email Opt-in</div>
                      <Badge color={detailSub.optInEmail ? "success" : "secondary"} pill>
                        {detailSub.optInEmail ? "Yes" : "No"}
                      </Badge>
                    </Col>
                    <Col xs={6}>
                      <div className="text-muted small">SMS Opt-in</div>
                      <Badge color={detailSub.optInSms ? "info" : "secondary"} pill>
                        {detailSub.optInSms ? "Yes" : "No"}
                      </Badge>
                    </Col>
                    <Col xs={6}>
                      <div className="text-muted small">Confirmed</div>
                      <div className="fw-semibold">
                        {detailSub.confirmedAt ? fmtDateTime(detailSub.confirmedAt) : (
                          <Badge color="warning" pill>Unconfirmed</Badge>
                        )}
                      </div>
                    </Col>
                    {detailSub.user && (
                      <Col xs={6}>
                        <div className="text-muted small">Linked Account</div>
                        <div className="fw-semibold">{detailSub.user.username || detailSub.user.email}</div>
                      </Col>
                    )}
                  </Row>
                </div>

                <h6 className="mb-2">Subscription Topics</h6>
                {(detailSub.subscriptions ?? []).length > 0 ? (
                  <div className="list-group">
                    {detailSub.subscriptions.map((s) => (
                      <div key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <Badge color={SUB_TYPE_COLORS[s.subscriptionType] ?? "secondary"} pill className="me-2 text-capitalize">
                            {s.subscriptionType?.replace(/_/g, " ")}
                          </Badge>
                          {s.location && <span className="text-muted small">at {s.location.name}</span>}
                          {s.radiusMiles && <span className="text-muted small ms-1">({s.radiusMiles} mi radius)</span>}
                        </div>
                        <Badge color={s.isEnabled ? "success" : "secondary"} pill>
                          {s.isEnabled ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small">No subscription topics configured.</p>
                )}

                <div className="mt-3 d-flex justify-content-end gap-2">
                  <Button color="light" size="sm" onClick={() => { setDetailModal(false); openEditModal(detailSub); }}>
                    <Icon name="edit" /> Edit
                  </Button>
                  <Button color="light" size="sm" onClick={() => setDetailModal(false)}>Close</Button>
                </div>
              </>
            )}
          </ModalBody>
        </Modal>

        {/* ── Delete Modal ──────────────────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalBody className="modal-body-sm text-center">
            <div className="nk-modal-head mb-2">
              <h5 className="title">Remove Subscriber</h5>
            </div>
            <p>Remove <strong>{deleteTarget?.email || deleteTarget?.phone}</strong> from subscribers? This cannot be undone.</p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
              <Button color="danger" onClick={doDelete} disabled={deleteLoading}>
                {deleteLoading ? <Spinner size="sm" /> : "Remove"}
              </Button>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default AdminSubscriberList;
