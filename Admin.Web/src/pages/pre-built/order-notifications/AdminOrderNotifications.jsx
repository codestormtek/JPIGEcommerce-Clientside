import React, { useState, useEffect, useCallback } from "react";
import {
  Spinner, Alert, Badge, Input, Modal, ModalBody, ModalHeader, ModalFooter,
} from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const emptyForm = { label: "", phoneNumber: "", isActive: true };

const AdminOrderNotifications = () => {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // recipient id or null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [testingId, setTestingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/admin/order-notifications");
      setRecipients(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r.id);
    setForm({ label: r.label || "", phoneNumber: r.phoneNumber || "", isActive: r.isActive });
    setError(null);
    setModalOpen(true);
  };

  const saveRecipient = async () => {
    if (!form.phoneNumber.trim()) {
      setError("Enter a phone number.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        label: form.label.trim() || null,
        phoneNumber: form.phoneNumber.trim(),
        isActive: form.isActive,
      };
      if (editing) {
        await apiPatch(`/admin/order-notifications/${editing}`, payload);
        setSuccess("Recipient updated.");
      } else {
        await apiPost("/admin/order-notifications", payload);
        setSuccess("Recipient added.");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r) => {
    try {
      await apiPatch(`/admin/order-notifications/${r.id}`, { isActive: !r.isActive });
      setRecipients((prev) => prev.map((x) => (x.id === r.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const sendTest = async (r) => {
    setTestingId(r.id);
    setError(null);
    setSuccess(null);
    try {
      await apiPost(`/admin/order-notifications/${r.id}/test`);
      setSuccess(`Test text sent to ${r.phoneNumber}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setTestingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/admin/order-notifications/${deleteTarget.id}`);
      setSuccess("Recipient removed.");
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e.message);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Head title="Order Notifications" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Order Alert Numbers</BlockTitle>
              <BlockDes className="text-soft">
                <p>Cell numbers that get a text the moment a customer places an order.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openAdd}>
                <Icon name="plus" /><span>Add Number</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" className="mb-3" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>{success}</Alert>}

        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              {loading ? (
                <div className="text-center py-4"><Spinner /></div>
              ) : recipients.length === 0 ? (
                <div className="text-center text-soft py-4">
                  No alert numbers yet. Add one to start receiving new-order texts.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Phone Number</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((r) => (
                        <tr key={r.id}>
                          <td className="fw-bold">{r.label || <span className="text-soft">—</span>}</td>
                          <td>{r.phoneNumber}</td>
                          <td>
                            <Badge color={r.isActive ? "success" : "light"}>
                              {r.isActive ? "Active" : "Paused"}
                            </Badge>
                          </td>
                          <td className="text-end">
                            <div className="d-flex gap-1 justify-content-end">
                              <Button size="sm" color="light" onClick={() => sendTest(r)} disabled={testingId === r.id}>
                                {testingId === r.id ? <Spinner size="sm" /> : <Icon name="send" />}
                                <span className="ms-1">Test</span>
                              </Button>
                              <Button size="sm" color="light" onClick={() => toggleActive(r)}>
                                {r.isActive ? "Pause" : "Activate"}
                              </Button>
                              <Button size="sm" color="light" onClick={() => openEdit(r)}>
                                <Icon name="edit" />
                              </Button>
                              <Button size="sm" color="light" onClick={() => setDeleteTarget(r)}>
                                <Icon name="trash" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Block>

        {/* Add / Edit modal */}
        <Modal isOpen={modalOpen} toggle={() => !saving && setModalOpen(false)}>
          <ModalHeader toggle={() => !saving && setModalOpen(false)}>
            {editing ? "Edit Alert Number" : "Add Alert Number"}
          </ModalHeader>
          <ModalBody>
            {error && <Alert color="danger" className="mb-3">{error}</Alert>}
            <Row className="g-3">
              <Col md="12">
                <label className="form-label">Label <span className="text-soft">(optional)</span></label>
                <Input
                  type="text"
                  value={form.label}
                  maxLength={80}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Owner, Kitchen"
                />
              </Col>
              <Col md="12">
                <label className="form-label">Phone Number</label>
                <Input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
                <small className="text-soft">US numbers are formatted automatically.</small>
              </Col>
              <Col md="12">
                <div className="custom-control custom-switch">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="recipient-active"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <label className="custom-control-label" htmlFor="recipient-active">
                    Active (receives new-order texts)
                  </label>
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button color="light" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button color="primary" disabled={saving} onClick={saveRecipient}>
              {saving ? <Spinner size="sm" /> : <Icon name="check" />}
              <span className="ms-1">{editing ? "Save" : "Add"}</span>
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete confirm */}
        <Modal isOpen={!!deleteTarget} toggle={() => setDeleteTarget(null)}>
          <ModalHeader toggle={() => setDeleteTarget(null)}>Remove Number</ModalHeader>
          <ModalBody>
            Remove <strong>{deleteTarget?.label || deleteTarget?.phoneNumber}</strong> from order alerts?
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button color="danger" onClick={confirmDelete}>Remove</Button>
          </ModalFooter>
        </Modal>
      </Content>
    </>
  );
};

export default AdminOrderNotifications;
