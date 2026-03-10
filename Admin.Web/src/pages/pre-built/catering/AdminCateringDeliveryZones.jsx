import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, ModalHeader, Spinner, Alert, Badge } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const blankForm = () => ({
  name: "",
  zipCodes: "",
  radiusMiles: "",
  fee: "",
  minOrderAmount: "",
  isActive: true,
  displayOrder: 0,
});

const AdminCateringDeliveryZones = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [modal, setModal] = useState(false);
  const [editZone, setEditZone] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/catering/delivery-zones?limit=100");
      setZones(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const openCreate = () => {
    setEditZone(null);
    setForm(blankForm());
    setFormError(null);
    setModal(true);
  };

  const openEdit = (zone) => {
    setEditZone(zone);
    setForm({
      name: zone.name || "",
      zipCodes: Array.isArray(zone.zipCodes) ? zone.zipCodes.join(", ") : "",
      radiusMiles: zone.radiusMiles ?? "",
      fee: zone.fee ?? "",
      minOrderAmount: zone.minOrderAmount ?? "",
      isActive: zone.isActive ?? true,
      displayOrder: zone.displayOrder ?? 0,
    });
    setFormError(null);
    setModal(true);
  };

  const saveZone = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const zipArr = form.zipCodes
        .split(/[,\s]+/)
        .map((z) => z.trim())
        .filter(Boolean);
      const body = {
        name: form.name,
        zipCodes: zipArr,
        radiusMiles: form.radiusMiles ? Number(form.radiusMiles) : null,
        fee: Number(form.fee),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder),
      };
      if (editZone) {
        await apiPatch(`/catering/delivery-zones/${editZone.id}`, body);
      } else {
        await apiPost("/catering/delivery-zones", body);
      }
      setModal(false);
      setSuccess(editZone ? "Delivery zone updated." : "Delivery zone created.");
      loadZones();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (zone) => {
    setDeleteTarget(zone);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/catering/delivery-zones/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setSuccess("Delivery zone deleted.");
      loadZones();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fmtCurrency = (v) => {
    const n = Number(v);
    return isNaN(n) ? "—" : `$${n.toFixed(2)}`;
  };

  return (
    <>
      <Head title="Catering Delivery Zones" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Delivery Zones</BlockTitle>
              <BlockDes className="text-soft">
                <p>Manage delivery zones, ZIP codes, fees, and minimum order amounts for catering.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreate}>
                <Icon name="plus" /> <span>Add Zone</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" className="mb-3" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>{success}</Alert>}

        {loading ? (
          <div className="text-center py-5"><Spinner /></div>
        ) : zones.length === 0 ? (
          <Block>
            <div className="text-center text-soft py-5">No delivery zones yet.</div>
          </Block>
        ) : (
          <Block>
            <DataTable className="card-stretch">
              <DataTableBody>
                <DataTableHead>
                  <DataTableRow>
                    <span className="sub-text">Zone Name</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">ZIP Codes</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="sub-text">Radius (mi)</span>
                  </DataTableRow>
                  <DataTableRow>
                    <span className="sub-text">Fee</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">Min Order</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <span className="sub-text">Status</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="sub-text">Order</span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools">
                    <span className="sub-text">Actions</span>
                  </DataTableRow>
                </DataTableHead>
                {zones.map((zone) => (
                  <DataTableItem key={zone.id}>
                    <DataTableRow>
                      <span className="fw-bold">{zone.name}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className="text-soft" style={{ fontSize: "0.82rem" }}>
                        {Array.isArray(zone.zipCodes) ? zone.zipCodes.join(", ") : "—"}
                      </span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span>{zone.radiusMiles ?? "—"}</span>
                    </DataTableRow>
                    <DataTableRow>
                      <span className="fw-medium">{fmtCurrency(zone.fee)}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span>{zone.minOrderAmount ? fmtCurrency(zone.minOrderAmount) : "—"}</span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <Badge color={zone.isActive ? "success" : "light"} pill>
                        {zone.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span>{zone.displayOrder ?? 0}</span>
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools">
                      <ul className="nk-tb-actions gx-1">
                        <li>
                          <Button size="sm" color="primary" outline onClick={() => openEdit(zone)}>
                            <Icon name="edit" />
                          </Button>
                        </li>
                        <li>
                          <Button size="sm" color="danger" outline onClick={() => openDelete(zone)}>
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
          {editZone ? "Edit Delivery Zone" : "Add Delivery Zone"}
        </ModalHeader>
        <ModalBody>
          {formError && <Alert color="danger" className="mb-3">{formError}</Alert>}
          <Row className="g-3">
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Zone Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Local (0-10 mi)"
                />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">ZIP Codes * (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.zipCodes}
                  onChange={(e) => setField("zipCodes", e.target.value)}
                  placeholder="e.g. 30301, 30302, 30303"
                />
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label">Radius (miles)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={form.radiusMiles}
                  onChange={(e) => setField("radiusMiles", e.target.value)}
                />
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label">Delivery Fee *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={form.fee}
                  onChange={(e) => setField("fee", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label">Min Order Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={form.minOrderAmount}
                  onChange={(e) => setField("minOrderAmount", e.target.value)}
                />
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label">Display Order</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.displayOrder}
                  onChange={(e) => setField("displayOrder", e.target.value)}
                />
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label">Active</label>
                <div className="custom-control custom-switch mt-1">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="zone-active-toggle"
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="zone-active-toggle">
                    {form.isActive ? "Active" : "Inactive"}
                  </label>
                </div>
              </div>
            </Col>
            <Col md="12" className="text-end">
              <Button color="light" className="me-2" onClick={() => setModal(false)}>Cancel</Button>
              <Button color="primary" onClick={saveZone} disabled={saving}>
                {saving ? <Spinner size="sm" /> : editZone ? "Update" : "Create"}
              </Button>
            </Col>
          </Row>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
        <ModalHeader toggle={() => setDeleteModal(false)}>Delete Delivery Zone</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete this delivery zone?</p>
          {deleteTarget && <p className="fw-bold">{deleteTarget.name}</p>}
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

export default AdminCateringDeliveryZones;
