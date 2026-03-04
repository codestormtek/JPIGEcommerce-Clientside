import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, Spinner } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button, RSelect, TooltipComponent,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPrice = (p) => `$${Number(p ?? 0).toFixed(2)}`;
const LOW_STOCK_THRESHOLD = 5;

const BLANK_ADD = {
  productId: null, sku: "", barcode: "", price: "", qtyInStock: "",
  isPublished: true, weight: "", length: "", width: "", height: "",
};
const BLANK_EDIT = {
  sku: "", barcode: "", price: "", qtyInStock: "",
  isPublished: true, weight: "", length: "", width: "", height: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminInventoryList = () => {
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemPerPage, setItemPerPage]   = useState(20);
  const [sort, setSort]                 = useState("asc");
  const [sortField, setSortField]       = useState("sku");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [items, setItems]           = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const [productOptions, setProductOptions] = useState([]);
  const [productFilter, setProductFilter]   = useState(null);

  const [addModal, setAddModal]   = useState(false);
  const [addForm, setAddForm]     = useState(BLANK_ADD);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState(null);

  const [editModal, setEditModal]   = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [editForm, setEditForm]     = useState(BLANK_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState(null);

  const [deleteModal, setDeleteModal]     = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const searchTimer = useRef(null);

  // ─── Data loading ──────────────────────────────────────────────────────────

  const loadInventory = useCallback(async (overrides = {}) => {
    setLoading(true); setError(null);
    try {
      const opts = {
        page: currentPage, limit: itemPerPage, order: sort, orderBy: sortField,
        search: searchText || undefined,
        productId: productFilter?.value ?? undefined,
        lowStock:  lowStockOnly || undefined,
        threshold: lowStockOnly ? LOW_STOCK_THRESHOLD : undefined,
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/inventory?${qs}`);
      setItems(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [currentPage, itemPerPage, sort, sortField, searchText, productFilter, lowStockOnly]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet("/products?limit=200&order=asc&orderBy=name");
        const prods = Array.isArray(res) ? res : (res?.data ?? []);
        setProductOptions(prods.map((p) => ({ label: p.name, value: p.id })));
      } catch { /* non-fatal */ }
    })();
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const paginate        = (p) => setCurrentPage(p);
  const onProductFilter = (opt) => { setProductFilter(opt); setCurrentPage(1); };
  const toggleLowStock  = () => { setLowStockOnly((v) => !v); setCurrentPage(1); };

  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      loadInventory({ page: 1, search: val || undefined });
    }, 400);
  };

  const onSortClick = (field) => {
    if (sortField === field) setSort((s) => (s === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSort("asc"); }
    setCurrentPage(1);
  };

  const sortIcon = (field) =>
    sortField === field ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort";

  // ─── Add ──────────────────────────────────────────────────────────────────

  const openAddModal = () => { setAddForm(BLANK_ADD); setAddError(null); setAddModal(true); };

  const saveAdd = async () => {
    if (!addForm.productId || !addForm.sku || addForm.price === "") return;
    setAddSaving(true); setAddError(null);
    try {
      await apiPost("/inventory", {
        productId:   addForm.productId.value,
        sku:         addForm.sku,
        barcode:     addForm.barcode || undefined,
        price:       parseFloat(addForm.price),
        qtyInStock:  addForm.qtyInStock !== "" ? parseInt(addForm.qtyInStock, 10) : 0,
        isPublished: addForm.isPublished,
        weight: addForm.weight !== "" ? parseFloat(addForm.weight) : undefined,
        length: addForm.length !== "" ? parseFloat(addForm.length) : undefined,
        width:  addForm.width  !== "" ? parseFloat(addForm.width)  : undefined,
        height: addForm.height !== "" ? parseFloat(addForm.height) : undefined,
      });
      setAddModal(false);
      loadInventory({ page: 1 });
    } catch (e) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  // ─── Edit ─────────────────────────────────────────────────────────────────

  const openEditModal = (item) => {
    setEditItem(item);
    setEditForm({
      sku: item.sku ?? "", barcode: item.barcode ?? "",
      price: item.price ?? "", qtyInStock: item.qtyInStock ?? "",
      isPublished: item.isPublished ?? true,
      weight: item.weight ?? "", length: item.length ?? "",
      width: item.width ?? "", height: item.height ?? "",
    });
    setEditError(null);
    setEditModal(true);
  };

  const saveEdit = async () => {
    setEditSaving(true); setEditError(null);
    try {
      await apiPatch(`/inventory/${editItem.id}`, {
        sku:         editForm.sku || undefined,
        barcode:     editForm.barcode || undefined,
        price:       editForm.price !== "" ? parseFloat(editForm.price) : undefined,
        qtyInStock:  editForm.qtyInStock !== "" ? parseInt(editForm.qtyInStock, 10) : undefined,
        isPublished: editForm.isPublished,
        weight: editForm.weight !== "" ? parseFloat(editForm.weight) : undefined,
        length: editForm.length !== "" ? parseFloat(editForm.length) : undefined,
        width:  editForm.width  !== "" ? parseFloat(editForm.width)  : undefined,
        height: editForm.height !== "" ? parseFloat(editForm.height) : undefined,
      });
      setEditModal(false);
      loadInventory();
    } catch (e) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const confirmDelete = (item) => { setDeleteTarget(item); setDeleteModal(true); };

  const doDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiDelete(`/inventory/${deleteTarget.id}`);
      setDeleteModal(false);
      loadInventory();
    } catch { /* swallow */ }
    finally { setDeleteLoading(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <Head title="Inventory" />
      <Content>
        {/* PAGE HEADER */}
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Inventory</BlockTitle>
              <BlockDes className="text-soft">
                <p>{totalItems} SKU{totalItems !== 1 ? "s" : ""} across all products.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <ul className="nk-block-tools g-3">
                <li className="nk-block-tools-opt">
                  <Button color="primary" onClick={openAddModal}>
                    <Icon name="plus" /><span>Add SKU</span>
                  </Button>
                </li>
              </ul>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {error && <div className="alert alert-danger">{error}</div>}
          <DataTable className="card-stretch">

            {/* TOOLBAR */}
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools">
                  <div className="d-flex g-2 flex-wrap align-items-center">
                    <div style={{ minWidth: 220 }}>
                      <RSelect
                        placeholder="All Products"
                        options={productOptions}
                        value={productFilter}
                        onChange={onProductFilter}
                        isClearable
                      />
                    </div>
                    <Button
                      color={lowStockOnly ? "warning" : "light"}
                      outline={!lowStockOnly}
                      size="sm"
                      onClick={toggleLowStock}
                      className="ms-2"
                    >
                      <Icon name="alert-circle" />
                      <span className="ms-1">Low Stock</span>
                    </Button>
                  </div>
                </div>
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
                            {[10, 20, 50].map((n) => (
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
                      <Button className="search-back btn-icon toggle-search" onClick={() => { setSearchOpen(false); setSearchText(""); loadInventory({ search: undefined }); }}>
                        <Icon name="arrow-left" />
                      </Button>
                      <input
                        type="text"
                        className="border-transparent form-focus-none form-control"
                        placeholder="Search by SKU or product name…"
                        value={searchText}
                        onChange={onSearchChange}
                      />
                      <Button className="search-submit btn-icon"><Icon name="search" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TABLE */}
            {loading ? (
              <div className="text-center py-5"><Spinner color="primary" /></div>
            ) : (
              <DataTableBody>
                <DataTableHead>
                  <DataTableRow>
                    <span className="sub-text cursor-pointer" onClick={() => onSortClick("sku")}>
                      SKU <Icon name={sortIcon("sku")} />
                    </span>
                  </DataTableRow>
                  <DataTableRow><span className="sub-text">Product</span></DataTableRow>
                  <DataTableRow><span className="sub-text">Barcode</span></DataTableRow>
                  <DataTableRow>
                    <span className="sub-text cursor-pointer" onClick={() => onSortClick("price")}>
                      Price <Icon name={sortIcon("price")} />
                    </span>
                  </DataTableRow>
                  <DataTableRow>
                    <span className="sub-text cursor-pointer" onClick={() => onSortClick("qtyInStock")}>
                      Qty <Icon name={sortIcon("qtyInStock")} />
                    </span>
                  </DataTableRow>
                  <DataTableRow><span className="sub-text">Status</span></DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end"><span className="sub-text">Actions</span></DataTableRow>
                </DataTableHead>

                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">No inventory items found.</td>
                  </tr>
                ) : items.map((item) => (
                  <DataTableItem key={item.id}>
                    <DataTableRow>
                      <span className="fw-bold">{item.sku}</span>
                    </DataTableRow>
                    <DataTableRow>
                      <span className="text-soft">{item.product?.name ?? "—"}</span>
                    </DataTableRow>
                    <DataTableRow>
                      <span className="text-soft">{item.barcode ?? "—"}</span>
                    </DataTableRow>
                    <DataTableRow>
                      <span>{fmtPrice(item.price)}</span>
                    </DataTableRow>
                    <DataTableRow>
                      {item.qtyInStock <= LOW_STOCK_THRESHOLD ? (
                        <Badge color="warning">{item.qtyInStock}</Badge>
                      ) : (
                        <span>{item.qtyInStock}</span>
                      )}
                    </DataTableRow>
                    <DataTableRow>
                      <Badge color={item.isPublished ? "success" : "secondary"}>
                        {item.isPublished ? "Active" : "Inactive"}
                      </Badge>
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools text-end">
                      <ul className="nk-tb-actions gx-1">
                        <li>
                          <TooltipComponent tag="a" containerClassName="btn btn-trigger btn-icon" id={`edit-${item.id}`} icon="edit" direction="top" text="Edit" onClick={() => openEditModal(item)} />
                        </li>
                        <li>
                          <TooltipComponent tag="a" containerClassName="btn btn-trigger btn-icon" id={`del-${item.id}`} icon="trash" direction="top" text="Delete" onClick={() => confirmDelete(item)} />
                        </li>
                      </ul>
                    </DataTableRow>
                  </DataTableItem>
                ))}
              </DataTableBody>
            )}

            {/* PAGINATION */}
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
      </Content>

      {/* ─── ADD MODAL ──────────────────────────────────────────────────────── */}
      <Modal isOpen={addModal} toggle={() => setAddModal(false)} size="lg">
        <div className="modal-header">
          <h5 className="modal-title">Add Inventory SKU</h5>
          <button className="btn-close" onClick={() => setAddModal(false)} />
        </div>
        <ModalBody>
          {addError && <div className="alert alert-danger mb-3">{addError}</div>}
          <Row className="g-3">
            <Col md={12}>
              <label className="form-label">Product <span className="text-danger">*</span></label>
              <RSelect options={productOptions} value={addForm.productId} onChange={(v) => setAddForm((f) => ({ ...f, productId: v }))} placeholder="Select product…" />
            </Col>
            <Col md={6}>
              <label className="form-label">SKU <span className="text-danger">*</span></label>
              <input className="form-control" value={addForm.sku} onChange={(e) => setAddForm((f) => ({ ...f, sku: e.target.value }))} placeholder="e.g. PROD-001-RED-L" />
            </Col>
            <Col md={6}>
              <label className="form-label">Barcode</label>
              <input className="form-control" value={addForm.barcode} onChange={(e) => setAddForm((f) => ({ ...f, barcode: e.target.value }))} placeholder="UPC / EAN" />
            </Col>
            <Col md={6}>
              <label className="form-label">Price <span className="text-danger">*</span></label>
              <input type="number" min="0" step="0.01" className="form-control" value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </Col>
            <Col md={6}>
              <label className="form-label">Qty in Stock</label>
              <input type="number" min="0" className="form-control" value={addForm.qtyInStock} onChange={(e) => setAddForm((f) => ({ ...f, qtyInStock: e.target.value }))} placeholder="0" />
            </Col>
            <Col md={3}>
              <label className="form-label">Weight (kg)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={addForm.weight} onChange={(e) => setAddForm((f) => ({ ...f, weight: e.target.value }))} />
            </Col>
            <Col md={3}>
              <label className="form-label">Length (cm)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={addForm.length} onChange={(e) => setAddForm((f) => ({ ...f, length: e.target.value }))} />
            </Col>
            <Col md={3}>
              <label className="form-label">Width (cm)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={addForm.width} onChange={(e) => setAddForm((f) => ({ ...f, width: e.target.value }))} />
            </Col>
            <Col md={3}>
              <label className="form-label">Height (cm)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={addForm.height} onChange={(e) => setAddForm((f) => ({ ...f, height: e.target.value }))} />
            </Col>
            <Col md={12}>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="addIsPublished" checked={addForm.isPublished} onChange={(e) => setAddForm((f) => ({ ...f, isPublished: e.target.checked }))} />
                <label className="form-check-label" htmlFor="addIsPublished">Active / Published</label>
              </div>
            </Col>
          </Row>
        </ModalBody>
        <div className="modal-footer">
          <Button color="light" onClick={() => setAddModal(false)}>Cancel</Button>
          <Button color="primary" onClick={saveAdd} disabled={addSaving}>
            {addSaving ? <Spinner size="sm" /> : "Save SKU"}
          </Button>
        </div>
      </Modal>

      {/* ─── EDIT MODAL ─────────────────────────────────────────────────────── */}
      <Modal isOpen={editModal} toggle={() => setEditModal(false)} size="lg">
        <div className="modal-header">
          <h5 className="modal-title">Edit SKU — {editItem?.sku}</h5>
          <button className="btn-close" onClick={() => setEditModal(false)} />
        </div>
        <ModalBody>
          {editError && <div className="alert alert-danger mb-3">{editError}</div>}
          <Row className="g-3">
            <Col md={6}>
              <label className="form-label">SKU</label>
              <input className="form-control" value={editForm.sku} onChange={(e) => setEditForm((f) => ({ ...f, sku: e.target.value }))} />
            </Col>
            <Col md={6}>
              <label className="form-label">Barcode</label>
              <input className="form-control" value={editForm.barcode} onChange={(e) => setEditForm((f) => ({ ...f, barcode: e.target.value }))} />
            </Col>
            <Col md={6}>
              <label className="form-label">Price</label>
              <input type="number" min="0" step="0.01" className="form-control" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
            </Col>
            <Col md={6}>
              <label className="form-label">Qty in Stock</label>
              <input type="number" min="0" className="form-control" value={editForm.qtyInStock} onChange={(e) => setEditForm((f) => ({ ...f, qtyInStock: e.target.value }))} />
            </Col>
            <Col md={3}>
              <label className="form-label">Weight (kg)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={editForm.weight} onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))} />
            </Col>
            <Col md={3}>
              <label className="form-label">Length (cm)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={editForm.length} onChange={(e) => setEditForm((f) => ({ ...f, length: e.target.value }))} />
            </Col>
            <Col md={3}>
              <label className="form-label">Width (cm)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={editForm.width} onChange={(e) => setEditForm((f) => ({ ...f, width: e.target.value }))} />
            </Col>
            <Col md={3}>
              <label className="form-label">Height (cm)</label>
              <input type="number" min="0" step="0.01" className="form-control" value={editForm.height} onChange={(e) => setEditForm((f) => ({ ...f, height: e.target.value }))} />
            </Col>
            <Col md={12}>
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="editIsPublished" checked={editForm.isPublished} onChange={(e) => setEditForm((f) => ({ ...f, isPublished: e.target.checked }))} />
                <label className="form-check-label" htmlFor="editIsPublished">Active / Published</label>
              </div>
            </Col>
          </Row>
        </ModalBody>
        <div className="modal-footer">
          <Button color="light" onClick={() => setEditModal(false)}>Cancel</Button>
          <Button color="primary" onClick={saveEdit} disabled={editSaving}>
            {editSaving ? <Spinner size="sm" /> : "Save Changes"}
          </Button>
        </div>
      </Modal>

      {/* ─── DELETE CONFIRM MODAL ───────────────────────────────────────────── */}
      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
        <ModalBody className="text-center py-4">
          <Icon name="trash" style={{ fontSize: 40, color: "var(--bs-danger)" }} />
          <h5 className="mt-3">Delete SKU?</h5>
          <p className="text-muted">Are you sure you want to delete <strong>{deleteTarget?.sku}</strong>? This cannot be undone.</p>
          <div className="d-flex justify-content-center gap-2 mt-4">
            <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button color="danger" onClick={doDelete} disabled={deleteLoading}>
              {deleteLoading ? <Spinner size="sm" /> : "Delete"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

    </React.Fragment>
  );
};

export default AdminInventoryList;
