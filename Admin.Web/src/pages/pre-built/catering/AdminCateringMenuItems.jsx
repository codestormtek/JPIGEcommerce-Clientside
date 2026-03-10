import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalHeader, Spinner, Alert, Badge } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const CATEGORIES = [
  { value: "MEAT", label: "Meat" },
  { value: "SIDE", label: "Side" },
  { value: "BREAD", label: "Bread" },
  { value: "SAUCE", label: "Sauce" },
  { value: "DRINK", label: "Drink" },
  { value: "DESSERT", label: "Dessert" },
];

const PRICING_TYPES = [
  { value: "PER_LB", label: "Per Lb" },
  { value: "PER_RACK", label: "Per Rack" },
  { value: "PER_DOZEN", label: "Per Dozen" },
  { value: "PER_PIECE", label: "Per Piece" },
  { value: "PER_HALF_PAN", label: "Per Half Pan" },
  { value: "PER_FULL_PAN", label: "Per Full Pan" },
  { value: "PER_GALLON", label: "Per Gallon" },
  { value: "PER_BOTTLE", label: "Per Bottle" },
];

const CATEGORY_COLORS = {
  MEAT: "danger",
  SIDE: "success",
  BREAD: "warning",
  SAUCE: "info",
  DRINK: "primary",
  DESSERT: "pink",
};

const blankForm = () => ({
  name: "",
  category: "MEAT",
  description: "",
  pricingType: "PER_LB",
  unitPrice: "",
  isPremium: false,
  isActive: true,
  minOrderQty: "",
  maxOrderQty: "",
  portionUnit: "",
  displayOrder: 0,
  mediaAssetId: "",
});

const AdminCateringMenuItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");

  const [formModal, setFormModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = "/catering/menu-items?limit=100&orderBy=displayOrder&order=asc";
      if (filterCategory) url += `&category=${filterCategory}`;
      const res = await apiGet(url);
      setItems(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm(blankForm());
    setFormError(null);
    setFormModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || "",
      category: item.category || "MEAT",
      description: item.description || "",
      pricingType: item.pricingType || "PER_LB",
      unitPrice: item.unitPrice ?? "",
      isPremium: item.isPremium ?? false,
      isActive: item.isActive ?? true,
      minOrderQty: item.minOrderQty ?? "",
      maxOrderQty: item.maxOrderQty ?? "",
      portionUnit: item.portionUnit || "",
      displayOrder: item.displayOrder ?? 0,
      mediaAssetId: item.mediaAssetId || "",
    });
    setFormError(null);
    setFormModal(true);
  };

  const saveItem = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        pricingType: form.pricingType,
        unitPrice: Number(form.unitPrice),
        isPremium: form.isPremium,
        isActive: form.isActive,
        minOrderQty: form.minOrderQty ? Number(form.minOrderQty) : null,
        maxOrderQty: form.maxOrderQty ? Number(form.maxOrderQty) : null,
        portionUnit: form.portionUnit || null,
        displayOrder: Number(form.displayOrder),
        mediaAssetId: form.mediaAssetId || null,
      };
      if (editItem) {
        await apiPatch(`/catering/menu-items/${editItem.id}`, body);
      } else {
        await apiPost("/catering/menu-items", body);
      }
      setFormModal(false);
      setSuccess(editItem ? "Menu item updated." : "Menu item created.");
      loadItems();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (item) => {
    setDeleteTarget(item);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/catering/menu-items/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setSuccess("Menu item deleted.");
      loadItems();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await apiPatch(`/catering/menu-items/${item.id}`, { isActive: !item.isActive });
      setSuccess(`${item.name} ${item.isActive ? "deactivated" : "activated"}.`);
      loadItems();
    } catch (e) {
      setError(e.message);
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const filteredItems = search
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <>
      <Head title="Catering Menu Items" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Catering Menu Items</BlockTitle>
              <BlockDes className="text-soft">
                <p>Manage menu items available for catering orders.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreate}>
                <Icon name="plus" /> <span>Add Menu Item</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && (
          <Alert color="danger" className="mb-3" toggle={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Block>
          <div className="card card-bordered">
            <div className="card-inner border-bottom py-3">
              <Row className="g-3 align-items-center">
                <Col md="4">
                  <div className="form-control-wrap">
                    <div className="form-icon form-icon-left">
                      <Icon name="search" />
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </Col>
                <Col md="3">
                  <select
                    className="form-select"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Col>
              </Row>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <Spinner />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center text-soft py-5">
                No menu items found. Click "Add Menu Item" to create one.
              </div>
            ) : (
              <div className="nk-tb-list nk-tb-ulist">
                <div className="nk-tb-item nk-tb-head">
                  <div className="nk-tb-col">
                    <span className="sub-text">Name</span>
                  </div>
                  <div className="nk-tb-col tb-col-md">
                    <span className="sub-text">Category</span>
                  </div>
                  <div className="nk-tb-col tb-col-md">
                    <span className="sub-text">Pricing Type</span>
                  </div>
                  <div className="nk-tb-col tb-col-sm">
                    <span className="sub-text">Unit Price</span>
                  </div>
                  <div className="nk-tb-col tb-col-md">
                    <span className="sub-text">Premium</span>
                  </div>
                  <div className="nk-tb-col tb-col-sm">
                    <span className="sub-text">Active</span>
                  </div>
                  <div className="nk-tb-col tb-col-lg">
                    <span className="sub-text">Order</span>
                  </div>
                  <div className="nk-tb-col nk-tb-col-tools">
                    <span className="sub-text">Actions</span>
                  </div>
                </div>
                {filteredItems.map((item) => (
                  <div className="nk-tb-item" key={item.id}>
                    <div className="nk-tb-col">
                      <span className="tb-lead">{item.name}</span>
                      {item.description && (
                        <span className="tb-sub d-block text-soft" style={{ maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.description}
                        </span>
                      )}
                    </div>
                    <div className="nk-tb-col tb-col-md">
                      <Badge color={CATEGORY_COLORS[item.category] || "secondary"} className="text-uppercase">
                        {item.category}
                      </Badge>
                    </div>
                    <div className="nk-tb-col tb-col-md">
                      <span>{PRICING_TYPES.find((p) => p.value === item.pricingType)?.label || item.pricingType}</span>
                    </div>
                    <div className="nk-tb-col tb-col-sm">
                      <span className="tb-amount">
                        ${Number(item.unitPrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="nk-tb-col tb-col-md">
                      {item.isPremium ? (
                        <Badge color="warning" pill>
                          Premium
                        </Badge>
                      ) : (
                        <span className="text-soft">—</span>
                      )}
                    </div>
                    <div className="nk-tb-col tb-col-sm">
                      <div
                        className={`custom-control custom-switch`}
                        onClick={() => toggleActive(item)}
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          checked={item.isActive}
                          readOnly
                        />
                        <label className="custom-control-label" style={{ pointerEvents: "none" }}>
                          {item.isActive ? "Yes" : "No"}
                        </label>
                      </div>
                    </div>
                    <div className="nk-tb-col tb-col-lg">
                      <span>{item.displayOrder}</span>
                    </div>
                    <div className="nk-tb-col nk-tb-col-tools">
                      <ul className="nk-tb-actions gx-1">
                        <li>
                          <Button size="sm" color="primary" outline onClick={() => openEdit(item)}>
                            <Icon name="edit" />
                          </Button>
                        </li>
                        <li>
                          <Button size="sm" color="danger" outline onClick={() => openDelete(item)}>
                            <Icon name="trash" />
                          </Button>
                        </li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Block>
      </Content>

      <Modal isOpen={formModal} toggle={() => setFormModal(false)} size="lg">
        <ModalHeader toggle={() => setFormModal(false)}>
          {editItem ? "Edit Menu Item" : "Add Menu Item"}
        </ModalHeader>
        <ModalBody>
          {formError && (
            <Alert color="danger" className="mb-3">
              {formError}
            </Alert>
          )}
          <Row className="g-3">
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Pulled Pork"
                />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Pricing Type *</label>
                <select
                  className="form-select"
                  value={form.pricingType}
                  onChange={(e) => setField("pricingType", e.target.value)}
                >
                  {PRICING_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Unit Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  value={form.unitPrice}
                  onChange={(e) => setField("unitPrice", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </Col>
            <Col md="12">
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Optional description..."
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Min Order Qty</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-control"
                  value={form.minOrderQty}
                  onChange={(e) => setField("minOrderQty", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Max Order Qty</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-control"
                  value={form.maxOrderQty}
                  onChange={(e) => setField("maxOrderQty", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Portion Unit</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.portionUnit}
                  onChange={(e) => setField("portionUnit", e.target.value)}
                  placeholder="e.g. lbs, pieces"
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Display Order</label>
                <input
                  type="number"
                  step="1"
                  className="form-control"
                  value={form.displayOrder}
                  onChange={(e) => setField("displayOrder", e.target.value)}
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group pt-md-4">
                <div className="custom-control custom-switch">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="isPremium"
                    checked={form.isPremium}
                    onChange={(e) => setField("isPremium", e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="isPremium">
                    Premium Item
                  </label>
                </div>
              </div>
            </Col>
            <Col md="4">
              <div className="form-group pt-md-4">
                <div className="custom-control custom-switch">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="isActive">
                    Active
                  </label>
                </div>
              </div>
            </Col>
          </Row>
          <div className="mt-4 d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setFormModal(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={saveItem} disabled={saving || !form.name || !form.unitPrice}>
              {saving ? <Spinner size="sm" /> : editItem ? "Update" : "Create"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
        <ModalHeader toggle={() => setDeleteModal(false)}>Delete Menu Item</ModalHeader>
        <ModalBody>
          <p>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button color="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : "Delete"}
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default AdminCateringMenuItems;
