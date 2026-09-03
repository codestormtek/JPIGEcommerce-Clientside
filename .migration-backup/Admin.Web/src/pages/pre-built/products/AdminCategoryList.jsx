import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, Spinner } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload, getAccessToken } from "@/utils/apiClient";

// ─── Component ───────────────────────────────────────────────────────────────

const AdminCategoryList = () => {
  // Data state
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Client-side filter / sort / pagination
  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(10);

  // Add modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", parentCategoryId: "" });
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", parentCategoryId: "" });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete confirm
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const searchTimer = useRef(null);

  // ─── Load categories ─────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/products/categories");
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setAllCategories(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // ─── Client-side derived data ─────────────────────────────────────────────

  const filtered = allCategories.filter((c) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.parentCategory?.name?.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortField === "name") { aVal = (a.name ?? "").toLowerCase(); bVal = (b.name ?? "").toLowerCase(); }
    else if (sortField === "parent") { aVal = (a.parentCategory?.name ?? "").toLowerCase(); bVal = (b.parentCategory?.name ?? "").toLowerCase(); }
    else if (sortField === "products") { aVal = a._count?.productMaps ?? 0; bVal = b._count?.productMaps ?? 0; }
    else if (sortField === "children") { aVal = a._count?.children ?? 0; bVal = b._count?.children ?? 0; }
    else { aVal = (a.name ?? "").toLowerCase(); bVal = (b.name ?? "").toLowerCase(); }
    if (aVal < bVal) return sort === "asc" ? -1 : 1;
    if (aVal > bVal) return sort === "asc" ? 1 : -1;
    return 0;
  });

  const totalItems = sorted.length;
  const pageStart = (currentPage - 1) * itemPerPage;
  const pageCategories = sorted.slice(pageStart, pageStart + itemPerPage);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const paginate = (p) => setCurrentPage(p);

  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setCurrentPage(1), 300);
  };

  const onSortClick = (field) => {
    if (sortField === field) { setSort((s) => (s === "asc" ? "desc" : "asc")); }
    else { setSortField(field); setSort("asc"); }
    setCurrentPage(1);
  };

  const onAddImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddImageFile(file);
    setAddImagePreview(URL.createObjectURL(file));
  };

  const onEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const openAddModal = () => {
    setAddForm({ name: "", parentCategoryId: "" });
    setAddImageFile(null); setAddImagePreview(null);
    setAddError(null); setAddModal(true);
  };

  const saveAdd = async () => {
    if (!addForm.name.trim()) { setAddError("Name is required."); return; }
    setAddSaving(true); setAddError(null);
    try {
      const body = { name: addForm.name };
      if (addForm.parentCategoryId) body.parentCategoryId = addForm.parentCategoryId;
      const res = await apiPost("/products/categories", body);
      const newId = res?.data?.id ?? res?.id;
      if (addImageFile && newId) {
        const fd = new FormData();
        fd.append("file", addImageFile);
        await apiUpload(`/products/categories/${newId}/image`, fd);
      }
      setAddModal(false);
      loadCategories();
    } catch (e) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  const openEditModal = (cat) => {
    setEditCategory(cat);
    setEditForm({ name: cat.name ?? "", parentCategoryId: cat.parentCategoryId ?? "" });
    setEditImageFile(null);
    setEditImagePreview(cat.imageUrl ?? null);
    setEditError(null);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { setEditError("Name is required."); return; }
    setEditSaving(true); setEditError(null);
    try {
      const body = { name: editForm.name };
      if (editForm.parentCategoryId) body.parentCategoryId = editForm.parentCategoryId;
      else body.parentCategoryId = null;
      await apiPatch(`/products/categories/${editCategory.id}`, body);
      if (editImageFile) {
        const fd = new FormData();
        fd.append("file", editImageFile);
        await apiUpload(`/products/categories/${editCategory.id}/image`, fd);
      }
      setEditModal(false);
      loadCategories();
    } catch (e) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/products/categories/${deleteTarget.id}`);
      setDeleteModal(false); setDeleteTarget(null);
      loadCategories();
    } catch (e) { setError(e.message); }
    finally { setDeleteLoading(false); }
  };

  const doExport = async (format) => {
    setExporting(true); setExportError(null);
    try {
      const res = await apiPost("/exports", { entity: "categories", format });
      const jobId = res?.data?.id ?? res?.id;
      let status = "pending"; let attempts = 0;
      while (status !== "done" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await apiGet(`/exports/${jobId}`);
        status = poll?.data?.status ?? poll?.status;
        attempts++;
      }
      if (status !== "done") throw new Error("Export timed out");
      const token = getAccessToken();
      const dl = await fetch(`/api/v1/exports/${jobId}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!dl.ok) throw new Error("Download failed");
      const blob = await dl.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `categories-export.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setExportError(e.message); }
    finally { setExporting(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // Parent selector options (exclude self when editing)
  const parentOptions = allCategories.filter((c) => !editCategory || c.id !== editCategory.id);

  return (
    <React.Fragment>
      <Head title="Categories" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Product Categories</BlockTitle>
              <BlockDes className="text-soft">
                <p>You have a total of {allCategories.length} categories.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <div className="toggle-expand-content">
                  <ul className="nk-block-tools g-3">
                    {exportError && <li><span className="text-danger small">{exportError}</span></li>}
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-white btn-outline-light" disabled={exporting}>
                          {exporting ? <Spinner size="sm" /> : <Icon name="download-cloud" />}
                          <span>Export</span>
                        </DropdownToggle>
                        <DropdownMenu end>
                          <ul className="link-list-opt no-bdr">
                            <li><DropdownItem onClick={() => doExport("csv")}><Icon name="file-text" /><span>CSV</span></DropdownItem></li>
                            <li><DropdownItem onClick={() => doExport("xlsx")}><Icon name="file-sheets" /><span>Excel</span></DropdownItem></li>
                            <li><DropdownItem onClick={() => doExport("pdf")}><Icon name="file-pdf" /><span>PDF</span></DropdownItem></li>
                            <li><DropdownItem onClick={() => doExport("txt")}><Icon name="file-text-fill" /><span>Text</span></DropdownItem></li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                    <li className="nk-block-tools-opt">
                      <Button color="primary" onClick={openAddModal}>
                        <Icon name="plus" /><span>Add Category</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {error && <div className="alert alert-danger">{error}</div>}
          <DataTable className="card-stretch">
            {/* Toolbar */}
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools" />
                <div className="card-tools me-n1">
                  <ul className="btn-toolbar gx-1">
                    <li>
                      <Button className="btn-icon search-toggle toggle-search" onClick={() => setSearchOpen((s) => !s)}>
                        <Icon name="search" />
                      </Button>
                    </li>
                    <li className="btn-toolbar-sep" />
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                          <Icon name="setting" />
                        </DropdownToggle>
                        <DropdownMenu end className="dropdown-menu-xs">
                          <ul className="link-check">
                            <li><span>Show</span></li>
                            {[10, 25, 50].map((n) => (
                              <li key={n} className={itemPerPage === n ? "active" : ""}>
                                <DropdownItem onClick={() => { setItemPerPage(n); setCurrentPage(1); }}>{n}</DropdownItem>
                              </li>
                            ))}
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                  </ul>
                </div>
              </div>
              {searchOpen && (
                <div className="card-search search-wrap active">
                  <div className="card-body">
                    <div className="search-content">
                      <Button className="search-back btn-icon toggle-search" onClick={() => { setSearchOpen(false); setSearchText(""); setCurrentPage(1); }}>
                        <Icon name="arrow-left" />
                      </Button>
                      <input
                        type="text"
                        className="border-transparent form-focus-none form-control"
                        placeholder="Search by name or parent..."
                        value={searchText}
                        onChange={onSearchChange}
                      />
                      <Button className="search-submit btn-icon"><Icon name="search" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <DataTableBody>
              <DataTableHead>
                <DataTableRow size="sm">
                  <span className="sub-text">Image</span>
                </DataTableRow>
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("name")}>
                    Category <Icon name={sortField === "name" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("parent")}>
                    Parent <Icon name={sortField === "parent" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("products")}>
                    Products <Icon name={sortField === "products" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("children")}>
                    Sub-categories <Icon name={sortField === "children" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={6} className="text-center py-4"><Spinner /></td></tr>
              ) : pageCategories.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-muted">No categories found.</td></tr>
              ) : pageCategories.map((cat) => (
                <DataTableItem key={cat.id}>
                  <DataTableRow size="sm">
                    {cat.imageUrl
                      ? <img src={cat.imageUrl} alt={cat.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                      : <span className="text-muted">—</span>
                    }
                  </DataTableRow>
                  <DataTableRow>
                    <span className="tb-product"><span className="title">{cat.name}</span></span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="text-soft">{cat.parentCategory?.name ?? <em className="text-muted">—</em>}</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <span className="tb-lead">{cat._count?.productMaps ?? 0}</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <span className="tb-lead">{cat._count?.children ?? 0}</span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger"><Icon name="more-h" /></DropdownToggle>
                          <DropdownMenu end>
                            <ul className="link-list-opt no-bdr">
                              <li><DropdownItem onClick={() => openEditModal(cat)}><Icon name="edit" /><span>Edit</span></DropdownItem></li>
                              <li><DropdownItem onClick={() => { setDeleteTarget(cat); setDeleteModal(true); }}><Icon name="trash" /><span>Delete</span></DropdownItem></li>
                            </ul>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </li>
                    </ul>
                  </DataTableRow>
                </DataTableItem>
              ))}
            </DataTableBody>

            <div className="card-inner">
              {totalItems > 0 && (
                <PaginationComponent
                  itemPerPage={itemPerPage}
                  totalItems={totalItems}
                  paginate={paginate}
                  currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalBody className="modal-body-lg text-center">
            <div className="nk-modal">
              <Icon name="trash" className="nk-modal-icon icon-circle icon-circle-xxl bg-danger text-white" />
              <h4 className="nk-modal-title">Delete Category?</h4>
              <div className="nk-modal-text">
                <p className="lead">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
                <p className="text-soft">This is a permanent delete and cannot be undone. Sub-categories and product links will also be affected.</p>
              </div>
              <div className="nk-modal-action mt-5 d-flex justify-content-center gap-2">
                <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
                <Button color="danger" onClick={doDelete} disabled={deleteLoading}>
                  {deleteLoading ? <Spinner size="sm" /> : "Delete"}
                </Button>
              </div>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Add Category Modal ────────────────────────────────────────────── */}
        <Modal isOpen={addModal} toggle={() => setAddModal(false)}>
          <ModalBody>
            <a href="#cancel" onClick={(e) => { e.preventDefault(); setAddModal(false); }} className="close"><em className="icon ni ni-cross-sm" /></a>
            <div className="p-2">
              <h5 className="title">Add New Category</h5>
              <div className="mt-3">
                {addError && <div className="alert alert-danger">{addError}</div>}
                <Row className="g-3">
                  <Col size="12">
                    <div className="form-group">
                      <label className="form-label">Name <span className="text-danger">*</span></label>
                      <input className="form-control" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Category name" />
                    </div>
                  </Col>
                  <Col size="12">
                    <div className="form-group">
                      <label className="form-label">Parent Category <span className="text-muted">(optional)</span></label>
                      <select className="form-select" value={addForm.parentCategoryId} onChange={(e) => setAddForm((f) => ({ ...f, parentCategoryId: e.target.value }))}>
                        <option value="">— None (top-level) —</option>
                        {allCategories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </Col>
                  <Col size="12">
                    <div className="form-group">
                      <label className="form-label">Image <span className="text-muted">(optional)</span></label>
                      <input type="file" className="form-control" accept="image/*" onChange={onAddImageChange} />
                      {addImagePreview && (
                        <img src={addImagePreview} alt="preview" style={{ marginTop: 8, maxHeight: 120, borderRadius: 4, objectFit: "cover" }} />
                      )}
                    </div>
                  </Col>
                  <Col size="12">
                    <Button color="primary" onClick={saveAdd} disabled={addSaving || !addForm.name.trim()}>
                      {addSaving ? <Spinner size="sm" /> : "Create Category"}
                    </Button>
                  </Col>
                </Row>
              </div>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Edit Category Modal ───────────────────────────────────────────── */}
        <Modal isOpen={editModal} toggle={() => setEditModal(false)}>
          <ModalBody>
            <a href="#cancel" onClick={(e) => { e.preventDefault(); setEditModal(false); }} className="close"><em className="icon ni ni-cross-sm" /></a>
            <div className="p-2">
              <h5 className="title">Edit Category — <span className="text-soft">{editCategory?.name}</span></h5>
              <div className="mt-3">
                {editError && <div className="alert alert-danger">{editError}</div>}
                <Row className="g-3">
                  <Col size="12">
                    <div className="form-group">
                      <label className="form-label">Name <span className="text-danger">*</span></label>
                      <input className="form-control" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                  </Col>
                  <Col size="12">
                    <div className="form-group">
                      <label className="form-label">Parent Category <span className="text-muted">(optional)</span></label>
                      <select className="form-select" value={editForm.parentCategoryId} onChange={(e) => setEditForm((f) => ({ ...f, parentCategoryId: e.target.value }))}>
                        <option value="">— None (top-level) —</option>
                        {parentOptions.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </Col>
                  <Col size="12">
                    <div className="form-group">
                      <label className="form-label">Image <span className="text-muted">(optional — leave blank to keep existing)</span></label>
                      <input type="file" className="form-control" accept="image/*" onChange={onEditImageChange} />
                      {editImagePreview && (
                        <img src={editImagePreview} alt="preview" style={{ marginTop: 8, maxHeight: 120, borderRadius: 4, objectFit: "cover" }} />
                      )}
                    </div>
                  </Col>
                  <Col size="12">
                    <Button color="primary" onClick={saveEdit} disabled={editSaving || !editForm.name.trim()}>
                      {editSaving ? <Spinner size="sm" /> : "Save Changes"}
                    </Button>
                  </Col>
                </Row>
              </div>
            </div>
          </ModalBody>
        </Modal>

      </Content>
    </React.Fragment>
  );
};

export default AdminCategoryList;

