import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, Spinner } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, UserAvatar, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button, RSelect, TooltipComponent,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch } from "@/utils/apiClient";
import { getAccessToken } from "@/utils/apiClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avatarThemes = ["primary", "success", "info", "warning", "danger", "pink", "purple"];
const getTheme = (id) => avatarThemes[(id || "").charCodeAt(0) % avatarThemes.length];
const getInitials = (u) => {
  const f = (u.firstName || "")[0] || "";
  const l = (u.lastName  || "")[0] || "";
  if (f || l) return (f + l).toUpperCase();
  return (u.emailAddress || "??").slice(0, 2).toUpperCase();
};
const getDisplayName = (u) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.emailAddress;

const roleOptions   = [{ value: "", label: "Any Role" }, { value: "user", label: "User" }, { value: "admin", label: "Admin" }];
const statusOptions = [{ value: "", label: "Any Status" }, { value: "true", label: "Active" }, { value: "false", label: "Inactive" }];
const roleSelectOpts   = [{ value: "user", label: "User" }, { value: "admin", label: "Admin" }];
const activeSelectOpts = [{ value: true, label: "Active" }, { value: false, label: "Inactive" }];

// ─── Component ────────────────────────────────────────────────────────────────

const AdminUserList = () => {
  const [sm, updateSm]           = useState(false);
  const [tablesm, updateTableSm] = useState(false);
  const [onSearch, setonSearch]  = useState(true);
  const [onSearchText, setSearchText] = useState("");

  const [users, setUsers]   = useState([]);
  const [meta, setMeta]     = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [sort, setSortState] = useState("desc");
  const [roleFilter, setRoleFilter]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [editForm, setEditForm]   = useState({ firstName: "", lastName: "", phoneNumber: "", role: "user", isActive: true });
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [addModal, setAddModal]   = useState(false);
  const [addForm, setAddForm]     = useState({ firstName: "", lastName: "", emailAddress: "", password: "", phoneNumber: "", role: "user" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState(null);

  const [exporting, setExporting]     = useState(null); // format string while busy
  const [exportError, setExportError] = useState(null);

  const searchTimer = useRef(null);

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (overrides = {}) => {
    try {
      setLoading(true);
      setError(null);
      const page   = overrides.page   ?? currentPage;
      const limit  = overrides.limit  ?? itemPerPage;
      const order  = overrides.sort   ?? sort;
      const search = overrides.search ?? onSearchText;
      const role   = overrides.role   ?? roleFilter;
      const status = overrides.status ?? statusFilter;

      const q = new URLSearchParams({ page, limit, order, orderBy: "createdAt" });
      if (search) q.set("search", search);
      if (role)   q.set("role", role);
      if (status !== "") q.set("isActive", status);

      const res = await apiGet(`/users?${q.toString()}`);
      setUsers(res?.data ?? []);
      setMeta(res?.meta ?? { total: 0, page: 1, limit, totalPages: 0 });
    } catch (err) {
      setError(err.message ?? "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, onSearchText, roleFilter, statusFilter]);

  useEffect(() => { loadUsers(); }, [currentPage, itemPerPage, sort, roleFilter, statusFilter]); // eslint-disable-line

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const toggle = () => setonSearch(!onSearch);
  const paginate = (page) => setCurrentPage(page);

  const onFilterChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setCurrentPage(1); loadUsers({ search: val, page: 1 }); }, 400);
  };

  const onRoleFilter   = (opt) => { setRoleFilter(opt.value);   setCurrentPage(1); };
  const onStatusFilter = (opt) => { setStatusFilter(opt.value); setCurrentPage(1); };

  const onEditClick = (user) => {
    setEditUser(user);
    setEditForm({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", phoneNumber: user.phoneNumber ?? "", role: user.role ?? "user", isActive: user.isActive ?? true });
    setSaveError(null);
    setEditModal(true);
  };

  const onEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      await apiPatch(`/users/${editUser.id}`, {
        firstName:   editForm.firstName   || undefined,
        lastName:    editForm.lastName    || undefined,
        phoneNumber: editForm.phoneNumber || undefined,
        role:        editForm.role,
        isActive:    editForm.isActive,
      });
      setEditModal(false);
      await loadUsers();
    } catch (err) {
      setSaveError(err.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try { await apiPatch(`/users/${user.id}`, { isActive: !user.isActive }); await loadUsers(); }
    catch { /* silent */ }
  };

  const openAddModal = () => {
    setAddForm({ firstName: "", lastName: "", emailAddress: "", password: "", phoneNumber: "", role: "user" });
    setAddError(null);
    setAddModal(true);
  };

  const onAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveAdd = async () => {
    try {
      setAddSaving(true);
      setAddError(null);
      // Register the new user
      const res = await apiPost("/auth/register", {
        firstName:    addForm.firstName    || undefined,
        lastName:     addForm.lastName     || undefined,
        emailAddress: addForm.emailAddress,
        password:     addForm.password,
        phoneNumber:  addForm.phoneNumber  || undefined,
      });
      const newUserId = res?.data?.userId ?? res?.userId;
      // If admin role requested, patch immediately
      if (addForm.role === "admin" && newUserId) {
        await apiPatch(`/users/${newUserId}`, { role: "admin" });
      }
      setAddModal(false);
      await loadUsers();
    } catch (err) {
      setAddError(err.message ?? "Failed to create user.");
    } finally {
      setAddSaving(false);
    }
  };

  const doExport = async (format) => {
    try {
      setExporting(format);
      setExportError(null);
      // 1. Create export job
      const created = await apiPost("/exports", { resource: "users", format });
      const jobId = created?.data?.id ?? created?.id;
      // 2. Poll until done (max ~30 s, 15 × 2 s)
      let status = created?.data?.status ?? "queued";
      let attempts = 0;
      while (status !== "done" && status !== "failed" && attempts < 15) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await apiGet(`/exports/${jobId}`);
        status = poll?.data?.status ?? poll?.status ?? "queued";
        attempts++;
      }
      if (status === "failed") throw new Error("Export job failed on the server.");
      if (status !== "done")   throw new Error("Export timed out — please try again.");
      // 3. Download via authenticated fetch → blob → anchor click
      const dlRes = await fetch(`/api/v1/exports/${jobId}/download`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (!dlRes.ok) throw new Error("Download failed.");
      const blob = await dlRes.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `users-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message ?? "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <React.Fragment>
      <Head title="Admin - Users"></Head>
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>Users</BlockTitle>
              <BlockDes className="text-soft"><p>Total {meta.total} registered users.</p></BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`} onClick={() => updateSm(!sm)}>
                  <Icon name="menu-alt-r"></Icon>
                </Button>
                <div className={`toggle-expand-content ${sm ? "expanded" : ""}`}>
                  <ul className="nk-block-tools g-3">
                    {exportError && (
                      <li><span className="text-danger small">{exportError}</span></li>
                    )}
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-white btn-outline-light" disabled={!!exporting}>
                          {exporting ? <Spinner size="sm" className="me-1" /> : <Icon name="download-cloud" className="me-1" />}
                          <span>Export</span>
                          <Icon name="chevron-down" className="ms-1" />
                        </DropdownToggle>
                        <DropdownMenu end>
                          <ul className="link-list-opt no-bdr">
                            <li><DropdownItem tag="a" href="#csv"   onClick={(ev) => { ev.preventDefault(); doExport("csv");  }}><Icon name="file-text"></Icon><span>CSV</span></DropdownItem></li>
                            <li><DropdownItem tag="a" href="#xlsx"  onClick={(ev) => { ev.preventDefault(); doExport("xlsx"); }}><Icon name="file-xls"></Icon><span>Excel</span></DropdownItem></li>
                            <li><DropdownItem tag="a" href="#pdf"   onClick={(ev) => { ev.preventDefault(); doExport("pdf");  }}><Icon name="file-pdf"></Icon><span>PDF</span></DropdownItem></li>
                            <li><DropdownItem tag="a" href="#txt"   onClick={(ev) => { ev.preventDefault(); doExport("txt");  }}><Icon name="file-docs"></Icon><span>Text</span></DropdownItem></li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                    <li className="nk-block-tools-opt">
                      <Button color="primary" onClick={openAddModal}>
                        <Icon name="plus"></Icon><span>Add User</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <DataTable className="card-stretch">
            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools">
                  <div className="form-inline flex-nowrap gx-2">
                    <RSelect options={roleOptions} className="w-130px" placeholder="Any Role" onChange={onRoleFilter} />
                    <div className="ms-2">
                      <RSelect options={statusOptions} className="w-130px" placeholder="Any Status" onChange={onStatusFilter} />
                    </div>
                  </div>
                </div>
                <div className="card-tools me-n1">
                  <ul className="btn-toolbar gx-1">
                    <li>
                      <a href="#search" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="btn btn-icon search-toggle toggle-search">
                        <Icon name="search"></Icon>
                      </a>
                    </li>
                    <li className="btn-toolbar-sep"></li>
                    <li>
                      <div className="toggle-wrap">
                        <Button className={`btn-icon btn-trigger toggle ${tablesm ? "active" : ""}`} onClick={() => updateTableSm(true)}>
                          <Icon name="menu-right"></Icon>
                        </Button>
                        <div className={`toggle-content ${tablesm ? "content-active" : ""}`}>
                          <ul className="btn-toolbar gx-1">
                            <li className="toggle-close">
                              <Button className="btn-icon btn-trigger toggle" onClick={() => updateTableSm(false)}><Icon name="arrow-left"></Icon></Button>
                            </li>
                            <li>
                              <UncontrolledDropdown>
                                <DropdownToggle tag="a" className="btn btn-trigger btn-icon dropdown-toggle"><Icon name="setting"></Icon></DropdownToggle>
                                <DropdownMenu end className="dropdown-menu-xs">
                                  <ul className="link-check">
                                    <li><span>Show</span></li>
                                    <li className={itemPerPage === 10 ? "active" : ""}><DropdownItem tag="a" href="#10" onClick={(ev) => { ev.preventDefault(); setItemPerPage(10); setCurrentPage(1); }}>10</DropdownItem></li>
                                    <li className={itemPerPage === 25 ? "active" : ""}><DropdownItem tag="a" href="#25" onClick={(ev) => { ev.preventDefault(); setItemPerPage(25); setCurrentPage(1); }}>25</DropdownItem></li>
                                    <li className={itemPerPage === 50 ? "active" : ""}><DropdownItem tag="a" href="#50" onClick={(ev) => { ev.preventDefault(); setItemPerPage(50); setCurrentPage(1); }}>50</DropdownItem></li>
                                  </ul>
                                  <ul className="link-check">
                                    <li><span>Order</span></li>
                                    <li className={sort === "desc" ? "active" : ""}><DropdownItem tag="a" href="#desc" onClick={(ev) => { ev.preventDefault(); setSortState("desc"); }}>DESC</DropdownItem></li>
                                    <li className={sort === "asc"  ? "active" : ""}><DropdownItem tag="a" href="#asc"  onClick={(ev) => { ev.preventDefault(); setSortState("asc");  }}>ASC</DropdownItem></li>
                                  </ul>
                                </DropdownMenu>
                              </UncontrolledDropdown>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              {/* ── Search bar ─────────────────────────────────────────────── */}
              <div className={`card-search search-wrap ${!onSearch && "active"}`}>
                <div className="card-body">
                  <div className="search-content">
                    <Button className="search-back btn-icon toggle-search active" onClick={() => { setSearchText(""); toggle(); }}><Icon name="arrow-left"></Icon></Button>
                    <input type="text" className="border-transparent form-focus-none form-control" placeholder="Search by name or email" value={onSearchText} onChange={onFilterChange} />
                    <Button className="search-submit btn-icon"><Icon name="search"></Icon></Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Table body ───────────────────────────────────────────────── */}
            {loading ? (
              <div className="text-center py-5"><Spinner color="primary" /></div>
            ) : error ? (
              <div className="alert alert-danger m-4">{error}</div>
            ) : (
              <>
                <DataTableBody compact>
                  <DataTableHead>
                    <DataTableRow><span className="sub-text">User</span></DataTableRow>
                    <DataTableRow size="md"><span className="sub-text">Role</span></DataTableRow>
                    <DataTableRow size="sm"><span className="sub-text">Email</span></DataTableRow>
                    <DataTableRow size="md"><span className="sub-text">Phone</span></DataTableRow>
                    <DataTableRow size="lg"><span className="sub-text">Joined</span></DataTableRow>
                    <DataTableRow><span className="sub-text">Status</span></DataTableRow>
                    <DataTableRow className="nk-tb-col-tools text-end"></DataTableRow>
                  </DataTableHead>

                  {users.length > 0 ? users.map((item) => (
                    <DataTableItem key={item.id}>
                      <DataTableRow>
                        <div className="user-card">
                          <UserAvatar theme={getTheme(item.id)} className="xs" text={getInitials(item)}></UserAvatar>
                          <div className="user-name"><span className="tb-lead">{getDisplayName(item)}</span></div>
                        </div>
                      </DataTableRow>
                      <DataTableRow size="md">
                        <Badge color={item.role === "admin" ? "primary" : "secondary"} pill>{item.role}</Badge>
                      </DataTableRow>
                      <DataTableRow size="sm"><span>{item.emailAddress}</span></DataTableRow>
                      <DataTableRow size="md"><span>{item.phoneNumber || <em className="text-soft">—</em>}</span></DataTableRow>
                      <DataTableRow size="lg"><span>{new Date(item.createdAt).toLocaleDateString()}</span></DataTableRow>
                      <DataTableRow>
                        <span className={`tb-status text-${item.isActive ? "success" : "danger"}`}>{item.isActive ? "Active" : "Inactive"}</span>
                      </DataTableRow>
                      <DataTableRow className="nk-tb-col-tools">
                        <ul className="nk-tb-actions gx-1">
                          <li className="nk-tb-action-hidden" onClick={() => onEditClick(item)}>
                            <TooltipComponent tag="a" containerClassName="btn btn-trigger btn-icon" id={"edit" + item.id} icon="edit-alt-fill" direction="top" text="Edit" />
                          </li>
                          <li className="nk-tb-action-hidden" onClick={() => toggleActive(item)}>
                            <TooltipComponent tag="a" containerClassName="btn btn-trigger btn-icon" id={"toggle" + item.id} icon={item.isActive ? "user-cross-fill" : "user-check-fill"} direction="top" text={item.isActive ? "Deactivate" : "Activate"} />
                          </li>
                          <li>
                            <UncontrolledDropdown>
                              <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger"><Icon name="more-h"></Icon></DropdownToggle>
                              <DropdownMenu end>
                                <ul className="link-list-opt no-bdr">
                                  <li onClick={() => onEditClick(item)}>
                                    <DropdownItem tag="a" href="#edit" onClick={(ev) => ev.preventDefault()}><Icon name="edit"></Icon><span>Edit</span></DropdownItem>
                                  </li>
                                  <li className="divider"></li>
                                  <li onClick={() => toggleActive(item)}>
                                    <DropdownItem tag="a" href="#toggle" onClick={(ev) => ev.preventDefault()}>
                                      <Icon name={item.isActive ? "na" : "check-circle"}></Icon>
                                      <span>{item.isActive ? "Deactivate" : "Activate"}</span>
                                    </DropdownItem>
                                  </li>
                                </ul>
                              </DropdownMenu>
                            </UncontrolledDropdown>
                          </li>
                        </ul>
                      </DataTableRow>
                    </DataTableItem>
                  )) : (
                    <div className="text-center p-4"><span className="text-silent">No users found</span></div>
                  )}
                </DataTableBody>

                <div className="card-inner">
                  {meta.total > 0 ? (
                    <PaginationComponent itemPerPage={itemPerPage} totalItems={meta.total} paginate={paginate} currentPage={currentPage} />
                  ) : (
                    <div className="text-center"><span className="text-silent">No data found</span></div>
                  )}
                </div>
              </>
            )}
          </DataTable>
        </Block>

        {/* Add User Modal */}
        <Modal isOpen={addModal} className="modal-dialog-centered" size="md" toggle={() => setAddModal(false)}>
          <a href="#close" onClick={(ev) => { ev.preventDefault(); setAddModal(false); }} className="close">
            <Icon name="cross-sm"></Icon>
          </a>
          <ModalBody>
            <div className="p-2">
              <h5 className="title">Add New User</h5>
              {addError && <div className="alert alert-danger mt-2">{addError}</div>}
              <Row className="gy-4 mt-2">
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-control" name="firstName" value={addForm.firstName} onChange={onAddFormChange} placeholder="First name" />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" name="lastName" value={addForm.lastName} onChange={onAddFormChange} placeholder="Last name" />
                  </div>
                </Col>
                <Col size="12">
                  <div className="form-group">
                    <label className="form-label">Email Address <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" name="emailAddress" value={addForm.emailAddress} onChange={onAddFormChange} placeholder="user@example.com" />
                  </div>
                </Col>
                <Col size="12">
                  <div className="form-group">
                    <label className="form-label">Password <span className="text-danger">*</span></label>
                    <input type="password" className="form-control" name="password" value={addForm.password} onChange={onAddFormChange} placeholder="Min 8 chars, 1 uppercase, 1 number" />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-control" name="phoneNumber" value={addForm.phoneNumber} onChange={onAddFormChange} placeholder="+1 555 000 0000" />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <RSelect options={roleSelectOpts} value={{ value: addForm.role, label: addForm.role === "admin" ? "Admin" : "User" }} onChange={(opt) => setAddForm((prev) => ({ ...prev, role: opt.value }))} />
                  </div>
                </Col>
                <Col size="12">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button color="primary" size="lg" disabled={addSaving} onClick={(ev) => { ev.preventDefault(); saveAdd(); }}>
                        {addSaving ? <Spinner size="sm" /> : "Create User"}
                      </Button>
                    </li>
                    <li>
                      <a href="#cancel" onClick={(ev) => { ev.preventDefault(); setAddModal(false); }} className="link link-light">Cancel</a>
                    </li>
                  </ul>
                </Col>
              </Row>
            </div>
          </ModalBody>
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={editModal} className="modal-dialog-centered" size="md" toggle={() => setEditModal(false)}>
          <a href="#close" onClick={(ev) => { ev.preventDefault(); setEditModal(false); }} className="close">
            <Icon name="cross-sm"></Icon>
          </a>
          <ModalBody>
            <div className="p-2">
              <h5 className="title">Edit User</h5>
              {saveError && <div className="alert alert-danger mt-2">{saveError}</div>}
              <Row className="gy-4 mt-2">
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-control" name="firstName" value={editForm.firstName} onChange={onEditFormChange} />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" name="lastName" value={editForm.lastName} onChange={onEditFormChange} />
                  </div>
                </Col>
                <Col size="12">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-control" name="phoneNumber" value={editForm.phoneNumber} onChange={onEditFormChange} />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <RSelect options={roleSelectOpts} value={{ value: editForm.role, label: editForm.role === "admin" ? "Admin" : "User" }} onChange={(opt) => setEditForm((prev) => ({ ...prev, role: opt.value }))} />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <RSelect options={activeSelectOpts} value={{ value: editForm.isActive, label: editForm.isActive ? "Active" : "Inactive" }} onChange={(opt) => setEditForm((prev) => ({ ...prev, isActive: opt.value }))} />
                  </div>
                </Col>
                <Col size="12">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button color="primary" size="lg" disabled={saving} onClick={(ev) => { ev.preventDefault(); saveEdit(); }}>
                        {saving ? <Spinner size="sm" /> : "Save Changes"}
                      </Button>
                    </li>
                    <li>
                      <a href="#cancel" onClick={(ev) => { ev.preventDefault(); setEditModal(false); }} className="link link-light">Cancel</a>
                    </li>
                  </ul>
                </Col>
              </Row>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default AdminUserList;
