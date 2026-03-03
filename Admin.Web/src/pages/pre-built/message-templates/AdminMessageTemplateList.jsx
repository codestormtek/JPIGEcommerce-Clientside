import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, ModalHeader, Spinner, Badge, Collapse, Alert } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button, RSelect,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

// ─── Token library ────────────────────────────────────────────────────────────

const TOKENS = {
  Store: [
    "{{store.name}}", "{{store.url}}", "{{store.email}}",
    "{{store.phone}}", "{{store.address}}",
  ],
  Customer: [
    "{{customer.email}}", "{{customer.firstName}}", "{{customer.lastName}}",
    "{{customer.fullName}}",
  ],
  Order: [
    "{{order.id}}", "{{order.shortId}}", "{{order.total}}",
    "{{order.status}}", "{{order.placedAt}}",
  ],
  Product: ["{{product.name}}", "{{product.price}}"],
};

const CHANNEL_OPTIONS   = [{ value: "email", label: "Email" }, { value: "sms", label: "SMS" }];
const AUDIENCE_OPTIONS  = [{ value: "customer", label: "Customer" }, { value: "admin", label: "Admin" }];
const EVENT_KEY_OPTIONS = [
  "ORDER_PLACED", "ORDER_CONFIRMED", "ORDER_SHIPPED", "ORDER_DELIVERED", "ORDER_CANCELLED",
  "USER_REGISTERED", "USER_WELCOME", "PASSWORD_RESET", "EMAIL_VERIFICATION",
  "INVOICE_SENT", "LOW_STOCK_ALERT", "BACK_IN_STOCK", "PROMOTION_APPLIED",
].map((k) => ({ value: k, label: k }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLANK_FORM = {
  name: "", eventKey: null, channel: CHANNEL_OPTIONS[0],
  audience: AUDIENCE_OPTIONS[0], locale: "en",
  subject: "", bodyHtml: "", bodyText: "", isActive: true,
};

const formToPayload = (f) => ({
  name:     f.name,
  eventKey: f.eventKey?.value ?? f.eventKey,
  channel:  f.channel?.value ?? f.channel,
  audience: f.audience?.value ?? f.audience,
  locale:   f.locale || "en",
  isActive: f.isActive,
  subject:  f.subject || undefined,
  bodyHtml: f.bodyHtml || undefined,
  bodyText: f.bodyText,
});

const tplToForm = (tpl) => ({
  name:     tpl.name,
  eventKey: EVENT_KEY_OPTIONS.find((o) => o.value === tpl.eventKey) ?? { value: tpl.eventKey, label: tpl.eventKey },
  channel:  CHANNEL_OPTIONS.find((o) => o.value === tpl.channel) ?? CHANNEL_OPTIONS[0],
  audience: AUDIENCE_OPTIONS.find((o) => o.value === tpl.audience) ?? AUDIENCE_OPTIONS[0],
  locale:   tpl.locale ?? "en",
  subject:  tpl.subject ?? "",
  bodyHtml: tpl.bodyHtml ?? "",
  bodyText: tpl.bodyText ?? "",
  isActive: tpl.isActive,
});

const copyToken = (token) => navigator.clipboard.writeText(token).catch(() => {});

// ─── Sub-components ───────────────────────────────────────────────────────────

const ChannelBadge = ({ channel }) => (
  <Badge color={channel === "email" ? "primary" : "warning"} className="text-uppercase">
    {channel}
  </Badge>
);

const ActiveBadge = ({ active }) =>
  active ? <Badge color="success">Active</Badge> : <Badge color="secondary">Inactive</Badge>;

// ─── Tokens Panel ─────────────────────────────────────────────────────────────

const TokensPanel = ({ open, onToggle }) => (
  <div className="mb-3">
    <div className="d-flex align-items-center gap-2 mb-1">
      <span className="fw-semibold text-muted small">Allowed message tokens</span>
      <Button size="xs" color="light" onClick={onToggle} className="py-0 px-2">
        {open ? "Hide" : "Show"}
      </Button>
    </div>
    <Collapse isOpen={open}>
      <Alert color="light" className="p-2">
        {Object.entries(TOKENS).map(([group, tokens]) => (
          <div key={group} className="mb-1">
            <span className="fw-semibold text-secondary small me-1">{group}:</span>
            {tokens.map((t) => (
              <code
                key={t}
                title="Click to copy"
                style={{ cursor: "pointer", marginRight: 4, fontSize: "0.78rem" }}
                className="badge bg-light text-dark border"
                onClick={() => copyToken(t)}
              >{t}</code>
            ))}
          </div>
        ))}
        <div className="mt-1 text-muted small">
          Click any token to copy it to clipboard.
        </div>
      </Alert>
    </Collapse>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminMessageTemplateList = () => {
  // List state
  const [templates,    setTemplates]    = useState([]);
  const [totalItems,   setTotalItems]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemPerPage]                   = useState(20);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [channelFilter, setChannelFilter] = useState(null);

  // Edit / Create modal
  const [editModal,   setEditModal]   = useState(false);
  const [editForm,    setEditForm]    = useState(BLANK_FORM);
  const [editTarget,  setEditTarget]  = useState(null); // null = create
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState(null);
  const [tokensOpen,  setTokensOpen]  = useState(false);

  // Delete modal
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Test modal
  const [testModal,   setTestModal]   = useState(false);
  const [testTarget,  setTestTarget]  = useState(null);
  const [testEmail,   setTestEmail]   = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult,  setTestResult]  = useState(null); // { ok, msg }

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage, limit: itemPerPage,
        orderBy: "name", order: "asc",
      });
      if (searchTerm)             params.set("search",  searchTerm);
      if (channelFilter?.value)   params.set("channel", channelFilter.value);
      const res = await apiGet(`/message-templates?${params}`);
      setTemplates(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, [currentPage, itemPerPage, searchTerm, channelFilter]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── CRUD handlers ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setEditForm({ ...BLANK_FORM });
    setSaveError(null);
    setTokensOpen(false);
    setEditModal(true);
  };

  const openEdit = (tpl) => {
    setEditTarget(tpl);
    setEditForm(tplToForm(tpl));
    setSaveError(null);
    setTokensOpen(false);
    setEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = formToPayload(editForm);
      if (editTarget) {
        await apiPatch(`/message-templates/${editTarget.id}`, payload);
      } else {
        await apiPost("/message-templates", payload);
      }
      setEditModal(false);
      loadTemplates();
    } catch (err) {
      setSaveError(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (tpl) => { setDeleteTarget(tpl); setDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/message-templates/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      loadTemplates();
    } finally {
      setDeleteLoading(false);
    }
  };

  const openTest = (tpl) => {
    setTestTarget(tpl);
    setTestEmail("");
    setTestResult(null);
    setTestModal(true);
  };

  const handleTest = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      await apiPost(`/message-templates/${testTarget.id}/test`, { testEmail });
      setTestResult({ ok: true, msg: `Test email sent to ${testEmail}` });
    } catch (err) {
      setTestResult({ ok: false, msg: err?.message ?? "Send failed" });
    } finally {
      setTestSending(false);
    }
  };

  // ── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <Head title="Message Templates" />
      <Content>
        {/* Page header */}
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Message Templates</BlockTitle>
              <BlockDes className="text-soft">
                Manage email and SMS message templates used across the system.
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreate}>
                <Icon name="plus" /> <span>New Template</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {/* Filters */}
          <div className="d-flex gap-2 mb-3 flex-wrap">
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: 280 }}
              placeholder="Search by name, event key, subject…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <div style={{ minWidth: 160 }}>
              <RSelect
                options={[{ value: "", label: "All Channels" }, ...CHANNEL_OPTIONS]}
                value={channelFilter ?? { value: "", label: "All Channels" }}
                onChange={(v) => { setChannelFilter(v?.value ? v : null); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Table */}
          <DataTable className="card-stretch">
            <DataTableBody>
              <DataTableHead>
                <DataTableRow><span>Name</span></DataTableRow>
                <DataTableRow><span>Event Key</span></DataTableRow>
                <DataTableRow><span>Channel</span></DataTableRow>
                <DataTableRow><span>Subject</span></DataTableRow>
                <DataTableRow><span>Status</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools"></DataTableRow>
              </DataTableHead>

              {loading ? (
                <DataTableItem>
                  <DataTableRow colSpan={6}>
                    <div className="text-center py-4"><Spinner size="sm" /></div>
                  </DataTableRow>
                </DataTableItem>
              ) : templates.length === 0 ? (
                <DataTableItem>
                  <DataTableRow colSpan={6}>
                    <div className="text-center py-4 text-muted">No templates found.</div>
                  </DataTableRow>
                </DataTableItem>
              ) : templates.map((tpl) => (
                <DataTableItem key={tpl.id}>
                  <DataTableRow>
                    <span className="fw-semibold">{tpl.name}</span>
                  </DataTableRow>
                  <DataTableRow>
                    <code className="text-muted small">{tpl.eventKey}</code>
                  </DataTableRow>
                  <DataTableRow>
                    <ChannelBadge channel={tpl.channel} />
                  </DataTableRow>
                  <DataTableRow>
                    <span className="text-muted small">{tpl.subject || "—"}</span>
                  </DataTableRow>
                  <DataTableRow>
                    <ActiveBadge active={tpl.isActive} />
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools">
                    <ul className="nk-tb-actions gx-1">
                      <li>
                        <Button size="xs" color="light" onClick={() => openTest(tpl)} title="Test">
                          <Icon name="send" />
                        </Button>
                      </li>
                      <li>
                        <Button size="xs" color="light" onClick={() => openEdit(tpl)} title="Edit">
                          <Icon name="edit" />
                        </Button>
                      </li>
                      <li>
                        <Button size="xs" color="danger" onClick={() => openDelete(tpl)} title="Delete">
                          <Icon name="trash" />
                        </Button>
                      </li>
                    </ul>
                  </DataTableRow>
                </DataTableItem>
              ))}
            </DataTableBody>

            <div className="card-inner">
              {totalItems > itemPerPage && (
                <PaginationComponent
                  itemPerPage={itemPerPage}
                  totalItems={totalItems}
                  paginate={setCurrentPage}
                  currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Edit / Create Modal ─────────────────────────────────────────────── */}
        <Modal isOpen={editModal} toggle={() => setEditModal(false)} size="xl">
          <ModalHeader toggle={() => setEditModal(false)}>
            {editTarget ? "Edit Template" : "New Template"}
          </ModalHeader>
          <ModalBody>
            <TokensPanel open={tokensOpen} onToggle={() => setTokensOpen((o) => !o)} />

            {saveError && <Alert color="danger" className="mb-3">{saveError}</Alert>}

            <Row className="g-3">
              <Col md={8}>
                <label className="form-label">Template Name <span className="text-danger">*</span></label>
                <input
                  className="form-control"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Order Confirmation Email"
                />
              </Col>
              <Col md={4}>
                <label className="form-label">Locale</label>
                <input
                  className="form-control"
                  value={editForm.locale}
                  onChange={(e) => setEditForm((f) => ({ ...f, locale: e.target.value }))}
                  placeholder="en"
                />
              </Col>
              <Col md={6}>
                <label className="form-label">Event Key <span className="text-danger">*</span></label>
                <RSelect
                  options={EVENT_KEY_OPTIONS}
                  value={editForm.eventKey}
                  onChange={(v) => setEditForm((f) => ({ ...f, eventKey: v }))}
                  placeholder="Select or type…"
                />
              </Col>
              <Col md={3}>
                <label className="form-label">Channel</label>
                <RSelect
                  options={CHANNEL_OPTIONS}
                  value={editForm.channel}
                  onChange={(v) => setEditForm((f) => ({ ...f, channel: v }))}
                />
              </Col>
              <Col md={3}>
                <label className="form-label">Audience</label>
                <RSelect
                  options={AUDIENCE_OPTIONS}
                  value={editForm.audience}
                  onChange={(v) => setEditForm((f) => ({ ...f, audience: v }))}
                />
              </Col>

              {editForm.channel?.value === "email" && (
                <Col md={12}>
                  <label className="form-label">Subject</label>
                  <input
                    className="form-control"
                    value={editForm.subject}
                    onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Email subject line — tokens supported"
                  />
                </Col>
              )}
              {editForm.channel?.value === "email" && (
                <Col md={12}>
                  <label className="form-label">Body HTML</label>
                  <textarea
                    className="form-control font-monospace"
                    rows={8}
                    value={editForm.bodyHtml}
                    onChange={(e) => setEditForm((f) => ({ ...f, bodyHtml: e.target.value }))}
                    placeholder="HTML body — tokens supported (e.g. {{customer.firstName}})"
                  />
                </Col>
              )}
              <Col md={12}>
                <label className="form-label">Body Text <span className="text-danger">*</span></label>
                <textarea
                  className="form-control font-monospace"
                  rows={5}
                  value={editForm.bodyText}
                  onChange={(e) => setEditForm((f) => ({ ...f, bodyText: e.target.value }))}
                  placeholder="Plain text body — used for SMS or as email fallback"
                />
              </Col>
              <Col md={12}>
                <div className="custom-control custom-switch">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="tpl-active"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <label className="custom-control-label" htmlFor="tpl-active">Active</label>
                </div>
              </Col>
            </Row>

            <div className="d-flex gap-2 mt-4">
              <Button color="primary" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size="sm" /> : <><Icon name="save" /> Save</>}
              </Button>
              <Button color="light" onClick={() => setEditModal(false)}>Discard</Button>
              {editTarget && (
                <Button color="outline-secondary" className="ms-auto" onClick={() => { setEditModal(false); openTest(editTarget); }}>
                  <Icon name="send" /> Test Template
                </Button>
              )}
            </div>
          </ModalBody>
        </Modal>

        {/* ── Test Modal ──────────────────────────────────────────────────────── */}
        <Modal isOpen={testModal} toggle={() => setTestModal(false)} size="sm">
          <ModalHeader toggle={() => setTestModal(false)}>Send Test Email</ModalHeader>
          <ModalBody>
            <p className="text-muted small mb-2">
              Send a test version of <strong>{testTarget?.name}</strong> with sample data.
            </p>
            <input
              type="email"
              className="form-control mb-3"
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            {testResult && (
              <Alert color={testResult.ok ? "success" : "danger"} className="mb-3">
                {testResult.msg}
              </Alert>
            )}
            <Button color="primary" onClick={handleTest} disabled={testSending || !testEmail} block>
              {testSending ? <Spinner size="sm" /> : <><Icon name="send" /> Send Test</>}
            </Button>
          </ModalBody>
        </Modal>

        {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalHeader toggle={() => setDeleteModal(false)}>Delete Template</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </p>
            <div className="d-flex gap-2 mt-3">
              <Button color="danger" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? <Spinner size="sm" /> : "Delete"}
              </Button>
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
            </div>
          </ModalBody>
        </Modal>

      </Content>
    </React.Fragment>
  );
};

export default AdminMessageTemplateList;


