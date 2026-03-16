import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, ModalHeader, Spinner, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Button, Col, Row,
  DataTable, DataTableBody, DataTableHead, DataTableItem, DataTableRow,
  PaginationComponent,
} from "@/components/Component";
import { apiGet, apiPatch, apiDelete } from "@/utils/apiClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const APPROVAL_FILTERS = [
  { label: "All",      value: "all"   },
  { label: "Pending",  value: "false" },
  { label: "Approved", value: "true"  },
];

function StarRating({ value }) {
  return (
    <span style={{ color: "#f4a12e", letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name={i < value ? "star-fill" : "star"} style={{ fontSize: "0.85rem" }} />
      ))}
    </span>
  );
}

function ApprovalBadge({ approved }) {
  return approved
    ? <Badge color="success" className="badge-sm">Approved</Badge>
    : <Badge color="warning" className="badge-sm">Pending</Badge>;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function customerName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—";
}

// ─── Shared Action Buttons ────────────────────────────────────────────────────

function ApproveBtn({ item, onApprove, actionLoading, suffix = "" }) {
  const approving = actionLoading === item.id + "_approve" + suffix;
  const disapproving = actionLoading === item.id + "_disapprove" + suffix;
  return !item.isApproved ? (
    <Button size="sm" color="success" outline onClick={() => onApprove(item, true)} disabled={!!actionLoading}>
      {approving ? <Spinner size="sm" /> : <><Icon name="check" className="me-1" />Approve</>}
    </Button>
  ) : (
    <Button size="sm" color="warning" outline onClick={() => onApprove(item, false)} disabled={!!actionLoading}>
      {disapproving ? <Spinner size="sm" /> : <><Icon name="cross" className="me-1" />Disapprove</>}
    </Button>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ isOpen, toggle, onConfirm, loading }) {
  return (
    <Modal isOpen={isOpen} toggle={toggle} size="sm">
      <ModalHeader toggle={toggle}>Confirm Delete</ModalHeader>
      <ModalBody>
        <p>Are you sure you want to permanently delete this? This cannot be undone.</p>
        <div className="d-flex gap-2 justify-content-end">
          <Button color="light" onClick={toggle}>Cancel</Button>
          <Button color="danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Delete"}
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
}

// ─── Toolbar (search + filter) ────────────────────────────────────────────────

function Toolbar({ filter, onFilter, onSearch, pendingCount }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchInput.trim());
  };

  const handleClear = () => {
    setSearchOpen(false);
    setSearchInput("");
    onSearch("");
  };

  return (
    <div className="card-inner position-relative card-tools-toggle">
      <div className="card-title-group">
        <div className="card-tools">
          <div className="d-flex gap-2 align-items-center flex-wrap">
            {APPROVAL_FILTERS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                color={filter === opt.value ? "primary" : "light"}
                onClick={() => onFilter(opt.value)}
              >
                {opt.label}
                {opt.value === "false" && pendingCount > 0 && (
                  <Badge color="warning" pill className="ms-1" style={{ fontSize: "0.65rem" }}>
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
        <div className="card-tools ms-auto">
          <ul className="btn-toolbar gx-1">
            <li>
              <Button className="btn-icon" onClick={() => setSearchOpen((s) => !s)}>
                <Icon name="search" />
              </Button>
            </li>
          </ul>
        </div>
      </div>
      {searchOpen && (
        <div className="card-search search-wrap active">
          <div className="card-body">
            <form className="search-content" onSubmit={handleSubmit}>
              <Button className="search-back btn-icon" type="button" onClick={handleClear}>
                <Icon name="arrow-left" />
              </Button>
              <input
                type="text"
                className="border-transparent form-focus-none form-control"
                placeholder="Search…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button className="search-submit btn-icon" type="submit">
                <Icon name="search" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product Reviews Panel ────────────────────────────────────────────────────

function ProductReviewsPanel() {
  const [items,        setItems]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [page,         setPage]         = useState(1);
  const limit = 20;
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [detail,       setDetail]       = useState(null);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen,   setDeleteOpen]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit), approved: filter, ...(search ? { search } : {}) });
      const res = await apiGet(`/reviews?${qs}`);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (e) { setError(e.message ?? "Failed to load reviews."); }
    finally { setLoading(false); }
  }, [page, limit, filter, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleFilter = (v) => { setFilter(v); setPage(1); };
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  const handleApprove = async (item, approve) => {
    const key = item.id + (approve ? "_approve" : "_disapprove");
    setActionLoading(key);
    try {
      await apiPatch(`/reviews/${item.id}/approval`, { isApproved: approve });
      setItems((prev) => prev.map((r) => r.id === item.id ? { ...r, isApproved: approve } : r));
      if (detail?.id === item.id) setDetail((d) => ({ ...d, isApproved: approve }));
    } catch (e) { alert(e.message ?? "Action failed."); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id + "_delete");
    try {
      await apiDelete(`/reviews/${deleteTarget.id}`);
      setItems((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      setDeleteOpen(false);
      if (detail?.id === deleteTarget.id) setDetailOpen(false);
    } catch (e) { alert(e.message ?? "Delete failed."); }
    finally { setActionLoading(null); setDeleteTarget(null); }
  };

  const pendingCount = items.filter((r) => !r.isApproved).length;

  return (
    <>
      <DataTable className="card-stretch">
        <Toolbar filter={filter} onFilter={handleFilter} onSearch={handleSearch} pendingCount={pendingCount} />
        <DataTableBody>
          <DataTableHead>
            <DataTableRow><span className="sub-text">Customer</span></DataTableRow>
            <DataTableRow size="md"><span className="sub-text">Product</span></DataTableRow>
            <DataTableRow size="sm"><span className="sub-text">Rating</span></DataTableRow>
            <DataTableRow size="lg"><span className="sub-text">Comment</span></DataTableRow>
            <DataTableRow size="sm"><span className="sub-text">Date</span></DataTableRow>
            <DataTableRow size="sm"><span className="sub-text">Status</span></DataTableRow>
            <DataTableRow className="nk-tb-col-tools text-end"><span className="sub-text">Actions</span></DataTableRow>
          </DataTableHead>

          {loading && <div className="text-center py-5"><Spinner color="primary" /></div>}
          {!loading && error && <div className="text-center py-5 text-danger">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="text-center py-5 text-soft">No reviews found.</div>}

          {!loading && items.map((r) => (
            <DataTableItem key={r.id}>
              <DataTableRow>
                <div className="user-info">
                  <span className="tb-lead">{customerName(r.user)}</span>
                  <span className="text-soft d-block small">{r.user?.emailAddress}</span>
                </div>
              </DataTableRow>
              <DataTableRow size="md"><span className="tb-lead">{r.product?.name ?? "—"}</span></DataTableRow>
              <DataTableRow size="sm"><StarRating value={r.ratingValue} /></DataTableRow>
              <DataTableRow size="lg">
                <span className="text-soft" style={{ maxWidth: 260, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.comment || <em>No comment</em>}
                </span>
              </DataTableRow>
              <DataTableRow size="sm"><span className="text-soft small">{fmtDate(r.createdAt)}</span></DataTableRow>
              <DataTableRow size="sm"><ApprovalBadge approved={r.isApproved} /></DataTableRow>
              <DataTableRow className="nk-tb-col-tools text-end">
                <ul className="nk-tb-actions gx-1">
                  <li><ApproveBtn item={r} onApprove={handleApprove} actionLoading={actionLoading} /></li>
                  <li>
                    <UncontrolledDropdown>
                      <DropdownToggle tag="a" href="#" className="btn btn-sm btn-icon btn-trigger" onClick={(e) => e.preventDefault()}>
                        <Icon name="more-h" />
                      </DropdownToggle>
                      <DropdownMenu end>
                        <ul className="link-list-opt no-bdr">
                          <li>
                            <DropdownItem tag="a" href="#" onClick={(e) => { e.preventDefault(); setDetail(r); setDetailOpen(true); }}>
                              <Icon name="eye" /><span>View</span>
                            </DropdownItem>
                          </li>
                          <li>
                            <DropdownItem tag="a" href="#" className="text-danger" onClick={(e) => { e.preventDefault(); setDeleteTarget(r); setDeleteOpen(true); }}>
                              <Icon name="trash" /><span>Delete</span>
                            </DropdownItem>
                          </li>
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
          {total > 0 && <PaginationComponent itemPerPage={limit} totalItems={total} paginate={setPage} currentPage={page} />}
        </div>
      </DataTable>

      {/* Detail modal */}
      {detail && (
        <Modal isOpen={detailOpen} toggle={() => setDetailOpen(false)} size="md" scrollable>
          <ModalHeader toggle={() => setDetailOpen(false)}>Product Review</ModalHeader>
          <ModalBody>
            <Row className="g-3 mb-4">
              <Col xs="6">
                <div className="data-label">Customer</div>
                <div className="data-value fw-bold">{customerName(detail.user)}</div>
                <div className="text-soft small">{detail.user?.emailAddress}</div>
              </Col>
              <Col xs="6">
                <div className="data-label">Product</div>
                <div className="data-value">{detail.product?.name ?? "—"}</div>
              </Col>
              <Col xs="6">
                <div className="data-label">Rating</div>
                <div className="data-value">
                  <StarRating value={detail.ratingValue} />
                  <span className="ms-2 text-soft small">{detail.ratingValue} / 5</span>
                </div>
              </Col>
              <Col xs="6">
                <div className="data-label">Date</div>
                <div className="data-value">{fmtDate(detail.createdAt)}</div>
              </Col>
              <Col xs="12">
                <div className="data-label">Status</div>
                <div className="mt-1"><ApprovalBadge approved={detail.isApproved} /></div>
              </Col>
              <Col xs="12">
                <div className="data-label mb-1">Comment</div>
                <div style={{ background: "#f5f6fa", borderRadius: 6, padding: "0.75rem 1rem", minHeight: 60 }}>
                  {detail.comment
                    ? <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{detail.comment}</p>
                    : <em className="text-soft">No comment provided.</em>}
                </div>
              </Col>
            </Row>
            <div className="d-flex gap-2 flex-wrap">
              <ApproveBtn item={detail} onApprove={handleApprove} actionLoading={actionLoading} suffix="_modal" />
              <Button color="danger" outline onClick={() => { setDetailOpen(false); setDeleteTarget(detail); setDeleteOpen(true); }}>
                <Icon name="trash" className="me-1" />Delete
              </Button>
            </div>
          </ModalBody>
        </Modal>
      )}

      <DeleteModal
        isOpen={deleteOpen}
        toggle={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={actionLoading === deleteTarget?.id + "_delete"}
      />
    </>
  );
}

// ─── Blog Comments Panel ──────────────────────────────────────────────────────

function BlogCommentsPanel() {
  const [items,        setItems]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [page,         setPage]         = useState(1);
  const limit = 20;
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [detail,       setDetail]       = useState(null);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen,   setDeleteOpen]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit), approved: filter, ...(search ? { search } : {}) });
      const res = await apiGet(`/reviews/comments?${qs}`);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (e) { setError(e.message ?? "Failed to load comments."); }
    finally { setLoading(false); }
  }, [page, limit, filter, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleFilter = (v) => { setFilter(v); setPage(1); };
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  const handleApprove = async (item, approve) => {
    const key = item.id + (approve ? "_approve" : "_disapprove");
    setActionLoading(key);
    try {
      await apiPatch(`/reviews/comments/${item.id}/approval`, { isApproved: approve });
      setItems((prev) => prev.map((c) => c.id === item.id ? { ...c, isApproved: approve } : c));
      if (detail?.id === item.id) setDetail((d) => ({ ...d, isApproved: approve }));
    } catch (e) { alert(e.message ?? "Action failed."); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id + "_delete");
    try {
      await apiDelete(`/reviews/comments/${deleteTarget.id}`);
      setItems((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      setDeleteOpen(false);
      if (detail?.id === deleteTarget.id) setDetailOpen(false);
    } catch (e) { alert(e.message ?? "Delete failed."); }
    finally { setActionLoading(null); setDeleteTarget(null); }
  };

  const pendingCount = items.filter((c) => !c.isApproved).length;

  return (
    <>
      <DataTable className="card-stretch">
        <Toolbar filter={filter} onFilter={handleFilter} onSearch={handleSearch} pendingCount={pendingCount} />
        <DataTableBody>
          <DataTableHead>
            <DataTableRow><span className="sub-text">Commenter</span></DataTableRow>
            <DataTableRow size="md"><span className="sub-text">Post</span></DataTableRow>
            <DataTableRow size="sm"><span className="sub-text">Type</span></DataTableRow>
            <DataTableRow size="lg"><span className="sub-text">Comment</span></DataTableRow>
            <DataTableRow size="sm"><span className="sub-text">Date</span></DataTableRow>
            <DataTableRow size="sm"><span className="sub-text">Status</span></DataTableRow>
            <DataTableRow className="nk-tb-col-tools text-end"><span className="sub-text">Actions</span></DataTableRow>
          </DataTableHead>

          {loading && <div className="text-center py-5"><Spinner color="primary" /></div>}
          {!loading && error && <div className="text-center py-5 text-danger">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="text-center py-5 text-soft">No comments found.</div>}

          {!loading && items.map((c) => (
            <DataTableItem key={c.id}>
              <DataTableRow>
                <div className="user-info">
                  <span className="tb-lead">{customerName(c.user)}</span>
                  <span className="text-soft d-block small">{c.user?.emailAddress}</span>
                </div>
              </DataTableRow>
              <DataTableRow size="md">
                <span className="tb-lead" style={{ maxWidth: 180, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.post?.title ?? "—"}
                </span>
              </DataTableRow>
              <DataTableRow size="sm">
                <Badge color="outline-secondary" className="badge-sm text-capitalize">
                  {c.post?.postType ?? "post"}
                </Badge>
                {c.parentId && <Badge color="outline-info" className="badge-sm ms-1">Reply</Badge>}
              </DataTableRow>
              <DataTableRow size="lg">
                <span className="text-soft" style={{ maxWidth: 260, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.body}
                </span>
              </DataTableRow>
              <DataTableRow size="sm"><span className="text-soft small">{fmtDate(c.createdAt)}</span></DataTableRow>
              <DataTableRow size="sm"><ApprovalBadge approved={c.isApproved} /></DataTableRow>
              <DataTableRow className="nk-tb-col-tools text-end">
                <ul className="nk-tb-actions gx-1">
                  <li><ApproveBtn item={c} onApprove={handleApprove} actionLoading={actionLoading} /></li>
                  <li>
                    <UncontrolledDropdown>
                      <DropdownToggle tag="a" href="#" className="btn btn-sm btn-icon btn-trigger" onClick={(e) => e.preventDefault()}>
                        <Icon name="more-h" />
                      </DropdownToggle>
                      <DropdownMenu end>
                        <ul className="link-list-opt no-bdr">
                          <li>
                            <DropdownItem tag="a" href="#" onClick={(e) => { e.preventDefault(); setDetail(c); setDetailOpen(true); }}>
                              <Icon name="eye" /><span>View</span>
                            </DropdownItem>
                          </li>
                          <li>
                            <DropdownItem tag="a" href="#" className="text-danger" onClick={(e) => { e.preventDefault(); setDeleteTarget(c); setDeleteOpen(true); }}>
                              <Icon name="trash" /><span>Delete</span>
                            </DropdownItem>
                          </li>
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
          {total > 0 && <PaginationComponent itemPerPage={limit} totalItems={total} paginate={setPage} currentPage={page} />}
        </div>
      </DataTable>

      {/* Detail modal */}
      {detail && (
        <Modal isOpen={detailOpen} toggle={() => setDetailOpen(false)} size="md" scrollable>
          <ModalHeader toggle={() => setDetailOpen(false)}>Blog Comment</ModalHeader>
          <ModalBody>
            <Row className="g-3 mb-4">
              <Col xs="6">
                <div className="data-label">Commenter</div>
                <div className="data-value fw-bold">{customerName(detail.user)}</div>
                <div className="text-soft small">{detail.user?.emailAddress}</div>
              </Col>
              <Col xs="6">
                <div className="data-label">Post</div>
                <div className="data-value">{detail.post?.title ?? "—"}</div>
                <div className="text-soft small text-capitalize">{detail.post?.postType}</div>
              </Col>
              <Col xs="6">
                <div className="data-label">Date</div>
                <div className="data-value">{fmtDate(detail.createdAt)}</div>
              </Col>
              <Col xs="6">
                <div className="data-label">Status</div>
                <div className="mt-1"><ApprovalBadge approved={detail.isApproved} /></div>
              </Col>
              {detail.parent && (
                <Col xs="12">
                  <div className="data-label mb-1">Replying to</div>
                  <div style={{ background: "#eef0f4", borderRadius: 6, padding: "0.5rem 0.75rem", fontSize: "0.85rem", color: "#6e82a5", fontStyle: "italic" }}>
                    {detail.parent.body}
                  </div>
                </Col>
              )}
              <Col xs="12">
                <div className="data-label mb-1">Comment</div>
                <div style={{ background: "#f5f6fa", borderRadius: 6, padding: "0.75rem 1rem", minHeight: 60 }}>
                  <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{detail.body}</p>
                </div>
              </Col>
            </Row>
            <div className="d-flex gap-2 flex-wrap">
              <ApproveBtn item={detail} onApprove={handleApprove} actionLoading={actionLoading} suffix="_modal" />
              <Button color="danger" outline onClick={() => { setDetailOpen(false); setDeleteTarget(detail); setDeleteOpen(true); }}>
                <Icon name="trash" className="me-1" />Delete
              </Button>
            </div>
          </ModalBody>
        </Modal>
      )}

      <DeleteModal
        isOpen={deleteOpen}
        toggle={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={actionLoading === deleteTarget?.id + "_delete"}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminReviews = () => {
  const [activeTab, setActiveTab] = useState("reviews");

  return (
    <>
      <Head title="Reviews & Comments" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Reviews &amp; Comments</BlockTitle>
              <p className="text-soft">
                Moderate product reviews and blog comments before they appear on the storefront.
              </p>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {/* Tab switcher */}
        <Block>
          <div className="d-flex gap-2 mb-4">
            <Button
              color={activeTab === "reviews" ? "primary" : "light"}
              onClick={() => setActiveTab("reviews")}
            >
              <Icon name="star" className="me-1" />
              Product Reviews
            </Button>
            <Button
              color={activeTab === "comments" ? "primary" : "light"}
              onClick={() => setActiveTab("comments")}
            >
              <Icon name="chat" className="me-1" />
              Blog Comments
            </Button>
          </div>

          {activeTab === "reviews"  && <ProductReviewsPanel />}
          {activeTab === "comments" && <BlogCommentsPanel />}
        </Block>
      </Content>
    </>
  );
};

export default AdminReviews;
