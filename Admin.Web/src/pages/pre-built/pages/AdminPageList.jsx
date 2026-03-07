import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";
import { Editor } from "@tinymce/tinymce-react";
import { useTheme } from "@/layout/provider/Theme";
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/content/default/content";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/charmap";
import "tinymce/plugins/preview";
import "tinymce/plugins/anchor";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/media";
import "tinymce/plugins/table";
import "tinymce/plugins/help";
import "tinymce/plugins/wordcount";

const toSlug = (t) =>
  t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const BLANK_FORM = {
  title: "",
  slug: "",
  bodyHtml: "",
  metaTitle: "",
  metaDescription: "",
  isPublished: false,
  passwordProtected: false,
  includeInSitemap: false,
  includeInTopMenu: false,
  includeInFooterColumn1: false,
  includeInFooterColumn2: false,
  includeInFooterColumn3: false,
  displayOrder: 0,
};

const BoolIcon = ({ value }) =>
  value ? (
    <Icon name="check-circle" className="text-success" style={{ fontSize: 18 }} />
  ) : (
    <Icon name="cross-circle" className="text-danger" style={{ fontSize: 18 }} />
  );

const AdminPageList = () => {
  const theme = useTheme();

  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(15);

  const [pages, setPages] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  const [editModal, setEditModal] = useState(false);
  const [editPage, setEditPage] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const searchTimer = useRef(null);

  const loadPages = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const opts = {
        page: currentPage,
        limit: itemPerPage,
        orderBy: "displayOrder",
        order: "asc",
        search: searchText || undefined,
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const res = await apiGet(`/pages?${qs}`);
      setPages(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, searchText]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      loadPages({ page: 1, search: val || undefined });
    }, 400);
  };

  const openAdd = () => {
    setAddForm(BLANK_FORM);
    setAddError(null);
    setAddModal(true);
  };

  const openEdit = (pg) => {
    setEditPage(pg);
    setEditForm({
      title: pg.title || "",
      slug: pg.slug || "",
      bodyHtml: pg.bodyHtml || "",
      metaTitle: pg.metaTitle || "",
      metaDescription: pg.metaDescription || "",
      isPublished: pg.isPublished ?? false,
      passwordProtected: pg.passwordProtected ?? false,
      includeInSitemap: pg.includeInSitemap ?? false,
      includeInTopMenu: pg.includeInTopMenu ?? false,
      includeInFooterColumn1: pg.includeInFooterColumn1 ?? false,
      includeInFooterColumn2: pg.includeInFooterColumn2 ?? false,
      includeInFooterColumn3: pg.includeInFooterColumn3 ?? false,
      displayOrder: pg.displayOrder ?? 0,
    });
    setEditError(null);
    setEditModal(true);
  };

  const handleAddTitleChange = (val) => {
    setAddForm((f) => ({
      ...f,
      title: val,
      slug: toSlug(val),
    }));
  };

  const handleEditTitleChange = (val) => {
    setEditForm((f) => ({
      ...f,
      title: val,
      slug: toSlug(val),
    }));
  };

  const submitAdd = async () => {
    setAddSaving(true);
    setAddError(null);
    try {
      await apiPost("/pages", {
        ...addForm,
        displayOrder: Number(addForm.displayOrder) || 0,
      });
      setAddModal(false);
      loadPages();
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAddSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editPage) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await apiPatch(`/pages/${editPage.id}`, {
        ...editForm,
        displayOrder: Number(editForm.displayOrder) || 0,
      });
      setEditModal(false);
      loadPages();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/pages/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      loadPages();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const tinymceInit = {
    height: 350,
    menubar: "file edit view insert format tools table",
    plugins: [
      "advlist", "autolink", "lists", "link", "image", "charmap", "preview",
      "anchor", "searchreplace", "visualblocks", "code", "fullscreen",
      "insertdatetime", "media", "table", "help", "wordcount",
    ],
    toolbar:
      "undo redo | formatselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | code",
    skin: false,
    content_css: false,
    promotion: false,
    branding: false,
  };

  const renderForm = (form, setForm, onTitleChange, error, isEdit = false) => (
    <div className="row g-4">
      <div className="col-12">
        <h6 className="overline-title mb-2">Info</h6>
        <div className="card card-bordered p-3">
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Title</label>
              <input
                className="form-control"
                value={form.title}
                onChange={(e) => onTitleChange(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Body</label>
              <Editor
                init={tinymceInit}
                value={form.bodyHtml}
                onEditorChange={(val) => setForm((f) => ({ ...f, bodyHtml: val }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">URL Slug</label>
              <input
                className="form-control"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                className="form-control"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <h6 className="overline-title mb-2">SEO</h6>
        <div className="card card-bordered p-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Meta Title</label>
              <input
                className="form-control"
                value={form.metaTitle}
                onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Meta Description</label>
              <input
                className="form-control"
                value={form.metaDescription}
                onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <h6 className="overline-title mb-2">Display</h6>
        <div className="card card-bordered p-3">
          <div className="row g-3">
            {[
              ["isPublished", "Published"],
              ["passwordProtected", "Password Protected"],
              ["includeInSitemap", "Include in Sitemap"],
              ["includeInTopMenu", "Include in Top Menu"],
              ["includeInFooterColumn1", "Include in Footer (Column 1)"],
              ["includeInFooterColumn2", "Include in Footer (Column 2)"],
              ["includeInFooterColumn3", "Include in Footer (Column 3)"],
            ].map(([key, label]) => (
              <div className="col-md-4" key={key}>
                <div className="custom-control custom-checkbox">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id={`${isEdit ? "edit" : "add"}-${key}`}
                    checked={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  />
                  <label className="custom-control-label" htmlFor={`${isEdit ? "edit" : "add"}-${key}`}>
                    {label}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="col-12">
          <div className="alert alert-danger">{error}</div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Head title="Pages" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Pages (Topics)
              </BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <ul className="nk-block-tools g-3">
                  <li>
                    <div className="form-control-wrap" style={{ width: 240 }}>
                      <div className="form-icon form-icon-left">
                        <Icon name="search" />
                      </div>
                      <input
                        className="form-control"
                        placeholder="Search pages…"
                        value={searchText}
                        onChange={onSearchChange}
                      />
                    </div>
                  </li>
                  <li className="nk-block-tools-opt">
                    <Button color="primary" onClick={openAdd}>
                      <Icon name="plus" />
                      <span>Add New</span>
                    </Button>
                  </li>
                </ul>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <DataTable className="card-stretch">
            <DataTableBody>
              <DataTableHead>
                <DataTableRow><span className="sub-text">Name</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text text-center d-block">Published</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text text-center d-block">Password Protected</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text text-center d-block">Sitemap</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text text-center d-block">Top Menu</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text text-center d-block">Footer (1)</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text text-center d-block">Footer (2)</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text text-center d-block">Footer (3)</span></DataTableRow>
                <DataTableRow size="sm"><span className="sub-text text-center d-block">Order</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span className="sub-text">Actions</span></DataTableRow>
              </DataTableHead>
              {loading ? (
                <div className="text-center p-4"><Spinner color="primary" /></div>
              ) : error ? (
                <div className="text-center text-danger p-4">{error}</div>
              ) : pages.length === 0 ? (
                <div className="text-center text-muted p-4">No pages found. Click "Add New" to create one.</div>
              ) : (
                pages.map((pg) => (
                  <DataTableItem key={pg.id}>
                    <DataTableRow>
                      <span className="tb-lead">{pg.title}</span>
                      <span className="tb-sub text-muted" style={{ fontSize: 12 }}>/{pg.slug}</span>
                    </DataTableRow>
                    <DataTableRow size="sm" className="text-center"><BoolIcon value={pg.isPublished} /></DataTableRow>
                    <DataTableRow size="md" className="text-center"><BoolIcon value={pg.passwordProtected} /></DataTableRow>
                    <DataTableRow size="md" className="text-center"><BoolIcon value={pg.includeInSitemap} /></DataTableRow>
                    <DataTableRow size="md" className="text-center"><BoolIcon value={pg.includeInTopMenu} /></DataTableRow>
                    <DataTableRow size="lg" className="text-center"><BoolIcon value={pg.includeInFooterColumn1} /></DataTableRow>
                    <DataTableRow size="lg" className="text-center"><BoolIcon value={pg.includeInFooterColumn2} /></DataTableRow>
                    <DataTableRow size="lg" className="text-center"><BoolIcon value={pg.includeInFooterColumn3} /></DataTableRow>
                    <DataTableRow size="sm" className="text-center">{pg.displayOrder}</DataTableRow>
                    <DataTableRow className="nk-tb-col-tools text-end">
                      <ul className="nk-tb-actions gx-1">
                        <li>
                          <a href="#edit" onClick={(e) => { e.preventDefault(); openEdit(pg); }} className="btn btn-sm btn-icon btn-trigger" title="Edit">
                            <Icon name="edit" />
                          </a>
                        </li>
                        <li>
                          <a href="#del" onClick={(e) => { e.preventDefault(); setDeleteTarget(pg); setDeleteModal(true); }} className="btn btn-sm btn-icon btn-trigger text-danger" title="Delete">
                            <Icon name="trash" />
                          </a>
                        </li>
                      </ul>
                    </DataTableRow>
                  </DataTableItem>
                ))
              )}
            </DataTableBody>
            {totalItems > itemPerPage && (
              <div className="card-inner">
                <PaginationComponent
                  itemPerPage={itemPerPage}
                  totalItems={totalItems}
                  paginate={(p) => setCurrentPage(p)}
                  currentPage={currentPage}
                />
              </div>
            )}
          </DataTable>
        </Block>

        {/* ─── Add Modal ─── */}
        <Modal isOpen={addModal} toggle={() => setAddModal(false)} className="modal-dialog-centered" size="xl">
          <ModalBody>
            <a href="#close" onClick={(e) => { e.preventDefault(); setAddModal(false); }} className="close">
              <Icon name="cross-sm" />
            </a>
            <div className="p-2">
              <h5 className="title mb-4">Add New Page</h5>
              {renderForm(addForm, setAddForm, handleAddTitleChange, addError, false)}
              <div className="mt-4">
                <Button color="primary" size="lg" onClick={submitAdd} disabled={addSaving || !addForm.title || !addForm.slug}>
                  {addSaving ? <Spinner size="sm" /> : <Icon name="plus" />}
                  <span>Create Page</span>
                </Button>
              </div>
            </div>
          </ModalBody>
        </Modal>

        {/* ─── Edit Modal ─── */}
        <Modal isOpen={editModal} toggle={() => setEditModal(false)} className="modal-dialog-centered" size="xl">
          <ModalBody>
            <a href="#close" onClick={(e) => { e.preventDefault(); setEditModal(false); }} className="close">
              <Icon name="cross-sm" />
            </a>
            <div className="p-2">
              <h5 className="title mb-4">Edit Page — {editPage?.title}</h5>
              {renderForm(editForm, setEditForm, handleEditTitleChange, editError, true)}
              <div className="mt-4 d-flex justify-content-between">
                <Button color="primary" size="lg" onClick={submitEdit} disabled={editSaving || !editForm.title || !editForm.slug}>
                  {editSaving ? <Spinner size="sm" /> : <Icon name="check" />}
                  <span>Save Changes</span>
                </Button>
                <Button color="danger" outline onClick={() => { setDeleteTarget(editPage); setDeleteModal(true); setEditModal(false); }}>
                  <Icon name="trash" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          </ModalBody>
        </Modal>

        {/* ─── Delete Confirm ─── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} className="modal-dialog-centered" size="sm">
          <ModalBody className="text-center py-4">
            <div className="nk-modal-icon icon-circle icon-circle-xxl bg-danger bg-opacity-10 mx-auto mb-3">
              <Icon name="alert-fill" className="text-danger" style={{ fontSize: 36 }} />
            </div>
            <h5>Delete Page?</h5>
            <p className="text-muted">Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.</p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
              <Button color="danger" onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? <Spinner size="sm" /> : "Delete"}
              </Button>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </>
  );
};

export default AdminPageList;
