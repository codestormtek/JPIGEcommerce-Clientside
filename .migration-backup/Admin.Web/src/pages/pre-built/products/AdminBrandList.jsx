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
import { apiGet, apiPost, apiPatch, apiDelete, getAccessToken } from "@/utils/apiClient";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : "—";

// ─── Component ───────────────────────────────────────────────────────────────

const AdminBrandList = () => {
  // Data state
  const [allBrands, setAllBrands] = useState([]);
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
  const [addForm, setAddForm] = useState({ name: "", description: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
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

  // ─── Load brands ────────────────────────────────────────────────────────────

  const loadBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/products/brands");
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setAllBrands(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBrands(); }, [loadBrands]);

  // ─── Client-side derived data ─────────────────────────────────────────────

  const filtered = allBrands.filter((b) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return b.name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortField === "name") { aVal = (a.name ?? "").toLowerCase(); bVal = (b.name ?? "").toLowerCase(); }
    else if (sortField === "description") { aVal = (a.description ?? "").toLowerCase(); bVal = (b.description ?? "").toLowerCase(); }
    else if (sortField === "products") { aVal = a._count?.products ?? 0; bVal = b._count?.products ?? 0; }
    else { aVal = a.createdAt ?? ""; bVal = b.createdAt ?? ""; }
    if (aVal < bVal) return sort === "asc" ? -1 : 1;
    if (aVal > bVal) return sort === "asc" ? 1 : -1;
    return 0;
  });

  const totalItems = sorted.length;
  const pageStart = (currentPage - 1) * itemPerPage;
  const pageBrands = sorted.slice(pageStart, pageStart + itemPerPage);

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

  const openAddModal = () => { setAddForm({ name: "", description: "" }); setAddError(null); setAddModal(true); };

  const saveAdd = async () => {
    if (!addForm.name.trim()) { setAddError("Name is required."); return; }
    setAddSaving(true); setAddError(null);
    try {
      await apiPost("/products/brands", { name: addForm.name, description: addForm.description || undefined });
      setAddModal(false);
      loadBrands();
    } catch (e) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  const openEditModal = (brand) => {
    setEditBrand(brand);
    setEditForm({ name: brand.name ?? "", description: brand.description ?? "" });
    setEditError(null);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { setEditError("Name is required."); return; }
    setEditSaving(true); setEditError(null);
    try {
      await apiPatch(`/products/brands/${editBrand.id}`, { name: editForm.name, description: editForm.description || undefined });
      setEditModal(false);
      loadBrands();
    } catch (e) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/products/brands/${deleteTarget.id}`);
      setDeleteModal(false); setDeleteTarget(null);
      loadBrands();
    } catch (e) { setError(e.message); }
    finally { setDeleteLoading(false); }
  };

  const doExport = async (format) => {
    setExporting(true); setExportError(null);
    try {
      const res = await apiPost("/exports", { entity: "brands", format });
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
      const a = document.createElement("a"); a.href = url; a.download = `brands-export.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setExportError(e.message); }
    finally { setExporting(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <Head title="Brands" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Brands</BlockTitle>
              <BlockDes className="text-soft">
                <p>You have a total of {allBrands.length} brands.</p>
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
                        <Icon name="plus" /><span>Add Brand</span>
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
                        placeholder="Search by name or description..."
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
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("name")}>
                    Brand <Icon name={sortField === "name" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("description")}>
                    Description <Icon name={sortField === "description" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("products")}>
                    Products <Icon name={sortField === "products" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="lg">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("createdAt")}>
                    Created <Icon name={sortField === "createdAt" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={5} className="text-center py-4"><Spinner /></td></tr>
              ) : pageBrands.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-muted">No brands found.</td></tr>
              ) : pageBrands.map((brand) => (
                <DataTableItem key={brand.id}>
                  <DataTableRow>
                    <span className="tb-product"><span className="title">{brand.name}</span></span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="text-soft">{brand.description || "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <span className="tb-lead">{brand._count?.products ?? 0}</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-soft">{fmtDate(brand.createdAt)}</span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger"><Icon name="more-h" /></DropdownToggle>
                          <DropdownMenu end>
                            <ul className="link-list-opt no-bdr">
                              <li><DropdownItem onClick={() => openEditModal(brand)}><Icon name="edit" /><span>Edit</span></DropdownItem></li>
                              <li><DropdownItem onClick={() => { setDeleteTarget(brand); setDeleteModal(true); }}><Icon name="trash" /><span>Delete</span></DropdownItem></li>
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
              <h4 className="nk-modal-title">Delete Brand?</h4>
              <div className="nk-modal-text">
                <p className="lead">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
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

        {/* ── Add Brand Modal ───────────────────────────────────────────────── */}
        <Modal isOpen={addModal} toggle={() => setAddModal(false)}>
          <ModalBody>
            <a href="#cancel" onClick={(e) => { e.preventDefault(); setAddModal(false); }} className="close"><em className="icon ni ni-cross-sm" /></a>
            <div className="p-2">
              <h5 className="title">Add New Brand</h5>
              <div className="mt-3">
                {addError && <div className="alert alert-danger">{addError}</div>}
                <Row className="g-3">
                  <Col size="12">
                    <div className="form-group">
                      <label className="form-label">Name <span className="text-danger">*</span></label>
                      <input className="form-control" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Brand name" />
                    </div>
                  </Col>
                  <Col size="12">
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="form-control" rows={3} value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                    </div>
                  </Col>
                  <Col size="12">
                    <Button color="primary" onClick={saveAdd} disabled={addSaving || !addForm.name.trim()}>
                      {addSaving ? <Spinner size="sm" /> : "Create Brand"}
                    </Button>
                  </Col>
                </Row>
              </div>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Edit Brand Modal ──────────────────────────────────────────────── */}
        <Modal isOpen={editModal} toggle={() => setEditModal(false)}>
          <ModalBody>
            <a href="#cancel" onClick={(e) => { e.preventDefault(); setEditModal(false); }} className="close"><em className="icon ni ni-cross-sm" /></a>
            <div className="p-2">
              <h5 className="title">Edit Brand — <span className="text-soft">{editBrand?.name}</span></h5>
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
                      <label className="form-label">Description</label>
                      <textarea className="form-control" rows={3} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
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

export default AdminBrandList;
