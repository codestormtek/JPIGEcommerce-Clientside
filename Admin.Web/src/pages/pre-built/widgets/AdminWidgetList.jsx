import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalHeader, Spinner, Alert, Badge } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";

const blankWidgetForm = () => ({
  name: "", placement: "", description: "", columns: 4, isVisible: true, displayOrder: 0,
});

const blankItemForm = () => ({
  title: "", subtitle: "", badge: "", buttonText: "", buttonUrl: "",
  backgroundColor: "", sortOrder: 0, isVisible: true, mediaAssetId: "", imageWidth: "", imageHeight: "",
});

const ImageUploadWidget = ({ label, assetId, previewUrl, onUploaded, onRemove, folder }) => {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder || "widgets");
      fd.append("name", "widget_item");
      const res = await apiUpload("/media/upload-resized", fd);
      const data = res?.data ?? res;
      const asset = data?.primary ?? data;
      onUploaded(asset);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {previewUrl && (
          <img src={previewUrl} alt="preview" style={{ height: 60, borderRadius: 4, objectFit: "cover" }} />
        )}
        <label className="btn btn-sm btn-success mb-0" style={{ cursor: "pointer" }}>
          {uploading ? <Spinner size="sm" /> : <><Icon name="upload" /> Upload</>}
          <input type="file" accept="image/*" hidden onChange={handleFile} />
        </label>
        {assetId && (
          <Button size="sm" color="danger" onClick={onRemove}>
            <Icon name="trash" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
};

const AdminWidgetList = () => {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [widgetModal, setWidgetModal] = useState(false);
  const [editWidget, setEditWidget] = useState(null);
  const [widgetForm, setWidgetForm] = useState(blankWidgetForm());
  const [savingWidget, setSavingWidget] = useState(false);
  const [widgetFormError, setWidgetFormError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [itemWidgetId, setItemWidgetId] = useState(null);
  const [itemForm, setItemForm] = useState(blankItemForm());
  const [savingItem, setSavingItem] = useState(false);
  const [itemFormError, setItemFormError] = useState(null);

  const [deleteItemModal, setDeleteItemModal] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState(null);
  const [deleteItemWidgetId, setDeleteItemWidgetId] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const [expandedWidget, setExpandedWidget] = useState(null);

  const loadWidgets = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiGet("/widgets?limit=50&orderBy=displayOrder&order=asc");
      setWidgets(res?.data ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadWidgets(); }, [loadWidgets]);

  const openCreateWidget = () => {
    setEditWidget(null); setWidgetForm(blankWidgetForm()); setWidgetFormError(null); setWidgetModal(true);
  };

  const openEditWidget = (w) => {
    setEditWidget(w);
    setWidgetForm({
      name: w.name || "", placement: w.placement || "", description: w.description || "",
      columns: w.columns ?? 4, isVisible: w.isVisible ?? true, displayOrder: w.displayOrder ?? 0,
    });
    setWidgetFormError(null); setWidgetModal(true);
  };

  const saveWidget = async () => {
    setSavingWidget(true); setWidgetFormError(null);
    try {
      const body = {
        name: widgetForm.name, placement: widgetForm.placement, description: widgetForm.description || undefined,
        columns: Number(widgetForm.columns), isVisible: widgetForm.isVisible, displayOrder: Number(widgetForm.displayOrder),
      };
      if (editWidget) await apiPatch(`/widgets/${editWidget.id}`, body);
      else await apiPost("/widgets", body);
      setWidgetModal(false); setSuccess(editWidget ? "Widget updated." : "Widget created.");
      loadWidgets();
    } catch (e) { setWidgetFormError(e.message); }
    finally { setSavingWidget(false); }
  };

  const openDeleteWidget = (w) => { setDeleteTarget(w); setDeleteModal(true); };
  const confirmDeleteWidget = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/widgets/${deleteTarget.id}`);
      setDeleteModal(false); setDeleteTarget(null); setSuccess("Widget deleted.");
      loadWidgets();
    } catch (e) { setError(e.message); }
    finally { setDeleting(false); }
  };

  const openCreateItem = (widgetId) => {
    setEditItem(null); setItemWidgetId(widgetId); setItemForm(blankItemForm()); setItemFormError(null); setItemModal(true);
  };

  const openEditItem = (widgetId, item) => {
    setEditItem(item); setItemWidgetId(widgetId);
    setItemForm({
      title: item.title || "", subtitle: item.subtitle || "", badge: item.badge || "",
      buttonText: item.buttonText || "", buttonUrl: item.buttonUrl || "",
      backgroundColor: item.backgroundColor || "", sortOrder: item.sortOrder ?? 0,
      isVisible: item.isVisible ?? true, mediaAssetId: item.mediaAssetId || "",
      imageWidth: item.imageWidth ?? "", imageHeight: item.imageHeight ?? "",
    });
    setItemFormError(null); setItemModal(true);
  };

  const saveItem = async () => {
    setSavingItem(true); setItemFormError(null);
    try {
      const body = {
        title: itemForm.title || undefined, subtitle: itemForm.subtitle || undefined,
        badge: itemForm.badge || undefined, buttonText: itemForm.buttonText || undefined,
        buttonUrl: itemForm.buttonUrl || undefined, backgroundColor: itemForm.backgroundColor || undefined,
        sortOrder: Number(itemForm.sortOrder), isVisible: itemForm.isVisible,
        mediaAssetId: itemForm.mediaAssetId || null,
        imageWidth: itemForm.imageWidth ? Number(itemForm.imageWidth) : null,
        imageHeight: itemForm.imageHeight ? Number(itemForm.imageHeight) : null,
      };
      if (editItem) await apiPatch(`/widgets/${itemWidgetId}/items/${editItem.id}`, body);
      else await apiPost(`/widgets/${itemWidgetId}/items`, body);
      setItemModal(false); setSuccess(editItem ? "Item updated." : "Item created.");
      loadWidgets();
    } catch (e) { setItemFormError(e.message); }
    finally { setSavingItem(false); }
  };

  const openDeleteItem = (widgetId, item) => {
    setDeleteItemTarget(item); setDeleteItemWidgetId(widgetId); setDeleteItemModal(true);
  };
  const confirmDeleteItem = async () => {
    if (!deleteItemTarget) return;
    setDeletingItem(true);
    try {
      await apiDelete(`/widgets/${deleteItemWidgetId}/items/${deleteItemTarget.id}`);
      setDeleteItemModal(false); setDeleteItemTarget(null); setSuccess("Item deleted.");
      loadWidgets();
    } catch (e) { setError(e.message); }
    finally { setDeletingItem(false); }
  };

  const setWField = (k, v) => setWidgetForm((f) => ({ ...f, [k]: v }));
  const setIField = (k, v) => setItemForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <Head title="Widgets" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Widgets</BlockTitle>
              <BlockDes className="text-soft">
                <p>Manage promotional sections, banners, and feature cards displayed on the storefront.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreateWidget}>
                <Icon name="plus" /> <span>Create Widget</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" className="mb-3" toggle={() => setError(null)}>{error}</Alert>}
        {success && <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>{success}</Alert>}

        {loading ? (
          <div className="text-center py-5"><Spinner /></div>
        ) : widgets.length === 0 ? (
          <Block>
            <div className="text-center text-soft py-5">
              No widgets yet. Click "Create Widget" to get started.
            </div>
          </Block>
        ) : (
          widgets.map((widget) => (
            <Block key={widget.id}>
              <div className="card card-bordered">
                <div className="card-inner">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <h5 className="mb-1">{widget.name}</h5>
                      <div className="d-flex gap-2 align-items-center flex-wrap">
                        <code className="text-soft">{widget.placement}</code>
                        <Badge color={widget.isVisible ? "success" : "light"} pill>
                          {widget.isVisible ? "Visible" : "Hidden"}
                        </Badge>
                        <span className="text-soft fs-12px">{widget.columns} column{widget.columns !== 1 ? "s" : ""}</span>
                        <span className="text-soft fs-12px">{widget.items?.length || 0} item{(widget.items?.length || 0) !== 1 ? "s" : ""}</span>
                      </div>
                      {widget.description && <p className="text-soft mt-1 mb-0 fs-13px">{widget.description}</p>}
                    </div>
                    <div className="d-flex gap-1">
                      <Button size="sm" color="dim" outline className="btn-outline-primary" onClick={() => setExpandedWidget(expandedWidget === widget.id ? null : widget.id)}>
                        <Icon name={expandedWidget === widget.id ? "chevron-up" : "chevron-down"} />
                        {expandedWidget === widget.id ? " Collapse" : " Items"}
                      </Button>
                      <Button size="sm" color="dim" outline className="btn-outline-primary" onClick={() => openEditWidget(widget)}>
                        <Icon name="edit" />
                      </Button>
                      <Button size="sm" color="dim" outline className="btn-outline-danger" onClick={() => openDeleteWidget(widget)}>
                        <Icon name="trash" />
                      </Button>
                    </div>
                  </div>
                </div>

                {expandedWidget === widget.id && (
                  <div className="card-inner border-top pt-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Widget Items</h6>
                      <Button size="sm" color="primary" onClick={() => openCreateItem(widget.id)}>
                        <Icon name="plus" /> Add Item
                      </Button>
                    </div>
                    {(!widget.items || widget.items.length === 0) ? (
                      <p className="text-soft fs-13px">No items yet. Click "Add Item" to create one.</p>
                    ) : (
                      <div className="row g-3">
                        {widget.items.map((item) => (
                          <div key={item.id} className="col-12">
                            <div className="card card-bordered" style={{ background: "#fafbfc" }}>
                              <div className="card-inner py-3">
                                <Row className="align-items-center g-3">
                                  <Col md="2">
                                    {item.mediaAsset?.url ? (
                                      <img src={item.mediaAsset.url} alt={item.title || ""} style={{ width: "100%", maxHeight: 80, objectFit: "cover", borderRadius: 4 }} />
                                    ) : (
                                      <div style={{ width: "100%", height: 60, background: item.backgroundColor || "#eee", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Icon name="img" style={{ fontSize: 24, color: "#bbb" }} />
                                      </div>
                                    )}
                                  </Col>
                                  <Col md="7">
                                    <div className="fw-medium">{item.title || "(no title)"}</div>
                                    {item.subtitle && <div className="text-soft fs-13px">{item.subtitle}</div>}
                                    <div className="d-flex gap-2 mt-1 flex-wrap">
                                      {item.badge && <Badge color="warning" pill>{item.badge}</Badge>}
                                      {item.buttonText && <span className="fs-12px text-soft">Button: {item.buttonText}</span>}
                                      {item.buttonUrl && <span className="fs-12px text-soft">→ {item.buttonUrl}</span>}
                                      <span className="fs-12px text-soft">Order: {item.sortOrder}</span>
                                      <Badge color={item.isVisible ? "success" : "light"} pill>{item.isVisible ? "Visible" : "Hidden"}</Badge>
                                    </div>
                                  </Col>
                                  <Col md="3" className="text-end">
                                    <Button size="sm" color="dim" outline className="btn-outline-primary me-1" onClick={() => openEditItem(widget.id, item)}>
                                      <Icon name="edit" />
                                    </Button>
                                    <Button size="sm" color="dim" outline className="btn-outline-danger" onClick={() => openDeleteItem(widget.id, item)}>
                                      <Icon name="trash" />
                                    </Button>
                                  </Col>
                                </Row>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Block>
          ))
        )}
      </Content>

      <Modal isOpen={widgetModal} toggle={() => setWidgetModal(false)} size="lg">
        <ModalHeader toggle={() => setWidgetModal(false)}>
          {editWidget ? "Edit Widget" : "Create Widget"}
        </ModalHeader>
        <ModalBody>
          {widgetFormError && <Alert color="danger" className="mb-3">{widgetFormError}</Alert>}
          <Row className="g-3">
            <Col md="6">
              <label className="form-label">Name</label>
              <input type="text" className="form-control" placeholder="e.g. Weekend Promotions" value={widgetForm.name} onChange={(e) => setWField("name", e.target.value)} />
            </Col>
            <Col md="6">
              <label className="form-label">Placement Key</label>
              <input type="text" className="form-control" placeholder="e.g. homepage-feature-promos" value={widgetForm.placement} onChange={(e) => setWField("placement", e.target.value)} disabled={!!editWidget} />
              {!editWidget && <span className="text-soft fs-12px">Lowercase letters, numbers, and hyphens only. Cannot be changed later.</span>}
            </Col>
            <Col md="12">
              <label className="form-label">Description</label>
              <input type="text" className="form-control" placeholder="Short description of where this widget appears" value={widgetForm.description} onChange={(e) => setWField("description", e.target.value)} />
            </Col>
            <Col md="4">
              <label className="form-label">Columns</label>
              <select className="form-select" value={widgetForm.columns} onChange={(e) => setWField("columns", Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} column{n !== 1 ? "s" : ""}</option>)}
              </select>
            </Col>
            <Col md="4">
              <label className="form-label">Display Order</label>
              <input type="number" className="form-control" value={widgetForm.displayOrder} onChange={(e) => setWField("displayOrder", e.target.value)} />
            </Col>
            <Col md="4">
              <label className="form-label">Visibility</label>
              <div className="custom-control custom-switch mt-1">
                <input type="checkbox" className="custom-control-input form-check-input" id="widgetVisible" checked={widgetForm.isVisible} onChange={(e) => setWField("isVisible", e.target.checked)} />
                <label className="custom-control-label form-check-label" htmlFor="widgetVisible">{widgetForm.isVisible ? "Visible" : "Hidden"}</label>
              </div>
            </Col>
            <Col md="12" className="text-end">
              <Button color="light" className="me-2" onClick={() => setWidgetModal(false)}>Cancel</Button>
              <Button color="primary" onClick={saveWidget} disabled={savingWidget}>
                {savingWidget ? <><Spinner size="sm" className="me-1" /> Saving…</> : editWidget ? "Update Widget" : "Create Widget"}
              </Button>
            </Col>
          </Row>
        </ModalBody>
      </Modal>

      <Modal isOpen={itemModal} toggle={() => setItemModal(false)} size="lg">
        <ModalHeader toggle={() => setItemModal(false)}>
          {editItem ? "Edit Widget Item" : "Add Widget Item"}
        </ModalHeader>
        <ModalBody>
          {itemFormError && <Alert color="danger" className="mb-3">{itemFormError}</Alert>}
          <Row className="g-3">
            <Col md="6">
              <label className="form-label">Title</label>
              <input type="text" className="form-control" placeholder="e.g. Drink Fresh Corn Juice" value={itemForm.title} onChange={(e) => setIField("title", e.target.value)} />
            </Col>
            <Col md="6">
              <label className="form-label">Subtitle</label>
              <input type="text" className="form-control" placeholder="e.g. Good Taste" value={itemForm.subtitle} onChange={(e) => setIField("subtitle", e.target.value)} />
            </Col>
            <Col md="6">
              <label className="form-label">Badge Text</label>
              <input type="text" className="form-control" placeholder="e.g. Weekend Discount" value={itemForm.badge} onChange={(e) => setIField("badge", e.target.value)} />
            </Col>
            <Col md="6">
              <label className="form-label">Background Color</label>
              <div className="d-flex gap-2 align-items-center">
                <input type="color" value={itemForm.backgroundColor || "#ffffff"} onChange={(e) => setIField("backgroundColor", e.target.value)} style={{ width: 40, height: 38, padding: 2, cursor: "pointer" }} />
                <input type="text" className="form-control" placeholder="#f47920" value={itemForm.backgroundColor} onChange={(e) => setIField("backgroundColor", e.target.value)} />
              </div>
            </Col>
            <Col md="6">
              <label className="form-label">Button Text</label>
              <input type="text" className="form-control" placeholder="e.g. Shop Now" value={itemForm.buttonText} onChange={(e) => setIField("buttonText", e.target.value)} />
            </Col>
            <Col md="6">
              <label className="form-label">Button URL</label>
              <input type="text" className="form-control" placeholder="e.g. /shop" value={itemForm.buttonUrl} onChange={(e) => setIField("buttonUrl", e.target.value)} />
            </Col>
            <Col md="12">
              <ImageUploadWidget
                label="Item Image"
                assetId={itemForm.mediaAssetId}
                previewUrl={editItem?.mediaAsset?.url || (itemForm.mediaAssetId ? undefined : undefined)}
                onUploaded={(asset) => setIField("mediaAssetId", asset.id)}
                onRemove={() => setIField("mediaAssetId", "")}
                folder="widgets"
              />
            </Col>
            <Col md="4">
              <label className="form-label">Image Width (px)</label>
              <input type="number" className="form-control" placeholder="Auto" value={itemForm.imageWidth} onChange={(e) => setIField("imageWidth", e.target.value)} />
            </Col>
            <Col md="4">
              <label className="form-label">Image Height (px)</label>
              <input type="number" className="form-control" placeholder="Auto" value={itemForm.imageHeight} onChange={(e) => setIField("imageHeight", e.target.value)} />
            </Col>
            <Col md="4">
              <label className="form-label">Sort Order</label>
              <input type="number" className="form-control" value={itemForm.sortOrder} onChange={(e) => setIField("sortOrder", e.target.value)} />
            </Col>
            <Col md="4">
              <label className="form-label">Visibility</label>
              <div className="custom-control custom-switch mt-1">
                <input type="checkbox" className="custom-control-input form-check-input" id="itemVisible" checked={itemForm.isVisible} onChange={(e) => setIField("isVisible", e.target.checked)} />
                <label className="custom-control-label form-check-label" htmlFor="itemVisible">{itemForm.isVisible ? "Visible" : "Hidden"}</label>
              </div>
            </Col>
            <Col md="12" className="text-end">
              <Button color="light" className="me-2" onClick={() => setItemModal(false)}>Cancel</Button>
              <Button color="primary" onClick={saveItem} disabled={savingItem}>
                {savingItem ? <><Spinner size="sm" className="me-1" /> Saving…</> : editItem ? "Update Item" : "Add Item"}
              </Button>
            </Col>
          </Row>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
        <ModalHeader toggle={() => setDeleteModal(false)}>Delete Widget</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
          <p className="text-danger fs-13px">This will remove the widget and all its items from the storefront.</p>
          <div className="text-end">
            <Button color="light" className="me-2" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button color="danger" onClick={confirmDeleteWidget} disabled={deleting}>
              {deleting ? <><Spinner size="sm" className="me-1" /> Deleting…</> : "Delete Widget"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteItemModal} toggle={() => setDeleteItemModal(false)}>
        <ModalHeader toggle={() => setDeleteItemModal(false)}>Delete Item</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to delete <strong>{deleteItemTarget?.title || "this item"}</strong>?</p>
          <div className="text-end">
            <Button color="light" className="me-2" onClick={() => setDeleteItemModal(false)}>Cancel</Button>
            <Button color="danger" onClick={confirmDeleteItem} disabled={deletingItem}>
              {deletingItem ? <><Spinner size="sm" className="me-1" /> Deleting…</> : "Delete Item"}
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default AdminWidgetList;
