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
  blockedDate: "",
  maxOrdersPerDay: "",
  leadTimeDays: "",
  cutoffHour: "",
  reason: "",
  isActive: true,
});

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "—";

const AdminCateringAvailability = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [modal, setModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/catering/availability?limit=100");
      setRecords(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const openCreate = () => {
    setEditRecord(null);
    setForm(blankForm());
    setFormError(null);
    setModal(true);
  };

  const openEdit = (rec) => {
    setEditRecord(rec);
    setForm({
      blockedDate: rec.blockedDate ? rec.blockedDate.split("T")[0] : "",
      maxOrdersPerDay: rec.maxOrdersPerDay ?? "",
      leadTimeDays: rec.leadTimeDays ?? "",
      cutoffHour: rec.cutoffHour ?? "",
      reason: rec.reason || "",
      isActive: rec.isActive ?? true,
    });
    setFormError(null);
    setModal(true);
  };

  const saveRecord = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        blockedDate: form.blockedDate || null,
        maxOrdersPerDay: form.maxOrdersPerDay ? Number(form.maxOrdersPerDay) : undefined,
        leadTimeDays: form.leadTimeDays !== "" ? Number(form.leadTimeDays) : undefined,
        cutoffHour: form.cutoffHour !== "" ? Number(form.cutoffHour) : undefined,
        reason: form.reason || null,
        isActive: form.isActive,
      };
      if (editRecord) {
        await apiPatch(`/catering/availability/${editRecord.id}`, body);
      } else {
        await apiPost("/catering/availability", body);
      }
      setModal(false);
      setSuccess(editRecord ? "Availability record updated." : "Availability record created.");
      loadRecords();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (rec) => {
    setDeleteTarget(rec);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/catering/availability/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setSuccess("Availability record deleted.");
      loadRecords();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const getTypeLabel = (rec) => {
    if (rec.blockedDate) return "Blocked Date";
    return "Default Rule";
  };

  const getTypeBadge = (rec) => {
    if (rec.blockedDate) return <Badge color="danger">Blocked Date</Badge>;
    return <Badge color="info">Default Rule</Badge>;
  };

  return (
    <>
      <Head title="Catering Availability" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Availability</BlockTitle>
              <BlockDes className="text-soft">
                <p>Manage blocked dates, daily order limits, lead times, and cutoff hours for catering.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreate}>
                <Icon name="plus" /> <span>Add Record</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" className="mb-3" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>{success}</Alert>}

        {loading ? (
          <div className="text-center py-5"><Spinner /></div>
        ) : records.length === 0 ? (
          <Block>
            <div className="text-center text-soft py-5">No availability records yet.</div>
          </Block>
        ) : (
          <Block>
            <DataTable className="card-stretch">
              <DataTableBody>
                <DataTableHead>
                  <DataTableRow>
                    <span className="sub-text">Type</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">Blocked Date</span>
                  </DataTableRow>
                  <DataTableRow>
                    <span className="sub-text">Max Orders/Day</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">Lead Time (days)</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">Cutoff Hour</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="sub-text">Reason</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <span className="sub-text">Status</span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools">
                    <span className="sub-text">Actions</span>
                  </DataTableRow>
                </DataTableHead>
                {records.map((rec) => (
                  <DataTableItem key={rec.id}>
                    <DataTableRow>
                      {getTypeBadge(rec)}
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span>{rec.blockedDate ? fmtDate(rec.blockedDate) : "—"}</span>
                    </DataTableRow>
                    <DataTableRow>
                      <span>{rec.maxOrdersPerDay ?? "—"}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span>{rec.leadTimeDays ?? "—"}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span>{rec.cutoffHour != null ? `${rec.cutoffHour}:00` : "—"}</span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span className="text-soft">{rec.reason || "—"}</span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <Badge color={rec.isActive ? "success" : "light"} pill>
                        {rec.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools">
                      <ul className="nk-tb-actions gx-1">
                        <li>
                          <Button size="sm" color="primary" outline onClick={() => openEdit(rec)}>
                            <Icon name="edit" />
                          </Button>
                        </li>
                        <li>
                          <Button size="sm" color="danger" outline onClick={() => openDelete(rec)}>
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
          {editRecord ? "Edit Availability Record" : "Add Availability Record"}
        </ModalHeader>
        <ModalBody>
          {formError && <Alert color="danger" className="mb-3">{formError}</Alert>}
          <Row className="g-3">
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Blocked Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.blockedDate}
                  onChange={(e) => setField("blockedDate", e.target.value)}
                />
                <span className="form-note">Leave empty for a default/global rule.</span>
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Max Orders Per Day</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.maxOrdersPerDay}
                  onChange={(e) => setField("maxOrdersPerDay", e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Lead Time (days)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.leadTimeDays}
                  onChange={(e) => setField("leadTimeDays", e.target.value)}
                  placeholder="e.g. 2"
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Cutoff Hour (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="form-control"
                  value={form.cutoffHour}
                  onChange={(e) => setField("cutoffHour", e.target.value)}
                  placeholder="e.g. 17"
                />
                <span className="form-note">Hour of day (24h) after which orders for the next day are cut off.</span>
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Active</label>
                <div className="custom-control custom-switch mt-1">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="avail-active-toggle"
                    checked={form.isActive}
                    onChange={(e) => setField("isActive", e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="avail-active-toggle">
                    {form.isActive ? "Active" : "Inactive"}
                  </label>
                </div>
              </div>
            </Col>
            <Col md="12">
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea
                  className="form-control"
                  value={form.reason}
                  onChange={(e) => setField("reason", e.target.value)}
                  rows="2"
                  placeholder="e.g. Holiday closure, Private event, etc."
                />
              </div>
            </Col>
            <Col md="12" className="text-end">
              <Button color="light" className="me-2" onClick={() => setModal(false)}>Cancel</Button>
              <Button color="primary" onClick={saveRecord} disabled={saving}>
                {saving ? <Spinner size="sm" /> : editRecord ? "Update" : "Create"}
              </Button>
            </Col>
          </Row>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
        <ModalHeader toggle={() => setDeleteModal(false)}>Delete Availability Record</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete this availability record?</p>
          {deleteTarget && (
            <p className="text-soft">
              {deleteTarget.blockedDate ? `Blocked: ${fmtDate(deleteTarget.blockedDate)}` : "Default Rule"}
              {deleteTarget.reason ? ` — ${deleteTarget.reason}` : ""}
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

export default AdminCateringAvailability;
