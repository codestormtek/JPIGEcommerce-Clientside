import React, { useState, useEffect, useCallback, useRef } from "react";
import Dropzone from "react-dropzone";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, Spinner, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button, RSelect, TooltipComponent,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtPrice = (p) => `$${Number(p ?? 0).toFixed(2)}`;
const getProductCategories = (product) =>
  (product.categoryMaps ?? []).map((cm) => cm.category?.name).filter(Boolean);

const CAT_COLORS = ["primary", "success", "warning", "info", "danger", "secondary"];
const getCatColor = (i) => CAT_COLORS[i % CAT_COLORS.length];
const isNewProduct = (p) => new Date() - new Date(p.createdAt) < 30 * 24 * 60 * 60 * 1000;

// ─── Component ───────────────────────────────────────────────────────────────

const AdminProductList = () => {
  // UI state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [sort, setSort] = useState("desc");
  const [sortField, setSortField] = useState("createdAt");

  // Data state
  const [products, setProducts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter options
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [brandFilter, setBrandFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", quantity: "", brandId: null, categoryIds: [] });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  // Edit modal tabs
  const [activeTab, setActiveTab] = useState("basic");
  // SKU items tab
  const [skuItems, setSkuItems] = useState([]);
  const [skuDraft, setSkuDraft] = useState({ sku: "", barcode: "", price: "", qtyInStock: "", isPublished: true, weight: "", length: "", width: "", height: "" });
  const [skuSaving, setSkuSaving] = useState(false);
  const [skuError, setSkuError] = useState(null);
  // Attributes tab
  const [attrItems, setAttrItems] = useState([]);
  const [attrDraft, setAttrDraft] = useState({ name: "", values: "" });
  const [attrSaving, setAttrSaving] = useState(false);
  const [attrError, setAttrError] = useState(null);
  // Image tab
  const [productImages, setProductImages] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageSaving, setImageSaving] = useState(false);
  const [imageError, setImageError] = useState(null);

  // Add modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "", price: "", quantity: "", brandId: null, categoryIds: [] });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  // Delete confirm
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailTab, setDetailTab] = useState("basic");
  const [detailSkuItems, setDetailSkuItems] = useState([]);

  const searchTimer = useRef(null);

  // ─── Load products ────────────────────────────────────────────────────────

  const loadProducts = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const opts = {
        page: currentPage, limit: itemPerPage, order: sort, orderBy: sortField,
        brandId: brandFilter?.value ?? undefined,
        categoryId: categoryFilter?.value ?? undefined,
        search: searchText || undefined,
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/products?${qs}`);
      setProducts(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, sortField, brandFilter, categoryFilter, searchText]);

  // Load brands + categories on mount
  useEffect(() => {
    (async () => {
      try {
        const [b, c] = await Promise.all([apiGet("/products/brands"), apiGet("/products/categories")]);
        const brands = Array.isArray(b) ? b : (b?.data ?? []);
        const cats   = Array.isArray(c) ? c : (c?.data ?? []);
        setBrandOptions(brands.map((x) => ({ label: x.name, value: x.id })));
        setCategoryOptions(cats.map((x) => ({ label: x.name, value: x.id })));
      } catch { /* non-fatal */ }
    })();
  }, []);

  // Reload when deps change
  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const paginate = (p) => setCurrentPage(p);

  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      loadProducts({ page: 1, search: val || undefined });
    }, 400);
  };

  const onBrandFilter = (opt) => { setBrandFilter(opt); setCurrentPage(1); };
  const onCategoryFilter = (opt) => { setCategoryFilter(opt); setCurrentPage(1); };

  const onSortClick = (field) => {
    if (sortField === field) {
      setSort((s) => (s === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSort("desc");
    }
    setCurrentPage(1);
  };

  const openDetail = async (product) => {
    setDetailProduct(product);
    setDetailTab("basic");
    setDetailSkuItems([]);
    setDetailModal(true);
    try {
      const itemsRes = await apiGet(`/products/${product.id}/items`);
      setDetailSkuItems(Array.isArray(itemsRes) ? itemsRes : (itemsRes?.data ?? []));
    } catch { /* non-fatal */ }
  };

  const onEditClick = async (product) => {
    setEditProduct(product);
    setEditForm({
      name: product.name ?? "",
      description: product.description ?? "",
      price: product.price ?? "",
      quantity: product.quantity ?? "",
      brandId: product.brand ? { label: product.brand.name, value: product.brand.id } : null,
      categoryIds: getProductCategories(product).map((name, i) => ({
        label: name,
        value: (product.categoryMaps?.[i]?.category?.id ?? name),
      })),
    });
    setEditError(null);
    setActiveTab("basic");
    setSkuDraft({ sku: "", barcode: "", price: "", qtyInStock: "", isPublished: true, weight: "", length: "", width: "", height: "" });
    setSkuError(null);
    setAttrDraft({ name: "", values: "" });
    setAttrError(null);
    setImageFile(null); setImagePreview(null); setImageError(null);
    // Load items + existing attrs/images from product data already in response
    try {
      const itemsRes = await apiGet(`/products/${product.id}/items`);
      setSkuItems(Array.isArray(itemsRes) ? itemsRes : (itemsRes?.data ?? []));
    } catch { setSkuItems([]); }
    setAttrItems(product.attributes ?? []);
    setProductImages(product.media ?? []);
    setEditModal(true);
  };

  // ─── SKU handlers ────────────────────────────────────────────────────────────

  const addSkuItem = async () => {
    if (!skuDraft.sku || !skuDraft.price) return;
    setSkuSaving(true); setSkuError(null);
    try {
      const res = await apiPost(`/products/${editProduct.id}/items`, {
        sku: skuDraft.sku,
        barcode: skuDraft.barcode || undefined,
        price: parseFloat(skuDraft.price),
        qtyInStock: skuDraft.qtyInStock !== "" ? parseInt(skuDraft.qtyInStock, 10) : 0,
        isPublished: skuDraft.isPublished,
        weight: skuDraft.weight !== "" ? parseFloat(skuDraft.weight) : undefined,
        length: skuDraft.length !== "" ? parseFloat(skuDraft.length) : undefined,
        width: skuDraft.width !== "" ? parseFloat(skuDraft.width) : undefined,
        height: skuDraft.height !== "" ? parseFloat(skuDraft.height) : undefined,
      });
      const newItem = res?.data ?? res;
      setSkuItems((prev) => [...prev, newItem]);
      setSkuDraft({ sku: "", barcode: "", price: "", qtyInStock: "", isPublished: true, weight: "", length: "", width: "", height: "" });
    } catch (e) { setSkuError(e.message); }
    finally { setSkuSaving(false); }
  };

  const removeSkuItem = async (itemId) => {
    try {
      await apiDelete(`/products/${editProduct.id}/items/${itemId}`);
      setSkuItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) { setSkuError(e.message); }
  };

  // ─── Attribute handlers ───────────────────────────────────────────────────────

  const addAttrItem = async () => {
    if (!attrDraft.name) return;
    setAttrSaving(true); setAttrError(null);
    try {
      const values = attrDraft.values
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((value) => ({ value }));
      const res = await apiPost(`/products/${editProduct.id}/attributes`, { name: attrDraft.name, values });
      const newAttr = res?.data ?? res;
      setAttrItems((prev) => [...prev, newAttr]);
      setAttrDraft({ name: "", values: "" });
    } catch (e) { setAttrError(e.message); }
    finally { setAttrSaving(false); }
  };

  const removeAttrItem = async (attrId) => {
    try {
      await apiDelete(`/products/${editProduct.id}/attributes/${attrId}`);
      setAttrItems((prev) => prev.filter((a) => a.id !== attrId));
    } catch (e) { setAttrError(e.message); }
  };

  // ─── Image handlers ───────────────────────────────────────────────────────────

  const onDropFile = (acceptedFiles) => {
    const file = acceptedFiles?.[0];
    if (!file) return;
    setImageFile(Object.assign(file, { preview: URL.createObjectURL(file) }));
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile) return;
    setImageSaving(true); setImageError(null);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      await apiUpload(`/products/${editProduct.id}/image`, fd);
      // Refresh images from server to get full ProductMedia records
      const updated = await apiGet(`/products/${editProduct.id}`);
      const p = updated?.data ?? updated;
      setProductImages(p?.media ?? []);
      setImageFile(null); setImagePreview(null);
    } catch (e) { setImageError(e.message); }
    finally { setImageSaving(false); }
  };

  const removeImage = async (mediaAssetId) => {
    try {
      await apiDelete(`/products/${editProduct.id}/image/${mediaAssetId}`);
      setProductImages((prev) => prev.filter((m) => m.mediaAssetId !== mediaAssetId));
    } catch (e) { setImageError(e.message); }
  };

  const openAddModal = () => {
    setAddForm({ name: "", description: "", price: "", quantity: "", brandId: null, categoryIds: [] });
    setAddError(null);
    setAddModal(true);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      await apiPatch(`/products/${editProduct.id}`, {
        name: editForm.name,
        description: editForm.description || undefined,
        price: parseFloat(editForm.price),
        quantity: editForm.quantity !== "" ? parseInt(editForm.quantity, 10) : undefined,
        brandId: editForm.brandId?.value ?? null,
        categoryIds: editForm.categoryIds.map((c) => c.value),
      });
      setEditModal(false);
      loadProducts();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const saveAdd = async () => {
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await apiPost("/products", {
        name: addForm.name,
        description: addForm.description || undefined,
        price: parseFloat(addForm.price),
        quantity: addForm.quantity !== "" ? parseInt(addForm.quantity, 10) : undefined,
        brandId: addForm.brandId?.value ?? undefined,
        categoryIds: addForm.categoryIds.map((c) => c.value),
      });
      const newProduct = res?.data ?? res;
      setAddModal(false);
      loadProducts();
      // Open edit modal on SKUs tab so user can immediately add details
      await onEditClick({ ...newProduct, attributes: [], media: [], promotionProducts: [] });
      setActiveTab("skus");
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAddSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/products/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      loadProducts();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const doExport = async (format) => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await apiPost("/exports", { entity: "products", format });
      const jobId = res?.data?.id ?? res?.id;
      let status = "pending";
      let attempts = 0;
      while (status !== "done" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await apiGet(`/exports/${jobId}`);
        status = poll?.data?.status ?? poll?.status;
        attempts++;
      }
      if (status !== "done") throw new Error("Export timed out");
      const token = getAccessToken();
      const dl = await fetch(`/api/v1/exports/${jobId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!dl.ok) throw new Error("Download failed");
      const blob = await dl.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e.message);
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <Head title="Products" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Products</BlockTitle>
              <BlockDes className="text-soft">
                <p>You have a total of {totalItems} products.</p>
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
                        <Icon name="plus" /><span>Add Product</span>
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
                <div className="card-tools">
                  <div className="d-flex g-2 flex-wrap">
                    <div style={{ minWidth: 160 }}>
                      <RSelect
                        placeholder="Brand"
                        options={brandOptions}
                        value={brandFilter}
                        onChange={onBrandFilter}
                        isClearable
                      />
                    </div>
                    <div style={{ minWidth: 160 }}>
                      <RSelect
                        placeholder="Category"
                        options={categoryOptions}
                        value={categoryFilter}
                        onChange={onCategoryFilter}
                        isClearable
                      />
                    </div>
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
                            {[10, 25, 50].map((n) => (
                              <li key={n} className={itemPerPage === n ? "active" : ""}>
                                <DropdownItem onClick={() => { setItemPerPage(n); setCurrentPage(1); }}>{n}</DropdownItem>
                              </li>
                            ))}
                          </ul>
                          <ul className="link-check">
                            <li><span>Order</span></li>
                            <li className={sort === "desc" ? "active" : ""}><DropdownItem onClick={() => setSort("desc")}>Newest</DropdownItem></li>
                            <li className={sort === "asc"  ? "active" : ""}><DropdownItem onClick={() => setSort("asc")}>Oldest</DropdownItem></li>
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
                      <Button className="search-back btn-icon toggle-search" onClick={() => { setSearchOpen(false); setSearchText(""); loadProducts({ search: undefined }); }}>
                        <Icon name="arrow-left" />
                      </Button>
                      <input
                        type="text"
                        className="border-transparent form-focus-none form-control"
                        placeholder="Search by name..."
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
                <DataTableRow size="sm" className="nk-tb-col-check" style={{ width: 52 }}><span className="sub-text">Img</span></DataTableRow>
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("name")}>
                    Product <Icon name={sortField === "name" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("price")}>
                    Price <Icon name={sortField === "price" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("createdAt")}>
                    Qty <Icon name={sortField === "createdAt" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="md"><span className="sub-text">SKU</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Promo</span></DataTableRow>
                <DataTableRow size="md"><span className="sub-text">New</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">Categories</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={9} className="text-center py-4"><Spinner /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-4 text-muted">No products found.</td></tr>
              ) : products.map((product) => (
                <DataTableItem key={product.id}>
                  {/* Image column */}
                  <DataTableRow size="sm">
                    {product.media?.[0]?.mediaAsset?.url
                      ? <img src={product.media[0].mediaAsset.url} alt={product.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                      : <div style={{ width: 40, height: 40, borderRadius: 4, background: "#e5e9f2", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="package" /></div>
                    }
                  </DataTableRow>
                  {/* Product name */}
                  <DataTableRow>
                    <span className="tb-product"><span className="title">{product.name}</span></span>
                  </DataTableRow>
                  <DataTableRow size="sm"><span className="tb-lead">{fmtPrice(product.price)}</span></DataTableRow>
                  <DataTableRow size="md"><span>{product.quantity ?? "—"}</span></DataTableRow>
                  {/* SKU — first item's sku if available */}
                  <DataTableRow size="md"><span className="text-soft">{product.items?.[0]?.sku ?? "—"}</span></DataTableRow>
                  {/* Promotional indicator */}
                  <DataTableRow size="md">
                    {product.promotionProducts?.length > 0
                      ? <Icon name="check-circle-fill" className="text-success" style={{ fontSize: 18 }} />
                      : <Icon name="minus-circle" className="text-light" style={{ fontSize: 18 }} />
                    }
                  </DataTableRow>
                  {/* New indicator */}
                  <DataTableRow size="md">
                    {isNewProduct(product)
                      ? <Icon name="check-circle-fill" className="text-success" style={{ fontSize: 18 }} />
                      : <Icon name="minus-circle" className="text-light" style={{ fontSize: 18 }} />
                    }
                  </DataTableRow>
                  {/* Categories */}
                  <DataTableRow size="lg">
                    <div className="d-flex flex-wrap gap-1">
                      {getProductCategories(product).length > 0
                        ? getProductCategories(product).map((cat, i) => (
                            <Badge key={cat} className="badge-sm badge-dim" color={`outline-${getCatColor(i)}`}>{cat}</Badge>
                          ))
                        : <span className="text-soft">—</span>
                      }
                    </div>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li className="nk-tb-action-hidden">
                        <TooltipComponent tag="a" containerClassName="btn btn-trigger btn-icon" id={`view-${product.id}`} icon="eye" direction="top" text="View" onClick={() => openDetail(product)} />
                      </li>
                      <li className="nk-tb-action-hidden">
                        <TooltipComponent tag="a" containerClassName="btn btn-trigger btn-icon" id={`edit-${product.id}`} icon="edit" direction="top" text="Edit" onClick={() => onEditClick(product)} />
                      </li>
                      <li className="nk-tb-action-hidden">
                        <TooltipComponent tag="a" containerClassName="btn btn-trigger btn-icon" id={`del-${product.id}`} icon="trash" direction="top" text="Delete" onClick={() => { setDeleteTarget(product); setDeleteModal(true); }} />
                      </li>
                      <li>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger"><Icon name="more-h" /></DropdownToggle>
                          <DropdownMenu end>
                            <ul className="link-list-opt no-bdr">
                              <li><DropdownItem onClick={() => openDetail(product)}><Icon name="eye" /><span>View</span></DropdownItem></li>
                              <li><DropdownItem onClick={() => onEditClick(product)}><Icon name="edit" /><span>Edit</span></DropdownItem></li>
                              <li><DropdownItem onClick={() => { setDeleteTarget(product); setDeleteModal(true); }}><Icon name="trash" /><span>Delete</span></DropdownItem></li>
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
              <h4 className="nk-modal-title">Delete Product?</h4>
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

        {/* ── Add Product Modal ─────────────────────────────────────────────── */}
        <Modal isOpen={addModal} toggle={() => setAddModal(false)} size="xl">
          <ModalBody>
            <a href="#cancel" onClick={(e) => { e.preventDefault(); setAddModal(false); }} className="close"><em className="icon ni ni-cross-sm" /></a>
            <div className="p-2">
              <h5 className="title">Add New Product</h5>
              <Nav tabs className="mt-3">
                {["basic", "skus", "attributes", "image"].map((tab) => (
                  <NavItem key={tab}>
                    <NavLink
                      className={tab === "basic" ? "active" : "disabled text-muted"}
                      style={{ cursor: tab === "basic" ? "pointer" : "default", textTransform: "capitalize" }}
                    >
                      {tab === "skus" ? "SKUs / Items" : tab === "basic" ? "Basic Info" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </NavLink>
                  </NavItem>
                ))}
              </Nav>
              <TabContent activeTab="basic" className="mt-3">
                <TabPane tabId="basic">
                  {addError && <div className="alert alert-danger">{addError}</div>}
                  <Row className="g-3">
                    <Col md="6"><div className="form-group"><label className="form-label">Name <span className="text-danger">*</span></label><input className="form-control" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} /></div></Col>
                    <Col md="3"><div className="form-group"><label className="form-label">Price <span className="text-danger">*</span></label><input className="form-control" type="number" step="0.01" value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} /></div></Col>
                    <Col md="3"><div className="form-group"><label className="form-label">Quantity</label><input className="form-control" type="number" value={addForm.quantity} onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))} /></div></Col>
                    <Col md="6"><div className="form-group"><label className="form-label">Brand</label><RSelect options={brandOptions} value={addForm.brandId} onChange={(v) => setAddForm((f) => ({ ...f, brandId: v }))} isClearable placeholder="Select brand" /></div></Col>
                    <Col md="6"><div className="form-group"><label className="form-label">Categories</label><RSelect options={categoryOptions} value={addForm.categoryIds} onChange={(v) => setAddForm((f) => ({ ...f, categoryIds: v ?? [] }))} isMulti placeholder="Select categories" /></div></Col>
                    <Col size="12"><div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} /></div></Col>
                    <Col size="12">
                      <Button color="primary" onClick={saveAdd} disabled={addSaving || !addForm.name || !addForm.price}>
                        {addSaving ? <Spinner size="sm" /> : "Create Product"}
                      </Button>
                      <p className="text-muted small mt-2">After creating the product, you can add SKUs, attributes, and images.</p>
                    </Col>
                  </Row>
                </TabPane>
              </TabContent>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Edit Product Modal (tabbed) ───────────────────────────────────── */}
        <Modal isOpen={editModal} toggle={() => { setEditModal(false); loadProducts(); }} size="xl">
          <ModalBody>
            <a href="#cancel" onClick={(e) => { e.preventDefault(); setEditModal(false); loadProducts(); }} className="close"><em className="icon ni ni-cross-sm" /></a>
            <div className="p-2">
              <h5 className="title">Edit Product — <span className="text-soft">{editProduct?.name}</span></h5>
              <Nav tabs className="mt-3">
                {["basic","skus","attributes","image"].map((tab) => (
                  <NavItem key={tab}>
                    <NavLink className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)} style={{ cursor: "pointer", textTransform: "capitalize" }}>
                      {tab === "skus" ? "SKUs / Items" : tab === "basic" ? "Basic Info" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </NavLink>
                  </NavItem>
                ))}
              </Nav>
              <TabContent activeTab={activeTab} className="mt-3">
                {/* ── Basic Info ── */}
                <TabPane tabId="basic">
                  <Row className="g-3">
                    <Col md="6"><div className="form-group"><label className="form-label">Name <span className="text-danger">*</span></label><input className="form-control" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></div></Col>
                    <Col md="3"><div className="form-group"><label className="form-label">Price <span className="text-danger">*</span></label><input className="form-control" type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} /></div></Col>
                    <Col md="3"><div className="form-group"><label className="form-label">Quantity</label><input className="form-control" type="number" value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} /></div></Col>
                    <Col md="6"><div className="form-group"><label className="form-label">Brand</label><RSelect options={brandOptions} value={editForm.brandId} onChange={(v) => setEditForm((f) => ({ ...f, brandId: v }))} isClearable placeholder="Select brand" /></div></Col>
                    <Col md="6"><div className="form-group"><label className="form-label">Categories</label><RSelect options={categoryOptions} value={editForm.categoryIds} onChange={(v) => setEditForm((f) => ({ ...f, categoryIds: v ?? [] }))} isMulti placeholder="Select categories" /></div></Col>
                    <Col size="12"><div className="form-group"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} /></div></Col>
                  </Row>
                </TabPane>

                {/* ── SKUs / Items ── */}
                <TabPane tabId="skus">
                  {skuError && <div className="alert alert-danger">{skuError}</div>}
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead><tr><th>SKU</th><th>Barcode</th><th>Price</th><th>Qty</th><th>Weight (oz)</th><th>L × W × H (in)</th><th>Published</th><th></th></tr></thead>
                      <tbody>
                        {skuItems.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-2">No SKUs yet.</td></tr>}
                        {skuItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.sku}</td>
                            <td>{item.barcode ?? "—"}</td>
                            <td>{fmtPrice(item.price)}</td>
                            <td>{item.qtyInStock}</td>
                            <td>{item.weight != null ? `${item.weight} oz` : "—"}</td>
                            <td>{item.length != null ? `${item.length} × ${item.width ?? "—"} × ${item.height ?? "—"}` : "—"}</td>
                            <td><Badge color={item.isPublished ? "success" : "secondary"}>{item.isPublished ? "Yes" : "No"}</Badge></td>
                            <td><Button size="xs" color="danger" outline onClick={() => removeSkuItem(item.id)}><Icon name="trash" /></Button></td>
                          </tr>
                        ))}
                        <tr>
                          <td><input className="form-control form-control-sm" placeholder="SKU *" value={skuDraft.sku} onChange={(e) => setSkuDraft((d) => ({ ...d, sku: e.target.value }))} /></td>
                          <td><input className="form-control form-control-sm" placeholder="Barcode" value={skuDraft.barcode} onChange={(e) => setSkuDraft((d) => ({ ...d, barcode: e.target.value }))} /></td>
                          <td><input className="form-control form-control-sm" type="number" step="0.01" placeholder="Price *" value={skuDraft.price} onChange={(e) => setSkuDraft((d) => ({ ...d, price: e.target.value }))} /></td>
                          <td><input className="form-control form-control-sm" type="number" placeholder="Qty" value={skuDraft.qtyInStock} onChange={(e) => setSkuDraft((d) => ({ ...d, qtyInStock: e.target.value }))} /></td>
                          <td><input className="form-control form-control-sm" type="number" step="0.1" placeholder="oz" value={skuDraft.weight} onChange={(e) => setSkuDraft((d) => ({ ...d, weight: e.target.value }))} style={{ width: 70 }} /></td>
                          <td style={{ minWidth: 160 }}>
                            <div className="d-flex gap-1">
                              <input className="form-control form-control-sm" type="number" step="0.1" placeholder="L" value={skuDraft.length} onChange={(e) => setSkuDraft((d) => ({ ...d, length: e.target.value }))} style={{ width: 50 }} />
                              <input className="form-control form-control-sm" type="number" step="0.1" placeholder="W" value={skuDraft.width} onChange={(e) => setSkuDraft((d) => ({ ...d, width: e.target.value }))} style={{ width: 50 }} />
                              <input className="form-control form-control-sm" type="number" step="0.1" placeholder="H" value={skuDraft.height} onChange={(e) => setSkuDraft((d) => ({ ...d, height: e.target.value }))} style={{ width: 50 }} />
                            </div>
                          </td>
                          <td><input type="checkbox" checked={skuDraft.isPublished} onChange={(e) => setSkuDraft((d) => ({ ...d, isPublished: e.target.checked }))} /></td>
                          <td><Button size="sm" color="primary" onClick={addSkuItem} disabled={skuSaving || !skuDraft.sku || !skuDraft.price}>{skuSaving ? <Spinner size="sm" /> : <Icon name="plus" />}</Button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </TabPane>

                {/* ── Attributes ── */}
                <TabPane tabId="attributes">
                  {attrError && <div className="alert alert-danger">{attrError}</div>}
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead><tr><th>Attribute Name</th><th>Values</th><th></th></tr></thead>
                      <tbody>
                        {attrItems.length === 0 && <tr><td colSpan={3} className="text-center text-muted py-2">No attributes yet.</td></tr>}
                        {attrItems.map((attr) => (
                          <tr key={attr.id}>
                            <td><strong>{attr.name}</strong></td>
                            <td>{(attr.values ?? []).map((v) => v.value).join(", ") || "—"}</td>
                            <td><Button size="xs" color="danger" outline onClick={() => removeAttrItem(attr.id)}><Icon name="trash" /></Button></td>
                          </tr>
                        ))}
                        <tr>
                          <td><input className="form-control form-control-sm" placeholder="e.g. Size" value={attrDraft.name} onChange={(e) => setAttrDraft((d) => ({ ...d, name: e.target.value }))} /></td>
                          <td><input className="form-control form-control-sm" placeholder="10oz, 12oz, 16oz" value={attrDraft.values} onChange={(e) => setAttrDraft((d) => ({ ...d, values: e.target.value }))} /></td>
                          <td><Button size="sm" color="primary" onClick={addAttrItem} disabled={attrSaving || !attrDraft.name}>{attrSaving ? <Spinner size="sm" /> : <Icon name="plus" />}</Button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-muted small mt-1">Separate values with commas (e.g. <em>10oz, 12oz, 16oz</em>).</p>
                </TabPane>

                {/* ── Image ── */}
                <TabPane tabId="image">
                  {imageError && <div className="alert alert-danger">{imageError}</div>}
                  <div className="d-flex flex-wrap gap-3 mb-4">
                    {productImages.map((m) => (
                      <div key={m.mediaAssetId} style={{ position: "relative", flexShrink: 0 }}>
                        <img src={m.mediaAsset?.url} alt="" style={{ width: 200, height: 240, objectFit: "contain", borderRadius: 8, border: "1px solid #e5e9f2", background: "#f8f9fc", padding: 4 }} />
                        {m.isPrimary && <Badge color="primary" style={{ position: "absolute", top: 8, left: 8, fontSize: "0.7em" }}>Primary</Badge>}
                        <button onClick={() => removeImage(m.mediaAssetId)} style={{ position: "absolute", top: 4, right: 4, background: "#e85347", border: "none", borderRadius: "50%", width: 24, height: 24, color: "#fff", lineHeight: 1, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      </div>
                    ))}
                    {productImages.length === 0 && <p className="text-muted">No images yet.</p>}
                  </div>
                  <hr />
                  <div className="form-group mt-3">
                    <label className="form-label">Upload New Image</label>
                    <Dropzone onDrop={onDropFile} maxFiles={1} accept={{ "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] }}>
                      {({ getRootProps, getInputProps }) => (
                        <section>
                          <div {...getRootProps()} className="dropzone upload-zone dz-clickable">
                            <input {...getInputProps()} />
                            {!imageFile && (
                              <div className="dz-message">
                                <span className="dz-message-text">Drag and drop image</span>
                                <span className="dz-message-or">or</span>
                                <Button color="primary" type="button">SELECT</Button>
                              </div>
                            )}
                            {imageFile && (
                              <div className="dz-preview dz-processing dz-image-preview dz-error dz-complete">
                                <div className="dz-image">
                                  <img src={imagePreview} alt="preview" />
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </Dropzone>
                  </div>
                  {imageFile && (
                    <div className="mt-2 d-flex gap-2 align-items-center">
                      <Button color="primary" onClick={uploadImage} disabled={imageSaving}>{imageSaving ? <Spinner size="sm" /> : "Upload Image"}</Button>
                      <Button color="light" size="sm" onClick={() => { setImageFile(null); setImagePreview(null); }}>Clear</Button>
                    </div>
                  )}
                </TabPane>
              </TabContent>
              {editError && <div className="alert alert-danger mt-3">{editError}</div>}
              <div className="mt-3">
                <Button color="primary" onClick={saveEdit} disabled={editSaving || !editForm.name || !editForm.price}>{editSaving ? <Spinner size="sm" /> : "Save Changes"}</Button>
              </div>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Detail / View Modal ──────────────────────────────────────────── */}
        <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} size="xl">
          <ModalBody>
            <a href="#cancel" onClick={(e) => { e.preventDefault(); setDetailModal(false); }} className="close"><em className="icon ni ni-cross-sm" /></a>
            <div className="p-2">
              <h5 className="title">Product Details — <span className="text-soft">{detailProduct?.name}</span></h5>
              <Nav tabs className="mt-3">
                {["basic", "skus", "attributes", "image", "recipes"].map((tab) => (
                  <NavItem key={tab}>
                    <NavLink className={detailTab === tab ? "active" : ""} onClick={() => setDetailTab(tab)} style={{ cursor: "pointer", textTransform: "capitalize" }}>
                      {tab === "skus" ? "SKUs / Items" : tab === "basic" ? "Basic Info" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </NavLink>
                  </NavItem>
                ))}
              </Nav>
              <TabContent activeTab={detailTab} className="mt-3">
                {/* Basic Info */}
                <TabPane tabId="basic">
                  <Row className="g-3">
                    <Col md="6"><div className="form-group"><label className="form-label text-soft">Name</label><p className="fw-medium">{detailProduct?.name ?? "—"}</p></div></Col>
                    <Col md="3"><div className="form-group"><label className="form-label text-soft">Price</label><p className="fw-medium">{fmtPrice(detailProduct?.price)}</p></div></Col>
                    <Col md="3"><div className="form-group"><label className="form-label text-soft">Quantity</label><p className="fw-medium">{detailProduct?.quantity ?? "—"}</p></div></Col>
                    <Col md="6"><div className="form-group"><label className="form-label text-soft">Brand</label><p className="fw-medium">{detailProduct?.brand?.name ?? "—"}</p></div></Col>
                    <Col md="6">
                      <div className="form-group">
                        <label className="form-label text-soft">Categories</label>
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {getProductCategories(detailProduct ?? {}).length > 0
                            ? getProductCategories(detailProduct ?? {}).map((cat, i) => (
                                <Badge key={cat} className="badge-sm badge-dim" color={`outline-${getCatColor(i)}`}>{cat}</Badge>
                              ))
                            : <span className="text-soft">—</span>
                          }
                        </div>
                      </div>
                    </Col>
                    <Col size="12"><div className="form-group"><label className="form-label text-soft">Description</label><p className="text-soft">{detailProduct?.description || "—"}</p></div></Col>
                    <Col md="6"><div className="form-group"><label className="form-label text-soft">Promotional</label><p>{detailProduct?.promotionProducts?.length > 0 ? <Badge className="badge-sm badge-dim" color="outline-warning">Yes</Badge> : <span className="text-soft">No</span>}</p></div></Col>
                    <Col md="6"><div className="form-group"><label className="form-label text-soft">Status</label><p>{isNewProduct(detailProduct ?? {}) ? <Badge className="badge-sm badge-dim" color="info">New</Badge> : <span className="text-soft">Existing</span>}</p></div></Col>
                  </Row>
                </TabPane>
                {/* SKUs */}
                <TabPane tabId="skus">
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead><tr><th>SKU</th><th>Barcode</th><th>Price</th><th>Qty</th><th>Weight (oz)</th><th>L × W × H (in)</th><th>Published</th></tr></thead>
                      <tbody>
                        {detailSkuItems.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-2">No SKUs.</td></tr>}
                        {detailSkuItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.sku}</td>
                            <td>{item.barcode ?? "—"}</td>
                            <td>{fmtPrice(item.price)}</td>
                            <td>{item.qtyInStock}</td>
                            <td>{item.weight != null ? `${item.weight} oz` : "—"}</td>
                            <td>{item.length != null ? `${item.length} × ${item.width ?? "—"} × ${item.height ?? "—"}` : "—"}</td>
                            <td><Badge color={item.isPublished ? "success" : "secondary"}>{item.isPublished ? "Yes" : "No"}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabPane>
                {/* Attributes */}
                <TabPane tabId="attributes">
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead><tr><th>Attribute</th><th>Values</th></tr></thead>
                      <tbody>
                        {(detailProduct?.attributes ?? []).length === 0 && <tr><td colSpan={2} className="text-center text-muted py-2">No attributes.</td></tr>}
                        {(detailProduct?.attributes ?? []).map((attr) => (
                          <tr key={attr.id}><td><strong>{attr.name}</strong></td><td>{(attr.values ?? []).map((v) => v.value).join(", ") || "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabPane>
                {/* Images */}
                <TabPane tabId="image">
                  <div className="d-flex flex-wrap gap-3">
                    {(detailProduct?.media ?? []).length === 0 && <p className="text-muted">No images.</p>}
                    {(detailProduct?.media ?? []).map((m) => (
                      <div key={m.mediaAssetId} style={{ position: "relative" }}>
                        <img src={m.mediaAsset?.url} alt="" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e9f2" }} />
                        {m.isPrimary && <Badge color="primary" style={{ position: "absolute", top: 4, left: 4, fontSize: "0.65em" }}>Primary</Badge>}
                      </div>
                    ))}
                  </div>
                </TabPane>
                {/* Recipes */}
                <TabPane tabId="recipes">
                  {(detailProduct?.recipeMaps ?? []).length === 0 ? (
                    <p className="text-muted text-center py-3">No recipes linked to this product.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead><tr><th>Recipe Name</th><th>Category</th><th>Status</th></tr></thead>
                        <tbody>
                          {(detailProduct?.recipeMaps ?? []).map((m) => (
                            <tr key={m.id}>
                              <td className="fw-medium">{m.recipe?.name ?? "—"}</td>
                              <td>{m.recipe?.category ?? "—"}</td>
                              <td><Badge color={m.recipe?.isActive ? "success" : "secondary"}>{m.recipe?.isActive ? "Active" : "Inactive"}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabPane>
              </TabContent>
            </div>
          </ModalBody>
        </Modal>

      </Content>
    </React.Fragment>
  );
};

export default AdminProductList;

