import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import {
  Badge, Modal, ModalBody, Spinner,
  Nav, NavItem, NavLink, TabContent, TabPane,
  UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem,
} from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Button, Col, Row, RSelect,
  DataTable, DataTableBody, DataTableHead, DataTableItem, DataTableRow,
  PaginationComponent,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const fmtDiscount = (promo) => {
  if (promo.promotionType === "free_shipping") return "Free Shipping";
  if (promo.promotionType === "percent") return `${Number(promo.discountRate ?? 0).toFixed(0)}% off`;
  if (promo.promotionType === "fixed") return `$${Number(promo.discountRate ?? 0).toFixed(2)} off`;
  return "—";
};

function promoStatus(promo) {
  if (!promo.isActive) return { label: "Inactive", color: "secondary" };
  const now = new Date();
  if (promo.endDate && new Date(promo.endDate) < now) return { label: "Expired", color: "danger" };
  if (promo.startDate && new Date(promo.startDate) > now) return { label: "Scheduled", color: "info" };
  return { label: "Active", color: "success" };
}

function promoScope(promo) {
  const cats = promo.categories?.length ?? 0;
  const prods = promo.products?.length ?? 0;
  if (cats === 0 && prods === 0) return "All Products";
  const parts = [];
  if (cats > 0) parts.push(`${cats} categor${cats === 1 ? "y" : "ies"}`);
  if (prods > 0) parts.push(`${prods} product${prods === 1 ? "" : "s"}`);
  return parts.join(", ");
}

const TYPE_OPTIONS = [
  { label: "Percentage Off", value: "percent" },
  { label: "Fixed Amount Off", value: "fixed" },
  { label: "Free Shipping", value: "free_shipping" },
];

const COUPON_TYPE_OPTIONS = [
  { label: "Fixed Amount ($)", value: "fixed" },
  { label: "Percentage (%)", value: "percent" },
];

const EMPTY_FORM = {
  name: "", description: "", promotionType: "percent", discountRate: "",
  minSubtotal: "", stackable: false, startDate: "", endDate: "", isActive: true,
  categoryIds: [], productIds: [],
};

const EMPTY_COUPON = {
  code: "", couponType: "fixed", discountAmount: "", percentage: "",
  expirationDate: "", usageLimit: "",
};

function toDateInput(d) {
  if (!d) return "";
  try { return new Date(d).toISOString().slice(0, 10); } catch { return ""; }
}

// ─── Component ───────────────────────────────────────────────────────────────

const AdminPromotionList = () => {
  // List state
  const [promotions, setPromotions] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemPerPage = 15;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  // Add modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Coupon management (within edit modal)
  const [couponDraft, setCouponDraft] = useState({ ...EMPTY_COUPON });
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponError, setCouponError] = useState(null);

  // Usage history (within edit modal)
  const [usages, setUsages] = useState([]);
  const [usagesLoading, setUsagesLoading] = useState(false);
  const [usagePage, setUsagePage] = useState(1);
  const [usageTotal, setUsageTotal] = useState(0);

  // Reference data
  const [productOptions, setProductOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const refDataLoaded = useRef(false);

  // ─── Load list ──────────────────────────────────────────────────────────────

  const loadPromotions = useCallback(async (page = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: itemPerPage });
      if (typeFilter) params.append("promotionType", typeFilter);
      if (activeFilter !== null && activeFilter !== undefined) params.append("isActive", activeFilter);
      const res = await apiGet(`/promotions?${params}`);
      const data = res?.data ?? (Array.isArray(res) ? res : []);
      setPromotions(Array.isArray(data) ? data : []);
      setTotalItems(res?.meta?.total ?? res?.total ?? data.length);
    } catch (e) {
      setError(e.message);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, typeFilter, activeFilter]);

  useEffect(() => { loadPromotions(currentPage); }, [currentPage, typeFilter, activeFilter]);

  // ─── Load reference data ─────────────────────────────────────────────────────

  const loadRefData = useCallback(async () => {
    if (refDataLoaded.current) return;
    refDataLoaded.current = true;
    try {
      const [catsRes, prodsRes] = await Promise.all([
        apiGet("/products/categories"),
        apiGet("/products?limit=200&page=1"),
      ]);
      const cats = Array.isArray(catsRes) ? catsRes : (catsRes?.data ?? []);
      setCategoryOptions(cats.map((c) => ({ label: c.name, value: c.id })));
      const prods = Array.isArray(prodsRes) ? prodsRes : (prodsRes?.data ?? []);
      setProductOptions(prods.map((p) => ({ label: p.name, value: p.id })));
    } catch (e) {
      console.error("Failed to load ref data:", e);
    }
  }, []);

  // ─── Form helpers ─────────────────────────────────────────────────────────────

  const promoToForm = (promo) => ({
    name: promo.name ?? "",
    description: promo.description ?? "",
    promotionType: promo.promotionType ?? "percent",
    discountRate: promo.discountRate != null ? String(promo.discountRate) : "",
    minSubtotal: promo.minSubtotal != null ? String(promo.minSubtotal) : "",
    stackable: promo.stackable ?? false,
    startDate: toDateInput(promo.startDate),
    endDate: toDateInput(promo.endDate),
    isActive: promo.isActive ?? true,
    categoryIds: (promo.categories ?? []).map((pc) => ({
      label: pc.category?.name ?? pc.categoryId,
      value: pc.categoryId,
    })),
    productIds: (promo.products ?? []).map((pp) => ({
      label: pp.product?.name ?? pp.productId,
      value: pp.productId,
    })),
  });

  const formToPayload = (form) => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      promotionType: form.promotionType,
      stackable: form.stackable,
      isActive: form.isActive,
      categoryIds: form.categoryIds.map((c) => c.value),
      productIds: form.productIds.map((p) => p.value),
    };
    if (form.discountRate !== "") payload.discountRate = parseFloat(form.discountRate);
    if (form.minSubtotal !== "") payload.minSubtotal = parseFloat(form.minSubtotal);
    if (form.startDate) payload.startDate = form.startDate;
    if (form.endDate) payload.endDate = form.endDate;
    return payload;
  };

  // ─── Add promo ───────────────────────────────────────────────────────────────

  const openAddModal = () => {
    loadRefData();
    setAddForm({ ...EMPTY_FORM });
    setAddError(null);
    setAddModal(true);
  };

  const saveAdd = async () => {
    if (!addForm.name) { setAddError("Name is required."); return; }
    setAddSaving(true); setAddError(null);
    try {
      await apiPost("/promotions", formToPayload(addForm));
      setAddModal(false);
      loadPromotions(1);
      setCurrentPage(1);
    } catch (e) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  // ─── Edit promo ──────────────────────────────────────────────────────────────

  const openEditModal = (promo) => {
    loadRefData();
    setEditPromo(promo);
    setEditForm(promoToForm(promo));
    setEditError(null);
    setActiveTab("basic");
    setCouponDraft({ ...EMPTY_COUPON });
    setCouponError(null);
    setUsages([]);
    setUsagePage(1);
    setUsageTotal(0);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editForm.name) { setEditError("Name is required."); return; }
    setEditSaving(true); setEditError(null);
    try {
      const updated = await apiPatch(`/promotions/${editPromo.id}`, formToPayload(editForm));
      const p = updated?.data ?? updated;
      setEditPromo(p);
      setEditForm(promoToForm(p));
      loadPromotions(currentPage);
    } catch (e) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  // ─── Delete promo ─────────────────────────────────────────────────────────────

  const confirmDelete = (promo) => { setDeleteTarget(promo); setDeleteModal(true); };

  const doDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiDelete(`/promotions/${deleteTarget.id}`);
      setDeleteModal(false);
      loadPromotions(currentPage);
    } catch (e) { setError(e.message); }
    finally { setDeleteLoading(false); }
  };

  // ─── Coupons ─────────────────────────────────────────────────────────────────

  const addCoupon = async () => {
    if (!couponDraft.code) { setCouponError("Code is required."); return; }
    setCouponSaving(true); setCouponError(null);
    try {
      const payload = {
        code: couponDraft.code.toUpperCase(),
        discountAmount: couponDraft.couponType === "fixed" ? parseFloat(couponDraft.discountAmount || "0") : 0,
      };
      if (couponDraft.couponType === "percent") {
        payload.percentage = parseFloat(couponDraft.percentage || "0");
        payload.discountAmount = 0;
      }
      if (couponDraft.expirationDate) payload.expirationDate = couponDraft.expirationDate;
      if (couponDraft.usageLimit) payload.usageLimit = parseInt(couponDraft.usageLimit, 10);

      const res = await apiPost(`/promotions/${editPromo.id}/coupons`, payload);
      const newCoupon = res?.data ?? res;
      const updated = { ...editPromo, coupons: [...(editPromo.coupons ?? []), newCoupon] };
      setEditPromo(updated);
      setCouponDraft({ ...EMPTY_COUPON });
    } catch (e) { setCouponError(e.message); }
    finally { setCouponSaving(false); }
  };

  const removeCoupon = async (couponId) => {
    try {
      await apiDelete(`/promotions/${editPromo.id}/coupons/${couponId}`);
      setEditPromo((prev) => ({ ...prev, coupons: prev.coupons.filter((c) => c.id !== couponId) }));
    } catch (e) { setCouponError(e.message); }
  };

  // ─── Usage history ───────────────────────────────────────────────────────────

  const loadUsages = useCallback(async (page = 1) => {
    if (!editPromo) return;
    setUsagesLoading(true);
    try {
      const res = await apiGet(`/promotions/${editPromo.id}/usages?page=${page}&limit=10`);
      setUsages(Array.isArray(res?.data) ? res.data : []);
      setUsageTotal(res?.meta?.total ?? res?.total ?? 0);
      setUsagePage(page);
    } catch (e) { console.error(e); }
    finally { setUsagesLoading(false); }
  }, [editPromo]);

  useEffect(() => {
    if (editModal && activeTab === "usage" && editPromo) loadUsages(1);
  }, [activeTab, editModal]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  const paginate = (page) => setCurrentPage(page);

  return (
    <>
      <Head title="Promotions" />
      <Content>
        {/* Page Header */}
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Promotions &amp; Coupons</BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openAddModal}>
                <Icon name="plus" /><span>Add Promotion</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {/* Filters */}
          <div className="card card-bordered mb-3">
            <div className="card-inner">
              <Row className="g-3 align-items-end">
                <Col md="3">
                  <label className="form-label mb-1 text-soft">Promotion Type</label>
                  <RSelect
                    options={[{ label: "All Types", value: null }, ...TYPE_OPTIONS]}
                    value={typeFilter ? TYPE_OPTIONS.find((t) => t.value === typeFilter) ?? null : { label: "All Types", value: null }}
                    onChange={(v) => { setTypeFilter(v?.value ?? null); setCurrentPage(1); }}
                    placeholder="All Types"
                  />
                </Col>
                <Col md="3">
                  <label className="form-label mb-1 text-soft">Status</label>
                  <RSelect
                    options={[
                      { label: "All Statuses", value: null },
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" },
                    ]}
                    value={activeFilter !== null && activeFilter !== undefined
                      ? { label: activeFilter === "true" ? "Active" : "Inactive", value: activeFilter }
                      : { label: "All Statuses", value: null }
                    }
                    onChange={(v) => { setActiveFilter(v?.value ?? null); setCurrentPage(1); }}
                    placeholder="All Statuses"
                  />
                </Col>
                <Col md="3">
                  <Button color="light" outline onClick={() => { setTypeFilter(null); setActiveFilter(null); setCurrentPage(1); }}>
                    <Icon name="undo" /><span>Reset</span>
                  </Button>
                </Col>
              </Row>
            </div>
          </div>

          {/* Table */}
          <div className="card card-bordered">
            <div className="card-inner-group">
              {error && <div className="alert alert-danger m-3">{error}</div>}
              <DataTable className="card-stretch">
                <DataTableBody>
                  <DataTableHead>
                    <DataTableRow><span className="sub-text">Name</span></DataTableRow>
                    <DataTableRow size="sm"><span className="sub-text">Type</span></DataTableRow>
                    <DataTableRow size="sm"><span className="sub-text">Discount</span></DataTableRow>
                    <DataTableRow size="md"><span className="sub-text">Scope</span></DataTableRow>
                    <DataTableRow size="md"><span className="sub-text">Coupons</span></DataTableRow>
                    <DataTableRow size="lg"><span className="sub-text">Start Date</span></DataTableRow>
                    <DataTableRow size="lg"><span className="sub-text">End Date</span></DataTableRow>
                    <DataTableRow size="sm"><span className="sub-text">Status</span></DataTableRow>
                    <DataTableRow className="nk-tb-col-tools" />
                  </DataTableHead>

                  {loading ? (
                    <DataTableItem>
                      <DataTableRow><Spinner size="sm" /></DataTableRow>
                    </DataTableItem>
                  ) : promotions.length === 0 ? (
                    <DataTableItem>
                      <DataTableRow><span className="text-muted">No promotions found.</span></DataTableRow>
                    </DataTableItem>
                  ) : promotions.map((promo) => {
                    const status = promoStatus(promo);
                    return (
                      <DataTableItem key={promo.id}>
                        <DataTableRow>
                          <div className="user-card">
                            <div className="user-info">
                              <span className="tb-lead">{promo.name}</span>
                              {promo.description && <span className="text-soft small" style={{ display: "block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{promo.description}</span>}
                            </div>
                          </div>
                        </DataTableRow>
                        <DataTableRow size="sm">
                          <span className="tb-amount">{TYPE_OPTIONS.find((t) => t.value === promo.promotionType)?.label ?? promo.promotionType}</span>
                        </DataTableRow>
                        <DataTableRow size="sm">
                          <span className="tb-amount fw-medium">{fmtDiscount(promo)}</span>
                          {promo.minSubtotal > 0 && <span className="text-soft d-block small">Min: ${Number(promo.minSubtotal).toFixed(2)}</span>}
                        </DataTableRow>
                        <DataTableRow size="md">
                          <span className="text-soft">{promoScope(promo)}</span>
                          {promo.stackable && <Badge color="light" className="ms-1" pill>Stackable</Badge>}
                        </DataTableRow>
                        <DataTableRow size="md">
                          <span className="tb-amount">{promo.coupons?.length ?? 0}</span>
                        </DataTableRow>
                        <DataTableRow size="lg">
                          <span className="text-soft">{fmtDate(promo.startDate)}</span>
                        </DataTableRow>
                        <DataTableRow size="lg">
                          <span className="text-soft">{fmtDate(promo.endDate)}</span>
                        </DataTableRow>
                        <DataTableRow size="sm">
                          <Badge color={status.color} pill>{status.label}</Badge>
                        </DataTableRow>
                        <DataTableRow className="nk-tb-col-tools">
                          <ul className="nk-tb-actions gx-1">
                            <li>
                              <Button size="sm" color="primary" outline onClick={() => openEditModal(promo)}>
                                <Icon name="edit" />
                              </Button>
                            </li>
                            <li>
                              <Button size="sm" color="danger" outline onClick={() => confirmDelete(promo)}>
                                <Icon name="trash" />
                              </Button>
                            </li>
                          </ul>
                        </DataTableRow>
                      </DataTableItem>
                    );
                  })}
                </DataTableBody>
              </DataTable>

              {totalItems > itemPerPage && (
                <div className="card-inner">
                  <PaginationComponent
                    itemPerPage={itemPerPage}
                    totalItems={totalItems}
                    paginate={paginate}
                    currentPage={currentPage}
                  />
                </div>
              )}
            </div>
          </div>
        </Block>
      </Content>

      {/* ── Add Promotion Modal ───────────────────────────────────────────────── */}
      <Modal isOpen={addModal} toggle={() => setAddModal(false)} size="lg">
        <ModalBody>
          <a href="#cancel" onClick={(e) => { e.preventDefault(); setAddModal(false); }} className="close">
            <em className="icon ni ni-cross-sm" />
          </a>
          <div className="p-2">
            <h5 className="title mb-4">New Promotion</h5>
            {addError && <div className="alert alert-danger">{addError}</div>}
            <PromoForm form={addForm} setForm={setAddForm} productOptions={productOptions} categoryOptions={categoryOptions} />
            <div className="mt-4 d-flex gap-2">
              <Button color="primary" onClick={saveAdd} disabled={addSaving || !addForm.name}>
                {addSaving ? <Spinner size="sm" /> : "Create Promotion"}
              </Button>
              <Button color="light" onClick={() => setAddModal(false)}>Cancel</Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* ── Edit Promotion Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={editModal} toggle={() => { setEditModal(false); loadPromotions(currentPage); }} size="xl">
        <ModalBody>
          <a href="#cancel" onClick={(e) => { e.preventDefault(); setEditModal(false); loadPromotions(currentPage); }} className="close">
            <em className="icon ni ni-cross-sm" />
          </a>
          <div className="p-2">
            <h5 className="title">Edit Promotion — <span className="text-soft">{editPromo?.name}</span></h5>
            <Nav tabs className="mt-3">
              {[
                { id: "basic", label: "Basic Info" },
                { id: "scope", label: "Scope" },
                { id: "coupons", label: `Coupons (${editPromo?.coupons?.length ?? 0})` },
                { id: "usage", label: "Usage History" },
              ].map((tab) => (
                <NavItem key={tab.id}>
                  <NavLink
                    className={activeTab === tab.id ? "active" : ""}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {tab.label}
                  </NavLink>
                </NavItem>
              ))}
            </Nav>

            <TabContent activeTab={activeTab} className="mt-3">
              {/* ── Basic Info ── */}
              <TabPane tabId="basic">
                {editError && <div className="alert alert-danger">{editError}</div>}
                <PromoFormBasic form={editForm} setForm={setEditForm} />
                <div className="mt-3 d-flex gap-2">
                  <Button color="primary" onClick={saveEdit} disabled={editSaving || !editForm.name}>
                    {editSaving ? <Spinner size="sm" /> : "Save Changes"}
                  </Button>
                </div>
              </TabPane>

              {/* ── Scope ── */}
              <TabPane tabId="scope">
                {editError && <div className="alert alert-danger">{editError}</div>}
                <div className="mb-3">
                  <p className="text-soft mb-3">
                    Leave both fields empty to apply this promotion to <strong>all products</strong>.
                    Selecting specific categories and/or products restricts the promotion to those items only.
                  </p>
                  <Row className="g-3">
                    <Col md="12">
                      <div className="form-group">
                        <label className="form-label">Apply to Categories</label>
                        <RSelect
                          options={categoryOptions}
                          value={editForm.categoryIds}
                          onChange={(v) => setEditForm((f) => ({ ...f, categoryIds: v ?? [] }))}
                          isMulti
                          placeholder="All categories (leave empty for all)"
                        />
                      </div>
                    </Col>
                    <Col md="12">
                      <div className="form-group">
                        <label className="form-label">Apply to Specific Products</label>
                        <RSelect
                          options={productOptions}
                          value={editForm.productIds}
                          onChange={(v) => setEditForm((f) => ({ ...f, productIds: v ?? [] }))}
                          isMulti
                          placeholder="All products (leave empty for all)"
                        />
                      </div>
                    </Col>
                  </Row>
                </div>
                <div className="mt-3 d-flex gap-2">
                  <Button color="primary" onClick={saveEdit} disabled={editSaving}>
                    {editSaving ? <Spinner size="sm" /> : "Save Scope"}
                  </Button>
                </div>
              </TabPane>

              {/* ── Coupons ── */}
              <TabPane tabId="coupons">
                {couponError && <div className="alert alert-danger">{couponError}</div>}

                {/* Existing coupons */}
                {editPromo?.coupons?.length > 0 ? (
                  <div className="mb-4">
                    <h6 className="overline-title text-base mb-2">Existing Coupon Codes</h6>
                    <div className="card card-bordered">
                      <DataTable>
                        <DataTableBody>
                          <DataTableHead>
                            <DataTableRow><span className="sub-text">Code</span></DataTableRow>
                            <DataTableRow><span className="sub-text">Discount</span></DataTableRow>
                            <DataTableRow><span className="sub-text">Used / Limit</span></DataTableRow>
                            <DataTableRow><span className="sub-text">Expires</span></DataTableRow>
                            <DataTableRow className="nk-tb-col-tools" />
                          </DataTableHead>
                          {editPromo.coupons.map((c) => (
                            <DataTableItem key={c.id}>
                              <DataTableRow>
                                <code style={{ background: "#f0f1f5", padding: "2px 8px", borderRadius: 4, fontWeight: 600, letterSpacing: 1 }}>{c.code}</code>
                              </DataTableRow>
                              <DataTableRow>
                                {c.percentage
                                  ? <span className="fw-medium text-primary">{Number(c.percentage).toFixed(0)}% off</span>
                                  : <span className="fw-medium text-primary">${Number(c.discountAmount).toFixed(2)} off</span>
                                }
                              </DataTableRow>
                              <DataTableRow>
                                <span>{c.timesUsed ?? 0} / {c.usageLimit ?? "∞"}</span>
                              </DataTableRow>
                              <DataTableRow>
                                <span className="text-soft">{fmtDate(c.expirationDate)}</span>
                              </DataTableRow>
                              <DataTableRow className="nk-tb-col-tools">
                                <Button size="sm" color="danger" outline onClick={() => removeCoupon(c.id)}>
                                  <Icon name="trash" />
                                </Button>
                              </DataTableRow>
                            </DataTableItem>
                          ))}
                        </DataTableBody>
                      </DataTable>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted mb-3">No coupon codes yet.</p>
                )}

                {/* Add coupon form */}
                <h6 className="overline-title text-base mb-3">Add New Coupon Code</h6>
                <div className="card card-bordered">
                  <div className="card-inner">
                    <Row className="g-3">
                      <Col md="4">
                        <div className="form-group">
                          <label className="form-label">Coupon Code <span className="text-danger">*</span></label>
                          <input
                            className="form-control text-uppercase"
                            value={couponDraft.code}
                            onChange={(e) => setCouponDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
                            placeholder="e.g. SAVE20"
                            style={{ letterSpacing: 1, fontWeight: 600 }}
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group">
                          <label className="form-label">Discount Type</label>
                          <RSelect
                            options={COUPON_TYPE_OPTIONS}
                            value={COUPON_TYPE_OPTIONS.find((o) => o.value === couponDraft.couponType)}
                            onChange={(v) => setCouponDraft((d) => ({ ...d, couponType: v?.value ?? "fixed" }))}
                          />
                        </div>
                      </Col>
                      {couponDraft.couponType === "fixed" ? (
                        <Col md="4">
                          <div className="form-group">
                            <label className="form-label">Discount Amount ($) <span className="text-danger">*</span></label>
                            <input
                              className="form-control"
                              type="number"
                              step="0.01"
                              min="0"
                              value={couponDraft.discountAmount}
                              onChange={(e) => setCouponDraft((d) => ({ ...d, discountAmount: e.target.value }))}
                              placeholder="5.00"
                            />
                          </div>
                        </Col>
                      ) : (
                        <Col md="4">
                          <div className="form-group">
                            <label className="form-label">Percentage (%) <span className="text-danger">*</span></label>
                            <input
                              className="form-control"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={couponDraft.percentage}
                              onChange={(e) => setCouponDraft((d) => ({ ...d, percentage: e.target.value }))}
                              placeholder="20"
                            />
                          </div>
                        </Col>
                      )}
                      <Col md="4">
                        <div className="form-group">
                          <label className="form-label">Expiration Date</label>
                          <input
                            className="form-control"
                            type="date"
                            value={couponDraft.expirationDate}
                            onChange={(e) => setCouponDraft((d) => ({ ...d, expirationDate: e.target.value }))}
                          />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group">
                          <label className="form-label">Usage Limit</label>
                          <input
                            className="form-control"
                            type="number"
                            min="1"
                            value={couponDraft.usageLimit}
                            onChange={(e) => setCouponDraft((d) => ({ ...d, usageLimit: e.target.value }))}
                            placeholder="Unlimited"
                          />
                        </div>
                      </Col>
                      <Col md="4" className="d-flex align-items-end">
                        <Button color="primary" onClick={addCoupon} disabled={couponSaving || !couponDraft.code}>
                          {couponSaving ? <Spinner size="sm" /> : <><Icon name="plus" /><span>Add Code</span></>}
                        </Button>
                      </Col>
                    </Row>
                  </div>
                </div>
              </TabPane>

              {/* ── Usage History ── */}
              <TabPane tabId="usage">
                {usagesLoading ? (
                  <div className="text-center py-4"><Spinner /></div>
                ) : usages.length === 0 ? (
                  <p className="text-muted py-3">No usage history for this promotion yet.</p>
                ) : (
                  <>
                    <DataTable>
                      <DataTableBody>
                        <DataTableHead>
                          <DataTableRow><span className="sub-text">Order ID</span></DataTableRow>
                          <DataTableRow><span className="sub-text">Customer</span></DataTableRow>
                          <DataTableRow><span className="sub-text">Order Total</span></DataTableRow>
                          <DataTableRow><span className="sub-text">Used At</span></DataTableRow>
                        </DataTableHead>
                        {usages.map((u) => (
                          <DataTableItem key={u.id}>
                            <DataTableRow>
                              <code className="text-soft" style={{ fontSize: "0.8em" }}>{u.orderId?.slice(0, 8)}…</code>
                            </DataTableRow>
                            <DataTableRow>
                              <span>{u.user?.emailAddress ?? "—"}</span>
                            </DataTableRow>
                            <DataTableRow>
                              <span className="fw-medium">${Number(u.order?.grandTotal ?? 0).toFixed(2)}</span>
                            </DataTableRow>
                            <DataTableRow>
                              <span className="text-soft">{fmtDateTime(u.usedAt)}</span>
                            </DataTableRow>
                          </DataTableItem>
                        ))}
                      </DataTableBody>
                    </DataTable>
                    {usageTotal > 10 && (
                      <div className="mt-3">
                        <PaginationComponent
                          itemPerPage={10}
                          totalItems={usageTotal}
                          paginate={(p) => loadUsages(p)}
                          currentPage={usagePage}
                        />
                      </div>
                    )}
                  </>
                )}
              </TabPane>
            </TabContent>
          </div>
        </ModalBody>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
        <ModalBody>
          <div className="p-2 text-center">
            <Icon name="alert-circle" style={{ fontSize: 40, color: "#e85347" }} />
            <h5 className="mt-2">Delete Promotion?</h5>
            <p className="text-soft">
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              All associated coupon codes and usage history will be removed. This cannot be undone.
            </p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <Button color="danger" onClick={doDelete} disabled={deleteLoading}>
                {deleteLoading ? <Spinner size="sm" /> : "Delete"}
              </Button>
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

// ─── PromoFormBasic — basic info only for edit modal ─────────────────────────

function PromoFormBasic({ form, setForm }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const needsRate = form.promotionType !== "free_shipping";
  const rateLabel = form.promotionType === "percent" ? "Discount Percentage (%)" : "Discount Amount ($)";

  return (
    <Row className="g-3">
      <Col md="8">
        <div className="form-group">
          <label className="form-label">Name <span className="text-danger">*</span></label>
          <input className="form-control" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Summer Sale 20%" />
        </div>
      </Col>
      <Col md="4">
        <div className="form-group">
          <label className="form-label">Promotion Type <span className="text-danger">*</span></label>
          <RSelect
            options={TYPE_OPTIONS}
            value={TYPE_OPTIONS.find((t) => t.value === form.promotionType) ?? null}
            onChange={(v) => set("promotionType", v?.value ?? "percent")}
          />
        </div>
      </Col>
      <Col md="12">
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional description shown to customers" />
        </div>
      </Col>
      {needsRate && (
        <Col md="4">
          <div className="form-group">
            <label className="form-label">{rateLabel}</label>
            <input className="form-control" type="number" step={form.promotionType === "percent" ? "1" : "0.01"} min="0" max={form.promotionType === "percent" ? "100" : undefined} value={form.discountRate} onChange={(e) => set("discountRate", e.target.value)} placeholder={form.promotionType === "percent" ? "20" : "5.00"} />
          </div>
        </Col>
      )}
      <Col md="4">
        <div className="form-group">
          <label className="form-label">Minimum Subtotal ($)</label>
          <input className="form-control" type="number" step="0.01" min="0" value={form.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} placeholder="0.00 (no minimum)" />
        </div>
      </Col>
      <Col md="4">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-control" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </div>
      </Col>
      <Col md="4">
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input className="form-control" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
      </Col>
      <Col md="4" className="d-flex align-items-end gap-4">
        <div className="custom-control custom-switch mb-0">
          <input type="checkbox" className="custom-control-input" id="edit-stackable" checked={form.stackable} onChange={(e) => set("stackable", e.target.checked)} />
          <label className="custom-control-label" htmlFor="edit-stackable">Stackable</label>
        </div>
        <div className="custom-control custom-switch mb-0">
          <input type="checkbox" className="custom-control-input" id="edit-active" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          <label className="custom-control-label" htmlFor="edit-active">Active</label>
        </div>
      </Col>
    </Row>
  );
}

// ─── PromoForm — full form used in Add modal ──────────────────────────────────

function PromoForm({ form, setForm, productOptions, categoryOptions }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const needsRate = form.promotionType !== "free_shipping";
  const rateLabel = form.promotionType === "percent" ? "Discount Percentage (%)" : "Discount Amount ($)";

  return (
    <Row className="g-3">
      <Col md="8">
        <div className="form-group">
          <label className="form-label">Name <span className="text-danger">*</span></label>
          <input className="form-control" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Summer Sale 20%" />
        </div>
      </Col>
      <Col md="4">
        <div className="form-group">
          <label className="form-label">Promotion Type <span className="text-danger">*</span></label>
          <RSelect
            options={TYPE_OPTIONS}
            value={TYPE_OPTIONS.find((t) => t.value === form.promotionType) ?? null}
            onChange={(v) => set("promotionType", v?.value ?? "percent")}
          />
        </div>
      </Col>
      <Col md="12">
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional description shown to customers" />
        </div>
      </Col>
      {needsRate && (
        <Col md="4">
          <div className="form-group">
            <label className="form-label">{rateLabel}</label>
            <input className="form-control" type="number" step={form.promotionType === "percent" ? "1" : "0.01"} min="0" max={form.promotionType === "percent" ? "100" : undefined} value={form.discountRate} onChange={(e) => set("discountRate", e.target.value)} placeholder={form.promotionType === "percent" ? "20" : "5.00"} />
          </div>
        </Col>
      )}
      <Col md="4">
        <div className="form-group">
          <label className="form-label">Minimum Subtotal ($)</label>
          <input className="form-control" type="number" step="0.01" min="0" value={form.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} placeholder="0.00 (no minimum)" />
        </div>
      </Col>
      <Col md="4">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input className="form-control" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </div>
      </Col>
      <Col md="4">
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input className="form-control" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
      </Col>
      <Col md="12">
        <div className="form-group">
          <label className="form-label">Apply to Categories <span className="text-soft">(leave empty for all)</span></label>
          <RSelect
            options={categoryOptions}
            value={form.categoryIds}
            onChange={(v) => set("categoryIds", v ?? [])}
            isMulti
            placeholder="All categories"
          />
        </div>
      </Col>
      <Col md="12">
        <div className="form-group">
          <label className="form-label">Apply to Specific Products <span className="text-soft">(leave empty for all)</span></label>
          <RSelect
            options={productOptions}
            value={form.productIds}
            onChange={(v) => set("productIds", v ?? [])}
            isMulti
            placeholder="All products"
          />
        </div>
      </Col>
      <Col md="12" className="d-flex gap-4">
        <div className="custom-control custom-switch">
          <input type="checkbox" className="custom-control-input" id="add-stackable" checked={form.stackable} onChange={(e) => set("stackable", e.target.checked)} />
          <label className="custom-control-label" htmlFor="add-stackable">Stackable with other promotions</label>
        </div>
        <div className="custom-control custom-switch">
          <input type="checkbox" className="custom-control-input" id="add-active" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          <label className="custom-control-label" htmlFor="add-active">Active immediately</label>
        </div>
      </Col>
    </Row>
  );
}

export default AdminPromotionList;
