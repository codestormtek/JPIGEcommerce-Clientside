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

const OFFER_KEYS = [
  { key: "offer_1", label: "Offer 1", icon: "💳" },
  { key: "offer_2", label: "Offer 2", icon: "🏷️" },
  { key: "offer_3", label: "Offer 3", icon: "🚚" },
];

const FEATURE_STRIP_KEYS = [
  { titleKey: "feature_strip_1_title", descKey: "feature_strip_1_desc", label: "Box 1 – Best Prices" },
  { titleKey: "feature_strip_2_title", descKey: "feature_strip_2_desc", label: "Box 2 – Return Policy" },
  { titleKey: "feature_strip_3_title", descKey: "feature_strip_3_desc", label: "Box 3 – Support" },
  { titleKey: "feature_strip_4_title", descKey: "feature_strip_4_desc", label: "Box 4 – Daily Deal" },
];

const FOOTER_KEYS = [
  { key: "footer_phone", label: "Phone Number (displayed)", placeholder: "e.g. 1-800-513-1710" },
  { key: "footer_phone_href", label: "Phone Link (href)", placeholder: "e.g. tel:18005131710" },
  { key: "footer_location", label: "Location Text", placeholder: "e.g. Located in the metro DC area" },
  { key: "footer_newsletter_text", label: "Newsletter Tagline", placeholder: "e.g. Subscribe to the mailing list…" },
];

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

  // ── Available Offers quick-edit state ──────────────────────────
  const [offerValues, setOfferValues] = useState({ offer_1: "", offer_2: "", offer_3: "" });
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(null);
  const [offerError, setOfferError] = useState(null);

  // ── Feature Strip quick-edit state ─────────────────────────────
  const [featureStripValues, setFeatureStripValues] = useState({});
  const [featureStripSaving, setFeatureStripSaving] = useState(false);
  const [featureStripSuccess, setFeatureStripSuccess] = useState(null);
  const [featureStripError, setFeatureStripError] = useState(null);

  // ── Footer quick-edit state ─────────────────────────────────────
  const [footerValues, setFooterValues] = useState({});
  const [footerSaving, setFooterSaving] = useState(false);
  const [footerSuccess, setFooterSuccess] = useState(null);
  const [footerError, setFooterError] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/site-settings");
      const all = res?.data ?? [];
      setSettings(all);
      const map = {};
      all.forEach((s) => { map[s.settingKey] = s.settingValue ?? ""; });
      // Populate offer quick-edit fields
      setOfferValues({
        offer_1: map["offer_1"] ?? "",
        offer_2: map["offer_2"] ?? "",
        offer_3: map["offer_3"] ?? "",
      });
      // Populate feature strip fields
      const fsVals = {};
      FEATURE_STRIP_KEYS.forEach(({ titleKey, descKey }) => {
        fsVals[titleKey] = map[titleKey] ?? "";
        fsVals[descKey] = map[descKey] ?? "";
      });
      setFeatureStripValues(fsVals);
      // Populate footer fields
      const ftVals = {};
      FOOTER_KEYS.forEach(({ key }) => { ftVals[key] = map[key] ?? ""; });
      setFooterValues(ftVals);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveOffers = async () => {
    setOfferSaving(true);
    setOfferError(null);
    setOfferSuccess(null);
    try {
      await Promise.all(
        OFFER_KEYS.map(({ key }) =>
          apiPatch(`/site-settings/${key}`, { settingValue: offerValues[key] })
        )
      );
      setOfferSuccess("Offers saved successfully.");
      await loadSettings();
      setTimeout(() => setOfferSuccess(null), 3000);
    } catch (e) {
      setOfferError(e.message || "Failed to save offers.");
    } finally {
      setOfferSaving(false);
    }
  };

  const saveFeatureStrip = async () => {
    setFeatureStripSaving(true);
    setFeatureStripError(null);
    setFeatureStripSuccess(null);
    try {
      const allKeys = FEATURE_STRIP_KEYS.flatMap(({ titleKey, descKey }) => [titleKey, descKey]);
      await Promise.all(
        allKeys.map((key) => apiPatch(`/site-settings/${key}`, { settingValue: featureStripValues[key] }))
      );
      setFeatureStripSuccess("Feature strip saved successfully.");
      await loadSettings();
      setTimeout(() => setFeatureStripSuccess(null), 3000);
    } catch (e) {
      setFeatureStripError(e.message || "Failed to save feature strip.");
    } finally {
      setFeatureStripSaving(false);
    }
  };

  const saveFooter = async () => {
    setFooterSaving(true);
    setFooterError(null);
    setFooterSuccess(null);
    try {
      await Promise.all(
        FOOTER_KEYS.map(({ key }) => apiPatch(`/site-settings/${key}`, { settingValue: footerValues[key] }))
      );
      setFooterSuccess("Footer settings saved successfully.");
      await loadSettings();
      setTimeout(() => setFooterSuccess(null), 3000);
    } catch (e) {
      setFooterError(e.message || "Failed to save footer settings.");
    } finally {
      setFooterSaving(false);
    }
  };

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

        {/* ── Available Offers Quick-Edit Card ─────────────────────── */}
        <Block>
          <div className="card card-bordered mb-4">
            <div className="card-inner-group">
              <div className="card-inner py-3" style={{ background: "#fff8f0", borderBottom: "1px solid #ffe0b2" }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="overline-title mb-0" style={{ color: "#e65100" }}>
                      🏷️ Available Offers
                    </h6>
                    <p className="text-soft mb-0 fs-12px mt-1">
                      These three offer lines appear in the product page sidebar. Edit and save below.
                    </p>
                  </div>
                  <Button
                    color="warning"
                    size="sm"
                    onClick={saveOffers}
                    disabled={offerSaving}
                    style={{ minWidth: 110 }}
                  >
                    {offerSaving ? (
                      <><Spinner size="sm" className="me-1" /> Saving…</>
                    ) : (
                      <><Icon name="save" className="me-1" />Save Offers</>
                    )}
                  </Button>
                </div>
              </div>

              {offerSuccess && (
                <Alert color="success" className="mx-3 mt-3 mb-0" toggle={() => setOfferSuccess(null)}>
                  {offerSuccess}
                </Alert>
              )}
              {offerError && (
                <Alert color="danger" className="mx-3 mt-3 mb-0" toggle={() => setOfferError(null)}>
                  {offerError}
                </Alert>
              )}

              {OFFER_KEYS.map(({ key, label, icon }) => (
                <div key={key} className="card-inner py-3">
                  <Row className="align-items-center g-3">
                    <Col md="1" className="text-center">
                      <span style={{ fontSize: 22 }}>{icon}</span>
                    </Col>
                    <Col md="2">
                      <span className="fw-medium">{label}</span>
                      <br />
                      <code className="text-soft fs-12px">{key}</code>
                    </Col>
                    <Col md="9">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Text for ${label}…`}
                        value={offerValues[key] ?? ""}
                        onChange={(e) =>
                          setOfferValues((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                      />
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          </div>
        </Block>

        {/* ── Feature Strip Quick-Edit Card ─────────────────────────── */}
        <Block>
          <div className="card card-bordered mb-4">
            <div className="card-inner-group">
              <div className="card-inner py-3" style={{ background: "#f0f8f0", borderBottom: "1px solid #c8e6c9" }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="overline-title mb-0" style={{ color: "#2e7d32" }}>
                      🟧 Orange Feature Strip
                    </h6>
                    <p className="text-soft mb-0 fs-12px mt-1">
                      The four orange boxes displayed below the hero section on the storefront.
                    </p>
                  </div>
                  <Button
                    color="success"
                    size="sm"
                    onClick={saveFeatureStrip}
                    disabled={featureStripSaving}
                    style={{ minWidth: 130 }}
                  >
                    {featureStripSaving ? (
                      <><Spinner size="sm" className="me-1" /> Saving…</>
                    ) : (
                      <><Icon name="save" className="me-1" />Save Strip</>
                    )}
                  </Button>
                </div>
              </div>
              {featureStripSuccess && (
                <Alert color="success" className="mx-3 mt-3 mb-0" toggle={() => setFeatureStripSuccess(null)}>
                  {featureStripSuccess}
                </Alert>
              )}
              {featureStripError && (
                <Alert color="danger" className="mx-3 mt-3 mb-0" toggle={() => setFeatureStripError(null)}>
                  {featureStripError}
                </Alert>
              )}
              {FEATURE_STRIP_KEYS.map(({ titleKey, descKey, label }) => (
                <div key={titleKey} className="card-inner py-3">
                  <div className="fw-medium mb-2">{label}</div>
                  <Row className="g-2">
                    <Col md="4">
                      <label className="form-label fs-12px text-soft mb-1">Title</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Heading text…"
                        value={featureStripValues[titleKey] ?? ""}
                        onChange={(e) => setFeatureStripValues((prev) => ({ ...prev, [titleKey]: e.target.value }))}
                      />
                    </Col>
                    <Col md="8">
                      <label className="form-label fs-12px text-soft mb-1">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Supporting text…"
                        value={featureStripValues[descKey] ?? ""}
                        onChange={(e) => setFeatureStripValues((prev) => ({ ...prev, [descKey]: e.target.value }))}
                      />
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          </div>
        </Block>

        {/* ── Footer Quick-Edit Card ────────────────────────────────── */}
        <Block>
          <div className="card card-bordered mb-4">
            <div className="card-inner-group">
              <div className="card-inner py-3" style={{ background: "#f3f3f3", borderBottom: "1px solid #ddd" }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="overline-title mb-0" style={{ color: "#424242" }}>
                      🦶 Footer Text
                    </h6>
                    <p className="text-soft mb-0 fs-12px mt-1">
                      Contact details and newsletter tagline shown in the storefront footer.
                    </p>
                  </div>
                  <Button
                    color="secondary"
                    size="sm"
                    onClick={saveFooter}
                    disabled={footerSaving}
                    style={{ minWidth: 130 }}
                  >
                    {footerSaving ? (
                      <><Spinner size="sm" className="me-1" /> Saving…</>
                    ) : (
                      <><Icon name="save" className="me-1" />Save Footer</>
                    )}
                  </Button>
                </div>
              </div>
              {footerSuccess && (
                <Alert color="success" className="mx-3 mt-3 mb-0" toggle={() => setFooterSuccess(null)}>
                  {footerSuccess}
                </Alert>
              )}
              {footerError && (
                <Alert color="danger" className="mx-3 mt-3 mb-0" toggle={() => setFooterError(null)}>
                  {footerError}
                </Alert>
              )}
              {FOOTER_KEYS.map(({ key, label, placeholder }) => (
                <div key={key} className="card-inner py-3">
                  <Row className="align-items-center g-3">
                    <Col md="3">
                      <span className="fw-medium">{label}</span>
                      <br />
                      <code className="text-soft fs-12px">{key}</code>
                    </Col>
                    <Col md="9">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={placeholder}
                        value={footerValues[key] ?? ""}
                        onChange={(e) => setFooterValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          </div>
        </Block>

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
