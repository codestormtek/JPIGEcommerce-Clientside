import React, { useState, useEffect, useCallback, useRef } from "react";
import { Modal, ModalBody, ModalHeader, Spinner, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import classnames from "classnames";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";

const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const blankGalleryForm = () => ({
  name: "", slug: "", description: "", isVisible: true, displayOrder: 0,
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
  const [activeTab,   setActiveTab]   = useState("info");

  const [deleteModal,  setDeleteModal]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [galleryImages, setGalleryImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imgError,      setImgError]      = useState(null);
  const [uploading,     setUploading]     = useState(false);

  const fileInputRef = useRef(null);
  const blankImageForm = () => ({ title: "", description: "", sortOrder: galleryImages.length, file: null });
  const [imageForm, setImageForm] = useState(blankImageForm());
  const setImgField = (k, v) => setImageForm((f) => ({ ...f, [k]: v }));

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
    setSlugTouched(false); setActiveTab("info"); setGalleryImages([]);
    setImgError(null); setImageForm({ title: "", description: "", sortOrder: 0, file: null });
    setModal(true);
  };

  const openEdit = async (g) => {
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
    setImgError(null);
    setActiveTab("info");
    setGalleryImages(g.images ?? []);
    setImageForm({ title: "", description: "", sortOrder: (g.images ?? []).length, file: null });
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
      let savedGallery;
      if (editTarget) {
        const res = await apiPatch(`/galleries/${editTarget.id}`, body);
        savedGallery = res?.data ?? editTarget;
      } else {
        const res = await apiPost("/galleries", body);
        savedGallery = res?.data ?? null;
      }
      if (savedGallery && !editTarget) {
        setEditTarget(savedGallery);
        setGalleryImages(savedGallery.images ?? []);
        setActiveTab("images");
      }
      loadGalleries();
      if (editTarget) {
        setModal(false);
      }
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

  const loadGalleryImages = async (galleryId) => {
    setImagesLoading(true);
    try {
      const res = await apiGet(`/galleries/${galleryId}`);
      setGalleryImages(res?.data?.images ?? []);
    } catch (e) { setImgError(e.message); }
    finally { setImagesLoading(false); }
  };

  const handleAddImage = async () => {
    if (!imageForm.file || !editTarget) return;
    setUploading(true); setImgError(null);
    try {
      const fd = new FormData();
      fd.append("file", imageForm.file);
      fd.append("folder", "galleries");
      fd.append("name", imageForm.title || imageForm.file.name.replace(/\.[^.]+$/, ""));
      const uploadRes = await apiUpload("/media/upload-resized", fd);
      const data = uploadRes?.data ?? uploadRes;
      const asset = data?.primary ?? data;
      if (!asset?.id) {
        throw new Error("Upload failed — no asset was returned from the server.");
      }
      await apiPost(`/galleries/${editTarget.id}/images`, {
        mediaAssetId: asset.id,
        title: imageForm.title || imageForm.file.name.replace(/\.[^.]+$/, ""),
        description: imageForm.description || undefined,
        sortOrder: Number(imageForm.sortOrder) || 0,
      });
      await loadGalleryImages(editTarget.id);
      loadGalleries();
      setImageForm({ title: "", description: "", sortOrder: galleryImages.length + 1, file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) { setImgError(err.message); }
    finally { setUploading(false); }
  };

  const removeImage = async (img) => {
    if (!editTarget) return;
    if (!window.confirm("Remove this image from the gallery?")) return;
    try {
      await apiDelete(`/galleries/${editTarget.id}/images/${img.id}`);
      await loadGalleryImages(editTarget.id);
      loadGalleries();
    } catch (e) { setImgError(e.message); }
  };

  const closeModal = () => {
    setModal(false);
    setEditTarget(null);
    setGalleryImages([]);
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

        <Modal isOpen={modal} toggle={closeModal} size="xl" scrollable>
          <ModalHeader toggle={closeModal}>
            {editTarget ? "Edit Gallery" : "Add Gallery"}
          </ModalHeader>
          <ModalBody>
            <Nav tabs className="mb-3">
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "info" })}
                  onClick={() => setActiveTab("info")}
                  style={{ cursor: "pointer" }}
                >
                  <Icon name="info" /> <span>Gallery Info</span>
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={classnames({ active: activeTab === "images" })}
                  onClick={() => { if (editTarget) setActiveTab("images"); }}
                  style={{ cursor: editTarget ? "pointer" : "not-allowed", opacity: editTarget ? 1 : 0.5 }}
                  title={!editTarget ? "Save the gallery first to manage images" : ""}
                >
                  <Icon name="img" /> <span>Images ({galleryImages.length})</span>
                </NavLink>
              </NavItem>
            </Nav>

            <TabContent activeTab={activeTab}>
              <TabPane tabId="info">
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
                  <Button color="light" onClick={closeModal}>Cancel</Button>
                  <Button color="primary" onClick={saveGallery} disabled={saving}>
                    {saving ? <Spinner size="sm" /> : editTarget ? "Save Changes" : "Create Gallery"}
                  </Button>
                </div>
              </TabPane>

              <TabPane tabId="images">
                {imgError && <div className="alert alert-danger">{imgError}</div>}

                <div className="card card-bordered mb-4">
                  <div className="card-inner">
                    <h6 className="mb-3">Add New Image</h6>
                    <Row className="g-3 align-items-end">
                      <Col md="3">
                        <div className="form-group mb-0">
                          <label className="form-label">Name</label>
                          <input className="form-control" value={imageForm.title}
                            onChange={(e) => setImgField("title", e.target.value)} placeholder="Image name" />
                        </div>
                      </Col>
                      <Col md="4">
                        <div className="form-group mb-0">
                          <label className="form-label">Description</label>
                          <input className="form-control" value={imageForm.description}
                            onChange={(e) => setImgField("description", e.target.value)} placeholder="Optional description" />
                        </div>
                      </Col>
                      <Col md="2">
                        <div className="form-group mb-0">
                          <label className="form-label">Order</label>
                          <input type="number" className="form-control" value={imageForm.sortOrder}
                            onChange={(e) => setImgField("sortOrder", e.target.value)} />
                        </div>
                      </Col>
                      <Col md="3">
                        <div className="form-group mb-0">
                          <label className="form-label">Image File</label>
                          <input type="file" className="form-control" accept="image/*" ref={fileInputRef}
                            onChange={(e) => setImgField("file", e.target.files?.[0] || null)} />
                        </div>
                      </Col>
                    </Row>
                    <div className="d-flex justify-content-end mt-3">
                      <Button color="primary" size="sm" onClick={handleAddImage} disabled={uploading || !imageForm.file}>
                        {uploading ? <Spinner size="sm" /> : <><Icon name="upload" /> Upload &amp; Add</>}
                      </Button>
                    </div>
                  </div>
                </div>

                <h6 className="mb-2">{galleryImages.length} image{galleryImages.length !== 1 ? "s" : ""} in this gallery</h6>

                {imagesLoading ? (
                  <div className="text-center py-4"><Spinner /></div>
                ) : galleryImages.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Icon name="img" style={{ fontSize: 48 }} className="d-block mx-auto mb-2" />
                    <p>No images yet. Use the form above to add some.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 80 }}>Image</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th style={{ width: 80 }}>Order</th>
                          <th style={{ width: 80 }}>Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {galleryImages.map((img) => (
                          <tr key={img.id}>
                            <td>
                              {img.mediaAsset?.url ? (
                                <img src={img.mediaAsset.url} alt={img.title || "gallery image"}
                                  style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4 }} />
                              ) : (
                                <div className="d-flex align-items-center justify-content-center bg-light"
                                  style={{ width: 60, height: 60, borderRadius: 4 }}>
                                  <Icon name="img" className="text-muted" />
                                </div>
                              )}
                            </td>
                            <td className="align-middle">{img.title || <em className="text-soft">Untitled</em>}</td>
                            <td className="align-middle">
                              <span className="text-soft">{img.description || "—"}</span>
                            </td>
                            <td className="align-middle text-center">{img.sortOrder}</td>
                            <td className="align-middle text-center">
                              <Button size="sm" color="danger" outline onClick={() => removeImage(img)}>
                                <Icon name="cross" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="d-flex justify-content-end mt-3">
                  <Button color="light" onClick={closeModal}>Close</Button>
                </div>
              </TabPane>
            </TabContent>
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
      </Content>
    </React.Fragment>
  );
};

export default AdminGalleryList;
