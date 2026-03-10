import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, ModalHeader, Spinner, Alert } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const APPETITE_LEVELS = ["LIGHT", "MODERATE", "HEAVY"];
const APPETITE_COLORS = { LIGHT: "info", MODERATE: "warning", HEAVY: "danger" };

const blankForm = () => ({
  menuItemId: "",
  appetiteLevel: "MODERATE",
  qtyPerPerson: "",
  unitOfMeasure: "",
  minGuests: "",
  maxGuests: "",
  notes: "",
});

const AdminCateringPortionRules = () => {
  const [rules, setRules] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [modal, setModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [filterMenuItem, setFilterMenuItem] = useState("");
  const [filterAppetite, setFilterAppetite] = useState("");

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterMenuItem) params.set("menuItemId", filterMenuItem);
      if (filterAppetite) params.set("appetiteLevel", filterAppetite);
      const res = await apiGet(`/catering/portion-rules?${params}`);
      setRules(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterMenuItem, filterAppetite]);

  const loadMenuItems = useCallback(async () => {
    try {
      const res = await apiGet("/catering/menu-items?limit=100&isActive=true");
      setMenuItems(res?.data ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const openCreate = () => {
    setEditRule(null);
    setForm(blankForm());
    setFormError(null);
    setModal(true);
  };

  const openEdit = (rule) => {
    setEditRule(rule);
    setForm({
      menuItemId: rule.menuItemId || "",
      appetiteLevel: rule.appetiteLevel || "MODERATE",
      qtyPerPerson: rule.qtyPerPerson ?? "",
      unitOfMeasure: rule.unitOfMeasure || "",
      minGuests: rule.minGuests ?? "",
      maxGuests: rule.maxGuests ?? "",
      notes: rule.notes || "",
    });
    setFormError(null);
    setModal(true);
  };

  const saveRule = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        menuItemId: form.menuItemId,
        appetiteLevel: form.appetiteLevel,
        qtyPerPerson: Number(form.qtyPerPerson),
        unitOfMeasure: form.unitOfMeasure,
        minGuests: form.minGuests ? Number(form.minGuests) : null,
        maxGuests: form.maxGuests ? Number(form.maxGuests) : null,
        notes: form.notes || null,
      };
      if (editRule) {
        await apiPatch(`/catering/portion-rules/${editRule.id}`, body);
      } else {
        await apiPost("/catering/portion-rules", body);
      }
      setModal(false);
      setSuccess(editRule ? "Portion rule updated." : "Portion rule created.");
      loadRules();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (rule) => {
    setDeleteTarget(rule);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/catering/portion-rules/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setSuccess("Portion rule deleted.");
      loadRules();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const getMenuItemName = (id) => {
    const item = menuItems.find((m) => m.id === id);
    return item ? item.name : id;
  };

  return (
    <>
      <Head title="Catering Portion Rules" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Portion Rules</BlockTitle>
              <BlockDes className="text-soft">
                <p>Define how much of each menu item to serve per person based on appetite level.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreate}>
                <Icon name="plus" /> <span>Add Rule</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" className="mb-3" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>{success}</Alert>}

        <Block>
          <Row className="g-3 mb-3">
            <Col md="4">
              <select
                className="form-select form-select-sm"
                value={filterMenuItem}
                onChange={(e) => setFilterMenuItem(e.target.value)}
              >
                <option value="">All Menu Items</option>
                {menuItems.map((mi) => (
                  <option key={mi.id} value={mi.id}>{mi.name}</option>
                ))}
              </select>
            </Col>
            <Col md="3">
              <select
                className="form-select form-select-sm"
                value={filterAppetite}
                onChange={(e) => setFilterAppetite(e.target.value)}
              >
                <option value="">All Appetite Levels</option>
                {APPETITE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </Col>
          </Row>
        </Block>

        {loading ? (
          <div className="text-center py-5"><Spinner /></div>
        ) : rules.length === 0 ? (
          <Block>
            <div className="text-center text-soft py-5">No portion rules found.</div>
          </Block>
        ) : (
          <Block>
            <DataTable className="card-stretch">
              <DataTableBody>
                <DataTableHead>
                  <DataTableRow>
                    <span className="sub-text">Menu Item</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">Appetite Level</span>
                  </DataTableRow>
                  <DataTableRow>
                    <span className="sub-text">Qty / Person</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">Unit</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="sub-text">Guest Range</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="sub-text">Notes</span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools">
                    <span className="sub-text">Actions</span>
                  </DataTableRow>
                </DataTableHead>
                {rules.map((rule) => (
                  <DataTableItem key={rule.id}>
                    <DataTableRow>
                      <span className="fw-bold">{rule.menuItem?.name || getMenuItemName(rule.menuItemId)}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className={`badge bg-${APPETITE_COLORS[rule.appetiteLevel] || "secondary"}`}>
                        {rule.appetiteLevel}
                      </span>
                    </DataTableRow>
                    <DataTableRow>
                      <span>{Number(rule.qtyPerPerson).toFixed(2)}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span>{rule.unitOfMeasure}</span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span>
                        {rule.minGuests || rule.maxGuests
                          ? `${rule.minGuests ?? "—"} – ${rule.maxGuests ?? "—"}`
                          : "Any"}
                      </span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span className="text-soft">{rule.notes || "—"}</span>
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools">
                      <ul className="nk-tb-actions gx-1">
                        <li>
                          <Button size="sm" color="primary" outline onClick={() => openEdit(rule)}>
                            <Icon name="edit" />
                          </Button>
                        </li>
                        <li>
                          <Button size="sm" color="danger" outline onClick={() => openDelete(rule)}>
                            <Icon name="trash" />
                          </Button>
                        </li>
                      </ul>
                    </DataTableRow>
                  </DataTableItem>
                ))}
              </DataTableBody>
            </DataTable>
          </Block>
        )}
      </Content>

      <Modal isOpen={modal} toggle={() => setModal(false)} size="lg">
        <ModalHeader toggle={() => setModal(false)}>
          {editRule ? "Edit Portion Rule" : "Add Portion Rule"}
        </ModalHeader>
        <ModalBody>
          {formError && <Alert color="danger" className="mb-3">{formError}</Alert>}
          <Row className="g-3">
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Menu Item *</label>
                <select className="form-select" value={form.menuItemId} onChange={(e) => setField("menuItemId", e.target.value)}>
                  <option value="">Select menu item...</option>
                  {menuItems.map((mi) => (
                    <option key={mi.id} value={mi.id}>{mi.name} ({mi.category})</option>
                  ))}
                </select>
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Appetite Level *</label>
                <select className="form-select" value={form.appetiteLevel} onChange={(e) => setField("appetiteLevel", e.target.value)}>
                  {APPETITE_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Qty Per Person *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={form.qtyPerPerson}
                  onChange={(e) => setField("qtyPerPerson", e.target.value)}
                  placeholder="e.g. 0.33"
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Unit of Measure *</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.unitOfMeasure}
                  onChange={(e) => setField("unitOfMeasure", e.target.value)}
                  placeholder="e.g. lb, piece, dozen"
                />
              </div>
            </Col>
            <Col md="2">
              <div className="form-group">
                <label className="form-label">Min Guests</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.minGuests}
                  onChange={(e) => setField("minGuests", e.target.value)}
                />
              </div>
            </Col>
            <Col md="2">
              <div className="form-group">
                <label className="form-label">Max Guests</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.maxGuests}
                  onChange={(e) => setField("maxGuests", e.target.value)}
                />
              </div>
            </Col>
            <Col md="12">
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows="2"
                />
              </div>
            </Col>
            <Col md="12" className="text-end">
              <Button color="light" className="me-2" onClick={() => setModal(false)}>Cancel</Button>
              <Button color="primary" onClick={saveRule} disabled={saving}>
                {saving ? <Spinner size="sm" /> : editRule ? "Update" : "Create"}
              </Button>
            </Col>
          </Row>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
        <ModalHeader toggle={() => setDeleteModal(false)}>Delete Portion Rule</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete this portion rule?</p>
          {deleteTarget && (
            <p className="text-soft">
              {deleteTarget.menuItem?.name || getMenuItemName(deleteTarget.menuItemId)} — {deleteTarget.appetiteLevel} — {Number(deleteTarget.qtyPerPerson).toFixed(2)} {deleteTarget.unitOfMeasure}
            </p>
          )}
          <div className="text-end">
            <Button color="light" className="me-2" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button color="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : "Delete"}
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default AdminCateringPortionRules;
