import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, ModalHeader, Spinner, Badge } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import { apiGet, apiPost, apiDelete, getAccessToken } from "@/utils/apiClient";

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_TYPES  = ["catering", "truck", "event", "seasonal", "online"];
const LAYOUTS     = [{ value: "2col", label: "2 Column" }, { value: "1col", label: "1 Column" }];
const THEMES      = ["default", "dark", "warm", "fresh", "bold"];

const blankForm = () => ({
  name: "", menuType: "truck", startDate: "", endDate: "",
  layout: "2col", theme: "default", isActive: true,
});

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const TYPE_COLORS = {
  catering: "warning", truck: "primary", event: "info",
  seasonal: "success", online: "secondary",
};

// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon = ({ field, sortField, sort }) => (
  <Icon name={sortField === field ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
);

// ─── Component ────────────────────────────────────────────────────────────────

const AdminMenuList = () => {
  const navigate = useNavigate();

  // ── List state ────────────────────────────────────────────────────────────
  const [menus,       setMenus]       = useState([]);
  const [totalItems,  setTotalItems]  = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [sort,        setSort]        = useState("asc");
  const [sortField,   setSortField]   = useState("name");
  const [searchText,  setSearchText]  = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [typeFilter,  setTypeFilter]  = useState("");

  // ── Create modal state ────────────────────────────────────────────────────
  const [createModal,  setCreateModal]  = useState(false);
  const [form,         setForm]         = useState(blankForm());
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState(null);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Export state ──────────────────────────────────────────────────────────
  const [exporting,   setExporting]   = useState(false);
  const [exportError, setExportError] = useState(null);

  const searchTimer = useRef(null);

  // ── Load menus ────────────────────────────────────────────────────────────

  const loadMenus = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const opts = {
        page: currentPage, limit: itemPerPage,
        order: sort, orderBy: sortField,
        search: searchText || undefined,
        menuType: typeFilter || undefined,
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/menus?${qs}`);
      setMenus(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, sortField, searchText, typeFilter]);

  useEffect(() => { loadMenus(); }, [loadMenus]);

  // ── Pagination / sort / search ────────────────────────────────────────────

  const paginate = (p) => setCurrentPage(p);

  const onSortClick = (field) => {
    if (sortField === field) setSort((s) => (s === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSort("asc"); }
    setCurrentPage(1);
  };

  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      loadMenus({ page: 1, search: val || undefined });
    }, 400);
  };

  // ── Create ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(blankForm()); setFormError(null); setCreateModal(true);
  };

  const saveMenu = async () => {
    if (!form.name.trim()) { setFormError("Menu name is required."); return; }
    setSaving(true); setFormError(null);
    try {
      const body = {
        name: form.name.trim(),
        menuType: form.menuType,
        layout: form.layout,
        theme: form.theme,
        isActive: form.isActive,
        startDate: form.startDate || undefined,
        endDate:   form.endDate   || undefined,
      };
      const res = await apiPost("/menus", body);
      const newId = res?.data?.id ?? res?.id;
      setCreateModal(false);
      loadMenus();
      if (newId) navigate(`/menus/${newId}/builder`);
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/menus/${deleteTarget.id}`);
      setDeleteModal(false); setDeleteTarget(null); loadMenus();
    } catch (e) { setError(e.message); }
    finally { setDeleteLoading(false); }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const doExport = async (format) => {
    setExporting(true); setExportError(null);
    try {
      const res = await apiPost("/exports", { entity: "menus", format });
      const jobId = res?.data?.id ?? res?.id;
      let status = "pending", attempts = 0;
      while (status !== "done" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await apiGet(`/exports/${jobId}`);
        status = poll?.data?.status ?? poll?.status; attempts++;
      }
      if (status !== "done") throw new Error("Export timed out");
      const token = getAccessToken();
      const dl = await fetch(`/api/v1/exports/${jobId}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!dl.ok) throw new Error("Download failed");
      const blob = await dl.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `menus-export.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setExportError(e.message); }
    finally { setExporting(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <Head title="Menus" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Menu Builder</BlockTitle>
              <BlockDes className="text-soft"><p>You have {totalItems} menu{totalItems !== 1 ? "s" : ""}. Click a menu to open the builder.</p></BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <div className="toggle-expand-content">
                  <ul className="nk-block-tools g-3">
                    {exportError && <li><span className="text-danger small">{exportError}</span></li>}
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-white btn-outline-light" disabled={exporting}>
                          {exporting ? <Spinner size="sm" /> : <Icon name="download-cloud" />}<span>Export</span>
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
                      <Button color="primary" onClick={openCreate}>
                        <Icon name="plus" /><span>New Menu</span>
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
                  <UncontrolledDropdown>
                    <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle">
                      <Icon name="filter" />
                    </DropdownToggle>
                    <DropdownMenu start className="dropdown-menu-sm">
                      <ul className="link-check">
                        <li><span>Type</span></li>
                        <li className={!typeFilter ? "active" : ""}><DropdownItem onClick={() => { setTypeFilter(""); setCurrentPage(1); }}>All</DropdownItem></li>
                        {MENU_TYPES.map((t) => (
                          <li key={t} className={typeFilter === t ? "active" : ""}>
                            <DropdownItem onClick={() => { setTypeFilter(t); setCurrentPage(1); }} className="text-capitalize">{t}</DropdownItem>
                          </li>
                        ))}
                      </ul>
                    </DropdownMenu>
                  </UncontrolledDropdown>
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
                        <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle"><Icon name="setting" /></DropdownToggle>
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
                      <input type="text" className="border-transparent form-focus-none form-control"
                        placeholder="Search by menu name..." value={searchText} onChange={onSearchChange} />
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
                    Name <SortIcon field="name" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="sm">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("menuType")}>
                    Type <SortIcon field="menuType" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="lg">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("startDate")}>
                    Start <SortIcon field="startDate" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="lg">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("endDate")}>
                    End <SortIcon field="endDate" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text">Layout</span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text">Theme</span>
                </DataTableRow>
                <DataTableRow size="sm">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("isPublished")}>
                    Published <SortIcon field="isPublished" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={8} className="text-center py-4"><Spinner /></td></tr>
              ) : menus.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-4 text-muted">No menus found.</td></tr>
              ) : menus.map((menu) => (
                <DataTableItem key={menu.id}>
                  <DataTableRow>
                    <span className="tb-product">
                      <span className="title fw-semibold" style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/menus/${menu.id}/builder`)}>
                        {menu.name}
                      </span>
                      {menu.isActive === false && <span className="d-block text-soft small">Inactive</span>}
                    </span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <Badge color={TYPE_COLORS[menu.menuType] ?? "secondary"} className="text-capitalize">{menu.menuType}</Badge>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-soft">{fmtDate(menu.startDate)}</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-soft">{fmtDate(menu.endDate)}</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="text-soft">{menu.layout === "1col" ? "1 Column" : "2 Column"}</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="text-soft text-capitalize">{menu.theme ?? "default"}</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <Badge color={menu.isPublished ? "success" : "secondary"}>
                      {menu.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger"><Icon name="more-h" /></DropdownToggle>
                          <DropdownMenu end>
                            <ul className="link-list-opt no-bdr">
                              <li>
                                <DropdownItem onClick={() => navigate(`/menus/${menu.id}/builder`)}>
                                  <Icon name="edit" /><span>Open Builder</span>
                                </DropdownItem>
                              </li>
                              <li>
                                <DropdownItem onClick={() => { setDeleteTarget(menu); setDeleteModal(true); }}>
                                  <Icon name="trash" /><span>Delete</span>
                                </DropdownItem>
                              </li>
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
                  itemPerPage={itemPerPage} totalItems={totalItems}
                  paginate={paginate} currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Create Menu Modal ─────────────────────────────────────────────── */}
        <Modal isOpen={createModal} toggle={() => setCreateModal(false)}>
          <ModalHeader toggle={() => setCreateModal(false)}>New Menu</ModalHeader>
          <ModalBody>
            {formError && <div className="alert alert-danger mb-3">{formError}</div>}
            <Row className="g-3">
              <Col size="12">
                <div className="form-group">
                  <label className="form-label">Menu Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" placeholder="e.g. Summer Catering Menu"
                    value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
              </Col>
              <Col size="6">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.menuType}
                    onChange={(e) => setForm((f) => ({ ...f, menuType: e.target.value }))}>
                    {MENU_TYPES.map((t) => <option key={t} value={t} className="text-capitalize">{t}</option>)}
                  </select>
                </div>
              </Col>
              <Col size="6">
                <div className="form-group">
                  <label className="form-label">Layout</label>
                  <select className="form-select" value={form.layout}
                    onChange={(e) => setForm((f) => ({ ...f, layout: e.target.value }))}>
                    {LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </Col>
              <Col size="6">
                <div className="form-group">
                  <label className="form-label">Theme</label>
                  <select className="form-select" value={form.theme}
                    onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}>
                    {THEMES.map((t) => <option key={t} value={t} className="text-capitalize">{t}</option>)}
                  </select>
                </div>
              </Col>
              <Col size="6">
                <div className="form-group d-flex flex-column justify-content-end h-100">
                  <div className="form-check form-switch mt-2">
                    <input type="checkbox" className="form-check-input" id="isActiveSwitch"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                    <label className="form-check-label" htmlFor="isActiveSwitch">Active</label>
                  </div>
                </div>
              </Col>
              <Col size="6">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-control"
                    value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
              </Col>
              <Col size="6">
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" className="form-control"
                    value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </Col>
              <Col size="12">
                <div className="d-flex justify-content-end gap-2 mt-2">
                  <Button color="light" onClick={() => setCreateModal(false)}>Cancel</Button>
                  <Button color="primary" onClick={saveMenu} disabled={saving}>
                    {saving ? <Spinner size="sm" /> : <><Icon name="plus" /><span>Create &amp; Open Builder</span></>}
                  </Button>
                </div>
              </Col>
            </Row>
          </ModalBody>
        </Modal>

        {/* ── Delete Modal ──────────────────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalBody className="modal-body-lg text-center">
            <div className="nk-modal">
              <Icon name="trash" className="nk-modal-icon icon-circle icon-circle-xxl bg-danger text-white" />
              <h4 className="nk-modal-title">Delete Menu?</h4>
              <div className="nk-modal-text">
                <p className="lead">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all sections and items.</p>
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

      </Content>
    </React.Fragment>
  );
};

export default AdminMenuList;

