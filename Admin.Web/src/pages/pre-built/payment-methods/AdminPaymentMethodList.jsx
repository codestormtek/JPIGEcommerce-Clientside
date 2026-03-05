import React, { useState, useEffect, useCallback } from "react";
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
import { apiGet, apiDelete } from "@/utils/apiClient";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short", day: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const expiry = (month, year) =>
  month && year ? `${String(month).padStart(2, "0")}/${year}` : "—";

const BRAND_COLORS = {
  visa: "primary", mastercard: "warning", amex: "info",
  discover: "success", jcb: "secondary", unionpay: "danger",
};
const CardBadge = ({ brand }) => {
  const color = BRAND_COLORS[(brand ?? "").toLowerCase()] ?? "secondary";
  return <Badge color={color} className="badge-sm text-uppercase">{brand ?? "Unknown"}</Badge>;
};

// ─── Stripe Status Card ───────────────────────────────────────────────────────

const WEBHOOK_PATH = "/api/v1/payments/webhook";

const StripeStatusCard = () => {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.protocol}//${window.location.hostname}${WEBHOOK_PATH}`;

  const copy = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="card card-bordered mb-4">
      <div className="card-inner">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded"
              style={{ width: 48, height: 48, background: "#635bff1a" }}
            >
              <Icon name="cc-alt2-fill" style={{ fontSize: "1.5rem", color: "#635bff" }} />
            </div>
            <div>
              <h6 className="mb-0">Stripe</h6>
              <span className="text-soft small">Payment provider · Configured via environment variables</span>
            </div>
            <Badge color="success" className="badge-sm ms-1">Connected</Badge>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-soft small d-none d-md-inline">Webhook endpoint:</span>
            <code className="small px-2 py-1 rounded" style={{ background: "var(--bs-light)", fontSize: "0.72rem" }}>
              {WEBHOOK_PATH}
            </code>
            <Button size="sm" color="light" outline onClick={copy}>
              <Icon name={copied ? "check" : "copy"} />
              <span className="ms-1">{copied ? "Copied!" : "Copy URL"}</span>
            </Button>
            <a
              href="https://dashboard.stripe.com/webhooks"
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-light btn-outline"
            >
              <Icon name="external-link" />
              <span className="ms-1">Stripe Dashboard</span>
            </a>
          </div>
        </div>
        <div className="mt-3 pt-3 border-top">
          <span className="text-soft small">
            <Icon name="info" className="me-1" />
            API keys and webhook secrets are managed in your server <code>.env</code> file.
            To enable Stripe Tax, set <code>STRIPE_TAX_ENABLED=true</code> and restart the API.
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const AdminPaymentMethodList = () => {
  const [tokens,       setTokens]       = useState([]);
  const [totalItems,   setTotalItems]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemPerPage,  setItemPerPage]  = useState(20);
  const [sort,         setSort]         = useState("desc");
  const [sortField,    setSortField]    = useState("createdAt");
  const [search,       setSearch]       = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);

  // Delete confirm modal
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState(null);

  // ─── Load ───────────────────────────────────────────────────────────────────

  const loadTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opts = {
        page:    currentPage,
        limit:   itemPerPage,
        order:   sort,
        orderBy: sortField,
        ...(search ? { search } : {}),
      };
      const qs = Object.entries(opts)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/users/payment-methods?${qs}`);
      setTokens(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, sortField, search]);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const onSortClick = (field) => {
    if (sortField === field) setSort((s) => (s === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSort("desc"); }
    setCurrentPage(1);
  };

  const onSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const openDelete = (token) => {
    setDeleteTarget(token);
    setDeleteError(null);
    setDeleteModal(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/users/payment-methods/${deleteTarget.id}`);
      setDeleteModal(false);
      loadTokens();
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const SortIcon = ({ field }) => (
    <Icon name={sortField === field ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <Head title="Payment Methods" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Payment Methods</BlockTitle>
              <BlockDes className="text-soft">
                <p>Saved customer cards across all accounts — {totalItems} total.</p>
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {/* Stripe connection status */}
          <StripeStatusCard />

          {error && <div className="alert alert-danger mb-3">{error}</div>}

          <DataTable className="card-stretch">
            {/* Toolbar */}
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools" />
                <div className="card-tools me-n1">
                  <ul className="btn-toolbar gx-1">
                    <li>
                      <Button
                        className="btn-icon search-toggle toggle-search"
                        onClick={() => { setSearchInput(""); setSearch(""); setSearchOpen((s) => !s); }}
                      >
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
                    <form className="search-content" onSubmit={onSearch}>
                      <Button
                        className="search-back btn-icon toggle-search"
                        onClick={() => { setSearchOpen(false); setSearch(""); setSearchInput(""); }}
                      >
                        <Icon name="arrow-left" />
                      </Button>
                      <input
                        type="text"
                        className="border-transparent form-focus-none form-control"
                        placeholder="Search by customer name or email..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />
                      <Button type="submit" className="search-submit btn-icon"><Icon name="search" /></Button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <DataTableBody>
              <DataTableHead>
                <DataTableRow size="lg"><span className="sub-text">Customer</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Provider</span></DataTableRow>
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("brand")}>
                    Card <SortIcon field="brand" />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Expires</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Default</span></DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("createdAt")}>
                    Added <SortIcon field="createdAt" />
                  </span>
                </DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={7} className="text-center py-4"><Spinner /></td></tr>
              ) : tokens.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">No saved payment methods found.</td></tr>
              ) : tokens.map((t) => {
                const customer = [t.user?.firstName, t.user?.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <DataTableItem key={t.id}>
                    <DataTableRow size="lg">
                      <div>
                        <span className="tb-lead">{customer}</span>
                        <span className="d-block text-soft small">{t.user?.emailAddress ?? ""}</span>
                      </div>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <span className="text-capitalize text-soft">{t.provider}</span>
                    </DataTableRow>
                    <DataTableRow>
                      <div className="d-flex align-items-center gap-2">
                        <CardBadge brand={t.brand} />
                        <span className="tb-lead">•••• {t.last4 ?? "——"}</span>
                      </div>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <span className="text-soft">{expiry(t.expMonth, t.expYear)}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      {t.isDefault
                        ? <Badge color="success" className="badge-sm">Default</Badge>
                        : <span className="text-soft">—</span>}
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className="text-soft">{fmtDate(t.createdAt)}</span>
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
                                <li>
                                  <DropdownItem onClick={() => openDelete(t)} className="text-danger">
                                    <Icon name="trash" /><span>Remove Card</span>
                                  </DropdownItem>
                                </li>
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
                  paginate={(p) => setCurrentPage(p)}
                  currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalHeader toggle={() => setDeleteModal(false)}>Remove Payment Method</ModalHeader>
          <ModalBody>
            {deleteError && (
              <div className="alert alert-danger py-2 mb-3">
                <Icon name="alert-circle" className="me-1" /> {deleteError}
              </div>
            )}
            {deleteTarget && (
              <div className="mb-3">
                <p className="text-soft mb-2">
                  Are you sure you want to remove this saved card? The customer will need to re-add
                  their payment details for future orders.
                </p>
                <div className="d-flex align-items-center gap-2 p-3 rounded" style={{ background: "var(--bs-light)" }}>
                  <CardBadge brand={deleteTarget.brand} />
                  <span className="fw-bold">•••• {deleteTarget.last4 ?? "——"}</span>
                  <span className="text-soft small ms-auto">
                    {[deleteTarget.user?.firstName, deleteTarget.user?.lastName].filter(Boolean).join(" ")}
                  </span>
                </div>
              </div>
            )}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button color="light" onClick={() => setDeleteModal(false)} disabled={deleting}>Cancel</Button>
              <Button color="danger" onClick={doDelete} disabled={deleting}>
                {deleting ? <Spinner size="sm" /> : <><Icon name="trash" /> Remove</>}
              </Button>
            </div>
          </ModalBody>
        </Modal>

      </Content>
    </React.Fragment>
  );
};

export default AdminPaymentMethodList;
