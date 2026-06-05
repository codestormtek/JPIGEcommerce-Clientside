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
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "@/utils/apiClient";

const ICON_OPTIONS = [
  { label: "Facebook", iconClass: "fa-brands fa-facebook-f" },
  { label: "Twitter / X", iconClass: "fa-brands fa-twitter" },
  { label: "Instagram", iconClass: "fa-brands fa-instagram" },
  { label: "YouTube", iconClass: "fa-brands fa-youtube" },
  { label: "WhatsApp", iconClass: "fa-brands fa-whatsapp" },
  { label: "TikTok", iconClass: "fa-brands fa-tiktok" },
  { label: "LinkedIn", iconClass: "fa-brands fa-linkedin-in" },
  { label: "Pinterest", iconClass: "fa-brands fa-pinterest-p" },
  { label: "Snapchat", iconClass: "fa-brands fa-snapchat" },
  { label: "Telegram", iconClass: "fa-brands fa-telegram" },
];

const emptyForm = { platform: "", iconClass: ICON_OPTIONS[0].iconClass, url: "", isActive: true };

const AdminSocialLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [reordering, setReordering] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/social-links");
      setLinks(res?.data ?? []);
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

  const openEdit = (l) => {
    setEditing(l.id);
    setForm({ platform: l.platform || "", iconClass: l.iconClass || ICON_OPTIONS[0].iconClass, url: l.url || "", isActive: l.isActive });
    setError(null);
    setModalOpen(true);
  };

  const saveLink = async () => {
    if (!form.platform.trim()) { setError("Enter a platform name."); return; }
    if (!form.url.trim()) { setError("Enter a URL."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        platform: form.platform.trim(),
        iconClass: form.iconClass,
        url: form.url.trim(),
        isActive: form.isActive,
      };
      if (editing) {
        await apiPatch(`/social-links/${editing}`, payload);
        setSuccess("Link updated.");
      } else {
        await apiPost("/social-links", payload);
        setSuccess("Link added.");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (l) => {
    try {
      await apiPatch(`/social-links/${l.id}`, { isActive: !l.isActive });
      setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    setLinks(next);
    setReordering(true);
    try {
      await apiPut("/social-links/reorder", { ids: next.map((l) => l.id) });
    } catch (e) {
      setError(e.message);
      load();
    } finally {
      setReordering(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/social-links/${deleteTarget.id}`);
      setSuccess("Link removed.");
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e.message);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Head title="Social Links" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Social Media Links</BlockTitle>
              <BlockDes className="text-soft">
                <p>The icons shown in the storefront footer. Reorder, edit, or add new platforms.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openAdd}>
                <Icon name="plus" /><span>Add Link</span>
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
              ) : links.length === 0 ? (
                <div className="text-center text-soft py-4">
                  No social links yet. Add one to show it in the footer.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Order</th>
                        <th>Icon</th>
                        <th>Platform</th>
                        <th>URL</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map((l, i) => (
                        <tr key={l.id}>
                          <td>
                            <div className="d-flex gap-1">
                              <Button size="sm" color="light" disabled={i === 0 || reordering} onClick={() => move(i, -1)} title="Move up">
                                <Icon name="chevron-up" />
                              </Button>
                              <Button size="sm" color="light" disabled={i === links.length - 1 || reordering} onClick={() => move(i, 1)} title="Move down">
                                <Icon name="chevron-down" />
                              </Button>
                            </div>
                          </td>
                          <td style={{ fontSize: 20 }}><i className={l.iconClass} /></td>
                          <td className="fw-bold">{l.platform}</td>
                          <td>
                            <span className="text-soft" style={{ wordBreak: "break-all" }}>{l.url}</span>
                          </td>
                          <td>
                            <Badge color={l.isActive ? "success" : "light"}>
                              {l.isActive ? "Active" : "Hidden"}
                            </Badge>
                          </td>
                          <td className="text-end">
                            <div className="d-flex gap-1 justify-content-end">
                              <Button size="sm" color="light" onClick={() => toggleActive(l)}>
                                {l.isActive ? "Hide" : "Show"}
                              </Button>
                              <Button size="sm" color="light" onClick={() => openEdit(l)}>
                                <Icon name="edit" />
                              </Button>
                              <Button size="sm" color="light" onClick={() => setDeleteTarget(l)}>
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
            {editing ? "Edit Social Link" : "Add Social Link"}
          </ModalHeader>
          <ModalBody>
            {error && <Alert color="danger" className="mb-3">{error}</Alert>}
            <Row className="g-3">
              <Col md="12">
                <label className="form-label">Platform</label>
                <Input
                  type="text"
                  value={form.platform}
                  maxLength={40}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                  placeholder="e.g. Facebook"
                />
              </Col>
              <Col md="12">
                <label className="form-label">Icon</label>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: 22, width: 28, textAlign: "center" }}><i className={form.iconClass} /></span>
                  <Input
                    type="select"
                    value={form.iconClass}
                    onChange={(e) => setForm((f) => ({ ...f, iconClass: e.target.value }))}
                  >
                    {ICON_OPTIONS.map((o) => (
                      <option key={o.iconClass} value={o.iconClass}>{o.label}</option>
                    ))}
                  </Input>
                </div>
              </Col>
              <Col md="12">
                <label className="form-label">URL</label>
                <Input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://facebook.com/yourpage"
                />
              </Col>
              <Col md="12">
                <div className="custom-control custom-switch">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="social-active"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <label className="custom-control-label" htmlFor="social-active">
                    Active (shown in footer)
                  </label>
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button color="light" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button color="primary" disabled={saving} onClick={saveLink}>
              {saving ? <Spinner size="sm" /> : <Icon name="check" />}
              <span className="ms-1">{editing ? "Save" : "Add"}</span>
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete confirm */}
        <Modal isOpen={!!deleteTarget} toggle={() => setDeleteTarget(null)}>
          <ModalHeader toggle={() => setDeleteTarget(null)}>Remove Link</ModalHeader>
          <ModalBody>
            Remove <strong>{deleteTarget?.platform}</strong> from the footer?
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

export default AdminSocialLinks;
