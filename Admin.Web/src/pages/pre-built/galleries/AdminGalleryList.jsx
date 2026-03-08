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
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const blankGalleryForm = () => ({
  name: "", slug: "", description: "", isVisible: true, displayOrder: 0,
});

const blankImageForm = () => ({
  mediaAssetId: "", title: "", description: "", sortOrder: 0,
});

const AdminGalleryList = () => {
  const [galleries,   setGalleries]   = useState([]);
  const [totalItems,  setTotalItems]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(10);

  const [modal,      setModal]      = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(blankGalleryForm());
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const [deleteModal,  setDeleteModal]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [imagesModal,    setImagesModal]    = useState(false);
  const [imagesGallery,  setImagesGallery]  = useState(null);
  const [galleryImages,  setGalleryImages]  = useState([]);
  const [imagesLoading,  setImagesLoading]  = useState(false);

  const [imgForm,       setImgForm]       = useState(blankImageForm());
  const [imgFormOpen,   setImgFormOpen]   = useState(false);
  const [imgEditTarget, setImgEditTarget] = useState(null);
  const [imgSaving,     setImgSaving]     = useState(false);
  const [imgError,      setImgError]      = useState(null);

  const loadGalleries = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const qs = `page=${currentPage}&limit=${itemPerPage}&orderBy=displayOrder&order=asc`;
      const res = await apiGet(`/galleries?${qs}`);
      setGalleries(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [currentPage, itemPerPage]);

  useEffect(() => { loadGalleries(); }, [loadGalleries]);

  const openCreate = () => {
    setEditTarget(null); setForm(blankGalleryForm()); setFormError(null);
    setSlugTouched(false); setModal(true);
  };

  const openEdit = (g) => {
    setEditTarget(g);
    setForm({
      name:         g.name         ?? "",
      slug:         g.slug         ?? "",
      description:  g.description  ?? "",
      isVisible:    g.isVisible    ?? true,
      displayOrder: g.displayOrder ?? 0,
    });
    setSlugTouched(true);
    setFormError(null);
    setModal(true);
  };

  const saveGallery = async () => {
    setSaving(true); setFormError(null);
    try {
      const body = {
        name:         form.name,
        slug:         form.slug,
        description:  form.description || undefined,
        isVisible:    form.isVisible,
        displayOrder: Number(form.displayOrder),
      };
      if (editTarget) await apiPatch(`/galleries/${editTarget.id}`, body);
      else            await apiPost("/galleries", body);
      setModal(false);
      loadGalleries();
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/galleries/${deleteTarget.id}`);
      setDeleteModal(false); setDeleteTarget(null); loadGalleries();
    } catch (e) { setError(e.message); }
    finally { setDeleting(false); }
  };

  const setField = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "name" && !slugTouched) next.slug = slugify(v);
      return next;
    });
  };

  const openImagesModal = async (gallery) => {
    setImagesGallery(gallery);
    setImagesModal(true);
    setImgFormOpen(false);
    setImgEditTarget(null);
    setImgError(null);
    await loadGalleryImages(gallery.id);
  };

  const loadGalleryImages = async (galleryId) => {
    setImagesLoading(true);
    try {
      const res = await apiGet(`/galleries/${galleryId}`);
      setGalleryImages(res?.data?.images ?? []);
    } catch (e) { setImgError(e.message); }
    finally { setImagesLoading(false); }
  };

  const openAddImage = () => {
    setImgEditTarget(null); setImgForm(blankImageForm());
    setImgError(null); setImgFormOpen(true);
  };

  const openEditImage = (img) => {
    setImgEditTarget(img);
    setImgForm({
      mediaAssetId: img.mediaAssetId ?? "",
      title:        img.title        ?? "",
      description:  img.description  ?? "",
      sortOrder:    img.sortOrder    ?? 0,
    });
    setImgError(null); setImgFormOpen(true);
  };

  const saveImage = async () => {
    if (!imagesGallery) return;
    setImgSaving(true); setImgError(null);
    try {
      if (imgEditTarget) {
        await apiPatch(`/galleries/${imagesGallery.id}/images/${imgEditTarget.id}`, {
          title:       imgForm.title       || undefined,
          description: imgForm.description || undefined,
          sortOrder:   Number(imgForm.sortOrder),
        });
      } else {
        await apiPost(`/galleries/${imagesGallery.id}/images`, {
          mediaAssetId: imgForm.mediaAssetId,
          title:        imgForm.title       || undefined,
          description:  imgForm.description || undefined,
          sortOrder:    Number(imgForm.sortOrder),
        });
      }
      setImgFormOpen(false);
      await loadGalleryImages(imagesGallery.id);
      loadGalleries();
    } catch (e) { setImgError(e.message); }
    finally { setImgSaving(false); }
  };

  const removeImage = async (img) => {
    if (!imagesGallery) return;
    if (!window.confirm("Remove this image from the gallery?")) return;
    try {
      await apiDelete(`/galleries/${imagesGallery.id}/images/${img.id}`);
      await loadGalleryImages(imagesGallery.id);
      loadGalleries();
    } catch (e) { setImgError(e.message); }
  };

  return (
    <React.Fragment>
      <Head title="Galleries" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Photo Galleries</BlockTitle>
              <BlockDes className="text-soft">
                <p>{totalItems} galler{totalItems !== 1 ? "ies" : "y"} configured.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreate}>
                <Icon name="plus" /><span>Add Gallery</span>
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
                <DataTableRow><span className="sub-text">Name</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Slug</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">Description</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Images</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text">Visible</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={7} className="text-center py-4"><Spinner /></td></tr>
              ) : galleries.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">No galleries yet. Click &ldquo;Add Gallery&rdquo; to get started.</td></tr>
              ) : galleries.map((g) => (
                <DataTableItem key={g.id}>
                  <DataTableRow><span className="fw-semibold">{g.displayOrder}</span></DataTableRow>
                  <DataTableRow><span className="fw-semibold">{g.name}</span></DataTableRow>
                  <DataTableRow size="md"><code>{g.slug}</code></DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-soft">{g.description ? (g.description.length > 60 ? g.description.slice(0, 60) + "…" : g.description) : "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="sm"><span className="badge bg-light text-dark">{g.images?.length ?? 0}</span></DataTableRow>
                  <DataTableRow size="sm">
                    <span className={`badge badge-sm ${g.isVisible ? "bg-success" : "bg-secondary"}`}>
                      {g.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li>
                        <Button size="sm" color="info" outline onClick={() => openImagesModal(g)}>
                          <Icon name="img" /><span>Images</span>
                        </Button>
                      </li>
                      <li>
                        <Button size="sm" color="light" onClick={() => openEdit(g)}>
                          <Icon name="edit" /><span>Edit</span>
                        </Button>
                      </li>
                      <li>
                        <Button size="sm" color="danger" outline onClick={() => { setDeleteTarget(g); setDeleteModal(true); }}>
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

        <Modal isOpen={modal} toggle={() => setModal(false)} size="lg">
          <ModalHeader toggle={() => setModal(false)}>
            {editTarget ? "Edit Gallery" : "Add Gallery"}
          </ModalHeader>
          <ModalBody>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <Row className="g-3">
              <Col md="8">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-control" value={form.name}
                    onChange={(e) => setField("name", e.target.value)} placeholder="Gallery name" />
                </div>
              </Col>
              <Col md="4">
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input type="number" className="form-control" value={form.displayOrder}
                    onChange={(e) => setField("displayOrder", e.target.value)} />
                </div>
              </Col>
              <Col md="8">
                <div className="form-group">
                  <label className="form-label">Slug</label>
                  <input className="form-control" value={form.slug}
                    onChange={(e) => { setSlugTouched(true); setField("slug", e.target.value); }}
                    placeholder="auto-generated-from-name" />
                </div>
              </Col>
              <Col md="4">
                <div className="form-group pt-4">
                  <div className="custom-control custom-switch">
                    <input type="checkbox" className="custom-control-input" id="galleryVisible"
                      checked={form.isVisible} onChange={(e) => setField("isVisible", e.target.checked)} />
                    <label className="custom-control-label" htmlFor="galleryVisible">Visible</label>
                  </div>
                </div>
              </Col>
              <Col md="12">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="3" value={form.description}
                    onChange={(e) => setField("description", e.target.value)} placeholder="Optional description" />
                </div>
              </Col>
            </Row>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button color="light" onClick={() => setModal(false)}>Cancel</Button>
              <Button color="primary" onClick={saveGallery} disabled={saving}>
                {saving ? <Spinner size="sm" /> : editTarget ? "Save Changes" : "Create Gallery"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalHeader toggle={() => setDeleteModal(false)}>Delete Gallery</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to delete <strong>{deleteTarget?.name || "this gallery"}</strong>? This action cannot be undone.</p>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
              <Button color="danger" onClick={doDelete} disabled={deleting}>
                {deleting ? <Spinner size="sm" /> : "Delete"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        <Modal isOpen={imagesModal} toggle={() => setImagesModal(false)} size="xl" scrollable>
          <ModalHeader toggle={() => setImagesModal(false)}>
            Images — {imagesGallery?.name}
          </ModalHeader>
          <ModalBody>
            {imgError && <div className="alert alert-danger">{imgError}</div>}

            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-soft">{galleryImages.length} image{galleryImages.length !== 1 ? "s" : ""}</span>
              <Button size="sm" color="primary" onClick={openAddImage}>
                <Icon name="plus" /><span>Add Image</span>
              </Button>
            </div>

            {imgFormOpen && (
              <div className="card card-bordered mb-3">
                <div className="card-inner">
                  <h6 className="mb-3">{imgEditTarget ? "Edit Image" : "Add Image"}</h6>
                  <Row className="g-3">
                    {!imgEditTarget && (
                      <Col md="12">
                        <div className="form-group">
                          <label className="form-label">Media Asset ID</label>
                          <input className="form-control" value={imgForm.mediaAssetId}
                            onChange={(e) => setImgForm((f) => ({ ...f, mediaAssetId: e.target.value }))}
                            placeholder="Paste media asset UUID from Media Library" />
                        </div>
                      </Col>
                    )}
                    <Col md="5">
                      <div className="form-group">
                        <label className="form-label">Title</label>
                        <input className="form-control" value={imgForm.title}
                          onChange={(e) => setImgForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Optional title" />
                      </div>
                    </Col>
                    <Col md="5">
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <input className="form-control" value={imgForm.description}
                          onChange={(e) => setImgForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Optional description" />
                      </div>
                    </Col>
                    <Col md="2">
                      <div className="form-group">
                        <label className="form-label">Sort Order</label>
                        <input type="number" className="form-control" value={imgForm.sortOrder}
                          onChange={(e) => setImgForm((f) => ({ ...f, sortOrder: e.target.value }))} />
                      </div>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button size="sm" color="light" onClick={() => setImgFormOpen(false)}>Cancel</Button>
                    <Button size="sm" color="primary" onClick={saveImage} disabled={imgSaving}>
                      {imgSaving ? <Spinner size="sm" /> : imgEditTarget ? "Update" : "Add"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {imagesLoading ? (
              <div className="text-center py-4"><Spinner /></div>
            ) : galleryImages.length === 0 ? (
              <div className="text-center py-4 text-muted">No images in this gallery yet.</div>
            ) : (
              <Row className="g-3">
                {galleryImages.map((img) => (
                  <Col sm="6" md="4" lg="3" key={img.id}>
                    <div className="card card-bordered h-100">
                      {img.mediaAsset?.url ? (
                        <img src={img.mediaAsset.url} alt={img.title || "gallery image"}
                          className="card-img-top" style={{ height: 160, objectFit: "cover" }} />
                      ) : (
                        <div className="card-img-top d-flex align-items-center justify-content-center bg-light"
                          style={{ height: 160 }}>
                          <Icon name="img" className="text-muted" style={{ fontSize: 32 }} />
                        </div>
                      )}
                      <div className="card-inner p-2">
                        <p className="fw-semibold mb-0 small">{img.title || <em className="text-soft">No title</em>}</p>
                        {img.description && <p className="text-soft small mb-0">{img.description}</p>}
                        <p className="text-soft small mb-1">Order: {img.sortOrder}</p>
                        <div className="d-flex gap-1">
                          <Button size="xs" color="light" onClick={() => openEditImage(img)}>
                            <Icon name="edit" />
                          </Button>
                          <Button size="xs" color="danger" outline onClick={() => removeImage(img)}>
                            <Icon name="trash" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </ModalBody>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default AdminGalleryList;
