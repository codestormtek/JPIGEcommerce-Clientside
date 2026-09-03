import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const blankForm = () => ({
  title: "", subTitle: "", displayOrder: 0, isVisible: true,
  mediaAssetId: "", mobileMediaAssetId: "",
  buttonText: "", buttonUrl: "",
});

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminCarouselList = () => {
  const [slides,      setSlides]      = useState([]);
  const [totalItems,  setTotalItems]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(10);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modal,       setModal]       = useState(false);   // create | edit
  const [editTarget,  setEditTarget]  = useState(null);    // null = create mode
  const [form,        setForm]        = useState(blankForm());
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState(null);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  // ── Load slides ───────────────────────────────────────────────────────────
  const loadSlides = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const qs = `page=${currentPage}&limit=${itemPerPage}&orderBy=displayOrder&order=asc`;
      const res = await apiGet(`/carousel?${qs}`);
      setSlides(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [currentPage, itemPerPage]);

  useEffect(() => { loadSlides(); }, [loadSlides]);

  // ── Open create modal ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null); setForm(blankForm()); setFormError(null); setModal(true);
  };

  // ── Open edit modal ───────────────────────────────────────────────────────
  const openEdit = (slide) => {
    setEditTarget(slide);
    setForm({
      title:              slide.title              ?? "",
      subTitle:           slide.subTitle           ?? "",
      displayOrder:       slide.displayOrder       ?? 0,
      isVisible:          slide.isVisible          ?? true,
      mediaAssetId:       slide.mediaAssetId       ?? "",
      mobileMediaAssetId: slide.mobileMediaAssetId ?? "",
      buttonText:         slide.buttonText         ?? "",
      buttonUrl:          slide.buttonUrl          ?? "",
    });
    setFormError(null);
    setModal(true);
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const saveSlide = async () => {
    setSaving(true); setFormError(null);
    try {
      const body = {
        title:              form.title              || undefined,
        subTitle:           form.subTitle           || undefined,
        displayOrder:       Number(form.displayOrder),
        isVisible:          form.isVisible,
        mediaAssetId:       form.mediaAssetId       || undefined,
        mobileMediaAssetId: form.mobileMediaAssetId || undefined,
        buttonText:         form.buttonText         || undefined,
        buttonUrl:          form.buttonUrl          || undefined,
      };
      if (editTarget) await apiPatch(`/carousel/${editTarget.id}`, body);
      else            await apiPost("/carousel", body);
      setModal(false);
      loadSlides();
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/carousel/${deleteTarget.id}`);
      setDeleteModal(false); setDeleteTarget(null); loadSlides();
    } catch (e) { setError(e.message); }
    finally { setDeleting(false); }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

// ─── Image upload widget ──────────────────────────────────────────────────────

const ImageUploadWidget = ({ label, assetId, previewUrl, onUploaded, onRemove, slideName }) => {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "carousel");
      fd.append("name", slideName || "carousel_slide");
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <React.Fragment>
      <Head title="Carousel Slides" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Homepage Carousel</BlockTitle>
              <BlockDes className="text-soft">
                <p>{totalItems} slide{totalItems !== 1 ? "s" : ""} configured for the front-page slider.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreate}>
                <Icon name="plus" /><span>Add Slide</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {error && <div className="alert alert-danger">{error}</div>}
          <DataTable className="card-stretch">
            <DataTableBody>
              <DataTableHead>
                <DataTableRow><span className="sub-text">Order</span></DataTableRow>
                <DataTableRow><span className="sub-text">Image</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Title / Sub-title</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">Button</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Visible</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={6} className="text-center py-4"><Spinner /></td></tr>
              ) : slides.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-muted">No slides yet. Click &ldquo;Add Slide&rdquo; to get started.</td></tr>
              ) : slides.map((slide) => (
                <DataTableItem key={slide.id}>
                  <DataTableRow><span className="fw-semibold">{slide.displayOrder}</span></DataTableRow>
                  <DataTableRow>
                    {slide.mediaAsset?.url
                      ? <img src={slide.mediaAsset.url} alt={slide.title ?? "slide"} style={{ height: 48, width: 80, objectFit: "cover", borderRadius: 4 }} />
                      : <span className="text-soft">—</span>}
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="d-block fw-semibold">{slide.title || <em className="text-soft">No title</em>}</span>
                    <span className="text-soft small">{slide.subTitle || ""}</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    {slide.buttonText
                      ? <><span className="fw-medium">{slide.buttonText}</span><br /><span className="text-soft small">{slide.buttonUrl}</span></>
                      : <span className="text-soft">—</span>}
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <span className={`badge badge-sm ${slide.isVisible ? "bg-success" : "bg-secondary"}`}>
                      {slide.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li>
                        <Button size="sm" color="light" onClick={() => openEdit(slide)}>
                          <Icon name="edit" /><span>Edit</span>
                        </Button>
                      </li>
                      <li>
                        <Button size="sm" color="danger" outline onClick={() => { setDeleteTarget(slide); setDeleteModal(true); }}>
                          <Icon name="trash" />
                        </Button>
                      </li>
                    </ul>
                  </DataTableRow>
                </DataTableItem>
              ))}
            </DataTableBody>

            <div className="card-inner">
              {totalItems > 0 && (
                <PaginationComponent
                  itemPerPage={itemPerPage} totalItems={totalItems}
                  paginate={setCurrentPage} currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Create / Edit Modal ───────────────────────────────────────── */}
        <Modal isOpen={modal} toggle={() => setModal(false)} size="xl" scrollable>
          <ModalHeader toggle={() => setModal(false)}>
            {editTarget ? "Edit Slide" : "Add Slide"}
          </ModalHeader>
          <ModalBody>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <Row>
              <Col md="8">
                <Row className="g-3">
                  <Col md="8">
                    <div className="form-group">
                      <label className="form-label">Title</label>
                      <input className="form-control" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Slide heading" />
                    </div>
                  </Col>
                  <Col md="4">
                    <div className="form-group">
                      <label className="form-label">Display Order</label>
                      <input type="number" className="form-control" value={form.displayOrder} onChange={(e) => setField("displayOrder", e.target.value)} />
                    </div>
                  </Col>
                  <Col md="12">
                    <div className="form-group">
                      <label className="form-label">Sub-title</label>
                      <input className="form-control" value={form.subTitle} onChange={(e) => setField("subTitle", e.target.value)} placeholder="Optional sub-heading" />
                    </div>
                  </Col>
                  <Col md="6">
                    <div className="form-group">
                      <label className="form-label">Button Text</label>
                      <input className="form-control" value={form.buttonText} onChange={(e) => setField("buttonText", e.target.value)} placeholder="e.g. Shop Now" />
                    </div>
                  </Col>
                  <Col md="6">
                    <div className="form-group">
                      <label className="form-label">Button URL</label>
                      <input className="form-control" value={form.buttonUrl} onChange={(e) => setField("buttonUrl", e.target.value)} placeholder="/menu or https://..." />
                    </div>
                  </Col>
                  <Col md="12">
                    <div className="form-group">
                      <div className="custom-control custom-switch">
                        <input type="checkbox" className="custom-control-input" id="isVisible" checked={form.isVisible}
                          onChange={(e) => setField("isVisible", e.target.checked)} />
                        <label className="custom-control-label" htmlFor="isVisible">Visible on homepage</label>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>
              <Col md="4" className="border-start ps-4">
                <div className="mb-4">
                  <ImageUploadWidget
                    label="Desktop Image"
                    assetId={form.mediaAssetId}
                    previewUrl={editTarget?.mediaAsset?.url ?? null}
                    onUploaded={(asset) => setField("mediaAssetId", asset.id)}
                    onRemove={() => setField("mediaAssetId", "")}
                    slideName={form.title || "carousel_desktop"}
                  />
                </div>
                <div>
                  <ImageUploadWidget
                    label="Mobile Image (optional)"
                    assetId={form.mobileMediaAssetId}
                    previewUrl={editTarget?.mobileMediaAsset?.url ?? null}
                    onUploaded={(asset) => setField("mobileMediaAssetId", asset.id)}
                    onRemove={() => setField("mobileMediaAssetId", "")}
                    slideName={form.title ? `${form.title}_mobile` : "carousel_mobile"}
                  />
                </div>
              </Col>
            </Row>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button color="light" onClick={() => setModal(false)}>Cancel</Button>
              <Button color="primary" onClick={saveSlide} disabled={saving}>
                {saving ? <Spinner size="sm" /> : editTarget ? "Save Changes" : "Create Slide"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Delete Confirm Modal ──────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalHeader toggle={() => setDeleteModal(false)}>Delete Slide</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to delete <strong>{deleteTarget?.title || "this slide"}</strong>? This action cannot be undone.</p>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
              <Button color="danger" onClick={doDelete} disabled={deleting}>
                {deleting ? <Spinner size="sm" /> : "Delete"}
              </Button>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default AdminCarouselList;
