import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalHeader, Spinner, Alert } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Row, Col, Button, Icon,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const blankForm = () => ({
  settingKey: "",
  settingValue: "",
  label: "",
  category: "general",
});

const AdminSiteSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [filterCategory, setFilterCategory] = useState("all");
  const [searchText, setSearchText] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/site-settings");
      setSettings(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const categories = [...new Set(settings.map((s) => s.category || "general"))].sort();

  const filtered = settings.filter((s) => {
    if (filterCategory !== "all" && s.category !== filterCategory) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        s.settingKey.toLowerCase().includes(q) ||
        (s.label || "").toLowerCase().includes(q) ||
        (s.settingValue || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const grouped = filtered.reduce((acc, s) => {
    const cat = s.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const openCreate = () => {
    setEditTarget(null);
    setForm(blankForm());
    setFormError(null);
    setModal(true);
  };

  const openEdit = (setting) => {
    setEditTarget(setting);
    setForm({
      settingKey: setting.settingKey,
      settingValue: setting.settingValue ?? "",
      label: setting.label ?? "",
      category: setting.category ?? "general",
    });
    setFormError(null);
    setModal(true);
  };

  const saveSetting = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (editTarget) {
        await apiPatch(`/site-settings/${editTarget.settingKey}`, {
          settingValue: form.settingValue,
          label: form.label,
          category: form.category,
        });
        setSuccess("Setting updated successfully.");
      } else {
        if (!form.settingKey.trim()) {
          setFormError("Setting Key is required.");
          setSaving(false);
          return;
        }
        if (!/^[a-z0-9_]+$/.test(form.settingKey)) {
          setFormError("Key must be lowercase letters, numbers, and underscores only.");
          setSaving(false);
          return;
        }
        await apiPost("/site-settings", {
          settingKey: form.settingKey,
          settingValue: form.settingValue,
          label: form.label || form.settingKey,
          category: form.category || "general",
        });
        setSuccess("Setting created successfully.");
      }
      setModal(false);
      await loadSettings();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (setting) => {
    setDeleteTarget(setting);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/site-settings/${deleteTarget.settingKey}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setSuccess("Setting deleted.");
      await loadSettings();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <>
      <Head title="Site Settings" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Site Settings
              </BlockTitle>
              <p className="text-soft">
                Manage dynamic text and configuration values displayed on the storefront.
              </p>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreate}>
                <Icon name="plus" className="me-1" />
                Add Setting
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
          <Row className="mb-3 g-3">
            <Col md="4">
              <input
                type="text"
                className="form-control"
                placeholder="Search by key, label, or value…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col md="3">
              <select
                className="form-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Col>
          </Row>
        </Block>

        {loading ? (
          <div className="text-center py-5">
            <Spinner />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <Block>
            <div className="text-center text-soft py-5">
              {settings.length === 0
                ? 'No settings yet. Click "Add Setting" to create your first one.'
                : "No settings match your filter."}
            </div>
          </Block>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, items]) => (
              <Block key={category}>
                <div className="card card-bordered">
                  <div className="card-inner-group">
                    <div className="card-inner py-2" style={{ background: "#f8f9fa" }}>
                      <h6 className="overline-title-alt mb-0">
                        {category}
                      </h6>
                    </div>
                    {items.map((setting) => (
                      <div key={setting.id} className="card-inner py-3">
                        <Row className="align-items-center g-3">
                          <Col md="3">
                            <div className="fw-medium">{setting.label || setting.settingKey}</div>
                            <code className="text-soft fs-12px">{setting.settingKey}</code>
                          </Col>
                          <Col md="7">
                            <div
                              className="text-break"
                              style={{
                                maxHeight: 60,
                                overflow: "hidden",
                                color: setting.settingValue ? "#333" : "#aaa",
                              }}
                            >
                              {setting.settingValue || "(empty)"}
                            </div>
                          </Col>
                          <Col md="2" className="text-end">
                            <button
                              className="btn btn-sm btn-dim btn-outline-primary me-1"
                              onClick={() => openEdit(setting)}
                              title="Edit"
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              className="btn btn-sm btn-dim btn-outline-danger"
                              onClick={() => openDelete(setting)}
                              title="Delete"
                            >
                              <Icon name="trash" />
                            </button>
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </div>
                </div>
              </Block>
            ))
        )}
      </Content>

      {/* ── Create / Edit Modal ──────────────────────────────────────── */}
      <Modal isOpen={modal} toggle={() => setModal(false)} size="lg">
        <ModalHeader toggle={() => setModal(false)}>
          {editTarget ? "Edit Setting" : "Add Setting"}
        </ModalHeader>
        <ModalBody>
          {formError && (
            <Alert color="danger" className="mb-3">
              {formError}
            </Alert>
          )}
          <Row className="g-3">
            <Col md="6">
              <label className="form-label">Setting Key</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. footer_phone_number"
                value={form.settingKey}
                onChange={(e) => setField("settingKey", e.target.value)}
                disabled={!!editTarget}
              />
              {!editTarget && (
                <span className="text-soft fs-12px">
                  Lowercase letters, numbers, and underscores only. Cannot be changed after creation.
                </span>
              )}
            </Col>
            <Col md="6">
              <label className="form-label">Label</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Footer Phone Number"
                value={form.label}
                onChange={(e) => setField("label", e.target.value)}
              />
            </Col>
            <Col md="6">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. header, footer, homepage"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <span className="text-soft fs-12px">
                Settings are grouped by category. Type an existing one or create a new one.
              </span>
            </Col>
            <Col md="12">
              <label className="form-label">Value</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Setting value…"
                value={form.settingValue}
                onChange={(e) => setField("settingValue", e.target.value)}
              />
            </Col>
            <Col md="12" className="text-end">
              <Button color="light" className="me-2" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button color="primary" onClick={saveSetting} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner size="sm" className="me-1" /> Saving…
                  </>
                ) : editTarget ? (
                  "Update Setting"
                ) : (
                  "Create Setting"
                )}
              </Button>
            </Col>
          </Row>
        </ModalBody>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────── */}
      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
        <ModalHeader toggle={() => setDeleteModal(false)}>Delete Setting</ModalHeader>
        <ModalBody>
          <p>
            Are you sure you want to delete the setting{" "}
            <strong>{deleteTarget?.label || deleteTarget?.settingKey}</strong>?
          </p>
          <p className="text-danger fs-13px">
            This will remove it from the storefront immediately. Any page referencing this key will
            fall back to its default value.
          </p>
          <div className="text-end">
            <Button color="light" className="me-2" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button color="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Spinner size="sm" className="me-1" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default AdminSiteSettings;
