import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Button, Col, Row,
  DataTable, DataTableBody, DataTableHead, DataTableItem, DataTableRow,
  PaginationComponent,
} from "@/components/Component";
import { apiGet, apiPatch, apiDelete } from "@/utils/apiClient";

const FILTER_OPTIONS = [
  { label: "All",       value: "all"   },
  { label: "Pending",   value: "false" },
  { label: "Approved",  value: "true"  },
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

const AdminReviews = () => {
  const [reviews,      setReviews]      = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemPerPage]                   = useState(20);
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);

  const [detailReview, setDetailReview] = useState(null);
  const [detailModal,  setDetailModal]  = useState(false);

  const [actionLoading, setActionLoading] = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteModal,   setDeleteModal]   = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page:     String(currentPage),
        limit:    String(itemPerPage),
        approved: filter,
        ...(search ? { search } : {}),
      });
      const res = await apiGet(`/reviews?${qs}`);
      setReviews(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (e) {
      setError(e.message ?? "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, filter, search]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const openDetail = (review) => {
    setDetailReview(review);
    setDetailModal(true);
  };

  const handleApproval = async (review, approve) => {
    setActionLoading(review.id + (approve ? "_approve" : "_disapprove"));
    try {
      const updated = await apiPatch(`/reviews/${review.id}/approval`, { isApproved: approve });
      setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, isApproved: approve } : r));
      if (detailReview?.id === review.id) setDetailReview((prev) => ({ ...prev, isApproved: approve }));
    } catch (e) {
      alert(e.message ?? "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteModal = (review) => {
    setDeleteTarget(review);
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id + "_delete");
    try {
      await apiDelete(`/reviews/${deleteTarget.id}`);
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      setDeleteModal(false);
      if (detailReview?.id === deleteTarget.id) setDetailModal(false);
    } catch (e) {
      alert(e.message ?? "Delete failed.");
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  };

  const pendingCount   = reviews.filter((r) => !r.isApproved).length;

  return (
    <>
      <Head title="Reviews" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Reviews</BlockTitle>
              <p className="text-soft">
                Manage customer reviews. Approve or disapprove before they appear on the storefront.
              </p>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <DataTable className="card-stretch">
            {/* Toolbar */}
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools">
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    {FILTER_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        size="sm"
                        color={filter === opt.value ? "primary" : "light"}
                        onClick={() => { setFilter(opt.value); setCurrentPage(1); }}
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
                      <Button className="btn-icon search-toggle toggle-search" onClick={() => setSearchOpen((s) => !s)}>
                        <Icon name="search" />
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>

              {searchOpen && (
                <div className="card-search search-wrap active">
                  <div className="card-body">
                    <form className="search-content" onSubmit={handleSearch}>
                      <Button className="search-back btn-icon toggle-search" type="button" onClick={() => { setSearchOpen(false); setSearch(""); setSearchInput(""); setCurrentPage(1); }}>
                        <Icon name="arrow-left" />
                      </Button>
                      <input
                        type="text"
                        className="border-transparent form-focus-none form-control"
                        placeholder="Search by customer, product, or comment..."
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

            {/* Table */}
            <DataTableBody>
              <DataTableHead>
                <DataTableRow><span className="sub-text">Customer</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Product</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Rating</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">Comment</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Date</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Status</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading && (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                </div>
              )}
              {!loading && error && (
                <div className="text-center py-5 text-danger">{error}</div>
              )}
              {!loading && !error && reviews.length === 0 && (
                <div className="text-center py-5 text-soft">No reviews found.</div>
              )}

              {!loading && reviews.map((review) => {
                const customerName = [review.user?.firstName, review.user?.lastName].filter(Boolean).join(" ") || "—";
                const isApproving   = actionLoading === review.id + "_approve";
                const isDisapproving = actionLoading === review.id + "_disapprove";

                return (
                  <DataTableItem key={review.id}>
                    <DataTableRow>
                      <div className="user-card">
                        <div className="user-info">
                          <span className="tb-lead">{customerName}</span>
                          <span className="text-soft d-block small">{review.user?.emailAddress}</span>
                        </div>
                      </div>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className="tb-lead">{review.product?.name ?? "—"}</span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <StarRating value={review.ratingValue} />
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span className="text-soft" style={{ maxWidth: 280, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {review.comment || <em>No comment</em>}
                      </span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <span className="text-soft small">{fmtDate(review.createdAt)}</span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <ApprovalBadge approved={review.isApproved} />
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools text-end">
                      <ul className="nk-tb-actions gx-1">
                        {!review.isApproved ? (
                          <li>
                            <Button
                              size="sm" color="success" outline
                              onClick={() => handleApproval(review, true)}
                              disabled={!!actionLoading}
                            >
                              {isApproving ? <Spinner size="sm" /> : <><Icon name="check" className="me-1" />Approve</>}
                            </Button>
                          </li>
                        ) : (
                          <li>
                            <Button
                              size="sm" color="warning" outline
                              onClick={() => handleApproval(review, false)}
                              disabled={!!actionLoading}
                            >
                              {isDisapproving ? <Spinner size="sm" /> : <><Icon name="cross" className="me-1" />Disapprove</>}
                            </Button>
                          </li>
                        )}
                        <li>
                          <Button size="sm" color="light" onClick={() => openDetail(review)}>
                            <Icon name="eye" />
                          </Button>
                        </li>
                        <li>
                          <Button size="sm" color="danger" outline onClick={() => openDeleteModal(review)} disabled={!!actionLoading}>
                            <Icon name="trash" />
                          </Button>
                        </li>
                      </ul>
                    </DataTableRow>
                  </DataTableItem>
                );
              })}
            </DataTableBody>

            <div className="card-inner">
              {total > 0 && (
                <PaginationComponent
                  itemPerPage={itemPerPage}
                  totalItems={total}
                  paginate={(p) => setCurrentPage(p)}
                  currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Detail Modal ──────────────────────────────────────────────────── */}
        {detailReview && (
          <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} size="md" scrollable>
            <ModalHeader toggle={() => setDetailModal(false)}>
              Review Detail
            </ModalHeader>
            <ModalBody>
              <Row className="g-3 mb-4">
                <Col xs="6">
                  <div className="data-label">Customer</div>
                  <div className="data-value fw-bold">
                    {[detailReview.user?.firstName, detailReview.user?.lastName].filter(Boolean).join(" ") || "—"}
                  </div>
                  <div className="text-soft small">{detailReview.user?.emailAddress}</div>
                </Col>
                <Col xs="6">
                  <div className="data-label">Product</div>
                  <div className="data-value">{detailReview.product?.name ?? "—"}</div>
                </Col>
                <Col xs="6">
                  <div className="data-label">Rating</div>
                  <div className="data-value">
                    <StarRating value={detailReview.ratingValue} />
                    <span className="ms-2 text-soft small">{detailReview.ratingValue} / 5</span>
                  </div>
                </Col>
                <Col xs="6">
                  <div className="data-label">Date</div>
                  <div className="data-value">{fmtDate(detailReview.createdAt)}</div>
                </Col>
                <Col xs="12">
                  <div className="data-label">Status</div>
                  <div className="data-value mt-1">
                    <ApprovalBadge approved={detailReview.isApproved} />
                  </div>
                </Col>
                <Col xs="12">
                  <div className="data-label mb-1">Comment</div>
                  <div style={{ background: "#f5f6fa", borderRadius: 6, padding: "0.75rem 1rem", minHeight: 60 }}>
                    {detailReview.comment
                      ? <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{detailReview.comment}</p>
                      : <em className="text-soft">No comment provided.</em>
                    }
                  </div>
                </Col>
              </Row>

              <div className="d-flex gap-2 flex-wrap">
                {!detailReview.isApproved ? (
                  <Button
                    color="success"
                    onClick={() => handleApproval(detailReview, true)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === detailReview.id + "_approve" ? <Spinner size="sm" /> : <><Icon name="check" className="me-1" />Approve Review</>}
                  </Button>
                ) : (
                  <Button
                    color="warning"
                    onClick={() => handleApproval(detailReview, false)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === detailReview.id + "_disapprove" ? <Spinner size="sm" /> : <><Icon name="cross" className="me-1" />Disapprove Review</>}
                  </Button>
                )}
                <Button
                  color="danger" outline
                  onClick={() => { setDetailModal(false); openDeleteModal(detailReview); }}
                  disabled={!!actionLoading}
                >
                  <Icon name="trash" className="me-1" />Delete
                </Button>
              </div>
            </ModalBody>
          </Modal>
        )}

        {/* ── Delete Confirm Modal ───────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalHeader toggle={() => setDeleteModal(false)}>Delete Review</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to permanently delete this review? This cannot be undone.</p>
            <div className="d-flex gap-2 justify-content-end">
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
              <Button
                color="danger"
                onClick={handleDelete}
                disabled={actionLoading === deleteTarget?.id + "_delete"}
              >
                {actionLoading === deleteTarget?.id + "_delete" ? <Spinner size="sm" /> : "Delete"}
              </Button>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </>
  );
};

export default AdminReviews;
