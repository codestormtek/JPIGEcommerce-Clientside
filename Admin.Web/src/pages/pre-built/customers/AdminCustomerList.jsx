import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, Spinner } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, UserAvatar, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button, RSelect,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";
import { getAccessToken } from "@/utils/apiClient";

const avatarThemes = ["primary", "success", "info", "warning", "danger", "pink", "purple"];
const getTheme = (id) => avatarThemes[(id || "").charCodeAt(0) % avatarThemes.length];
const getInitials = (u) => {
  const f = (u.firstName || "")[0] || "";
  const l = (u.lastName || "")[0] || "";
  if (f || l) return (f + l).toUpperCase();
  return (u.emailAddress || "??").slice(0, 2).toUpperCase();
};
const getDisplayName = (u) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.emailAddress;

const roleOptions = [
  { value: "", label: "All" },
  { value: "user", label: "Registered" },
  { value: "admin", label: "Administrators" },
];
const statusOptions = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];
const roleSelectOpts = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const AdminCustomerList = () => {
  const [sm, updateSm] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(15);
  const [sort, setSort] = useState("desc");

  const [filterEmail, setFilterEmail] = useState("");
  const [filterFirstName, setFilterFirstName] = useState("");
  const [filterLastName, setFilterLastName] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  const [editModal, setEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phoneNumber: "", role: "user", isActive: true });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", emailAddress: "", password: "", phoneNumber: "", role: "user" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set("page", currentPage);
      q.set("limit", itemPerPage);
      q.set("order", sort);
      q.set("orderBy", "createdAt");

      const search = [filterEmail, filterFirstName, filterLastName].filter(Boolean).join(" ");
      if (search) q.set("search", search);
      if (filterRole) q.set("role", filterRole);
      if (filterActive !== "") q.set("isActive", filterActive);
      if (filterDateFrom) q.set("createdFrom", filterDateFrom);
      if (filterDateTo) q.set("createdTo", filterDateTo);

      const res = await apiGet(`/users?${q.toString()}`);
      setCustomers(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, filterEmail, filterFirstName, filterLastName, filterRole, filterActive, filterDateFrom, filterDateTo]);

  useEffect(() => { loadCustomers(); setSelectedIds(new Set()); }, [loadCustomers]);

  const doSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadCustomers();
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phoneNumber: user.phoneNumber ?? "",
      role: user.role ?? "user",
      isActive: user.isActive ?? true,
    });
    setEditError(null);
    setEditModal(true);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      await apiPatch(`/users/${editUser.id}`, {
        firstName: editForm.firstName || undefined,
        lastName: editForm.lastName || undefined,
        phoneNumber: editForm.phoneNumber || undefined,
        role: editForm.role,
        isActive: editForm.isActive,
      });
      setEditModal(false);
      loadCustomers();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const openAddModal = () => {
    setAddForm({ firstName: "", lastName: "", emailAddress: "", password: "", phoneNumber: "", role: "user" });
    setAddError(null);
    setAddModal(true);
  };

  const saveAdd = async () => {
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await apiPost("/auth/register", {
        firstName: addForm.firstName || undefined,
        lastName: addForm.lastName || undefined,
        emailAddress: addForm.emailAddress,
        password: addForm.password,
        phoneNumber: addForm.phoneNumber || undefined,
      });
      const newUserId = res?.data?.userId ?? res?.userId;
      if (newUserId) {
        // Admin-created users are activated immediately; optionally promote to admin
        const patch = { isActive: true };
        if (addForm.role === "admin") patch.role = "admin";
        await apiPatch(`/users/${newUserId}`, patch);
      }
      setAddModal(false);
      loadCustomers();
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAddSaving(false);
    }
  };

  const confirmDelete = (user) => {
    setDeleteTarget(user);
    setDeleteModal(true);
  };

  const doDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiDelete(`/users/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      loadCustomers();
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await apiPatch(`/users/${user.id}`, { isActive: !user.isActive });
      loadCustomers();
    } catch {}
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = customers.length > 0 && customers.every((c) => selectedIds.has(c.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        customers.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        customers.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const doBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => apiDelete(`/users/${id}`)));
      setSelectedIds(new Set());
      setBulkDeleteModal(false);
      loadCustomers();
    } catch (e) {
      alert(e.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const doExport = async (format) => {
    try {
      setExporting(format);
      setExportError(null);
      const created = await apiPost("/exports", { resource: "users", format });
      const jobId = created?.data?.id ?? created?.id;
      let status = created?.data?.status ?? "queued";
      let attempts = 0;
      while (status !== "done" && status !== "failed" && attempts < 15) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await apiGet(`/exports/${jobId}`);
        status = poll?.data?.status ?? poll?.status ?? "queued";
        attempts++;
      }
      if (status === "failed") throw new Error("Export job failed.");
      if (status !== "done") throw new Error("Export timed out.");
      const dlRes = await fetch(`/api/v1/exports/${jobId}/download`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (!dlRes.ok) throw new Error("Download failed.");
      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e.message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <React.Fragment>
      <Head title="Customers" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>Customers</BlockTitle>
              <BlockDes className="text-soft"><p>You have {totalItems} customer{totalItems !== 1 ? "s" : ""}.</p></BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`} onClick={() => updateSm(!sm)}>
                  <Icon name="menu-alt-r" />
                </Button>
                <div className={`toggle-expand-content ${sm ? "expanded" : ""}`}>
                  <ul className="nk-block-tools g-3">
                    {exportError && <li><span className="text-danger small">{exportError}</span></li>}
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-white btn-outline-light" disabled={!!exporting}>
                          {exporting ? <Spinner size="sm" className="me-1" /> : <Icon name="download-cloud" className="me-1" />}
                          <span>Export</span>
                          <Icon name="chevron-down" className="ms-1" />
                        </DropdownToggle>
                        <DropdownMenu end>
                          <ul className="link-list-opt no-bdr">
                            <li><DropdownItem tag="a" href="#csv" onClick={(ev) => { ev.preventDefault(); doExport("csv"); }}><Icon name="file-text" /><span>CSV</span></DropdownItem></li>
                            <li><DropdownItem tag="a" href="#xlsx" onClick={(ev) => { ev.preventDefault(); doExport("xlsx"); }}><Icon name="file-xls" /><span>Excel</span></DropdownItem></li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                    <li className="nk-block-tools-opt">
                      <Button color="primary" onClick={openAddModal}>
                        <Icon name="plus" /><span>Add New</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <div className="card card-bordered">
            <div className="card-inner border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  <Icon name="search" className="me-1" />
                  Search
                </h6>
                <a href="#toggle" className="link link-primary" onClick={(e) => { e.preventDefault(); setShowFilters(!showFilters); }}>
                  {showFilters ? "Hide" : "Show"}
                </a>
              </div>
              {showFilters && (
                <form onSubmit={doSearch}>
                  <Row className="g-3">
                    <Col md={4}>
                      <div className="form-group">
                        <label className="form-label text-muted small">Email</label>
                        <input type="text" className="form-control form-control-sm" value={filterEmail} onChange={(e) => setFilterEmail(e.target.value)} placeholder="" />
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="form-group">
                        <label className="form-label text-muted small">First name</label>
                        <input type="text" className="form-control form-control-sm" value={filterFirstName} onChange={(e) => setFilterFirstName(e.target.value)} placeholder="" />
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="form-group">
                        <label className="form-label text-muted small">Last name</label>
                        <input type="text" className="form-control form-control-sm" value={filterLastName} onChange={(e) => setFilterLastName(e.target.value)} placeholder="" />
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="form-group">
                        <label className="form-label text-muted small">Is active</label>
                        <RSelect options={statusOptions} value={statusOptions.find((o) => o.value === filterActive) || statusOptions[0]} onChange={(opt) => setFilterActive(opt.value)} className="react-select-sm" />
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="form-group">
                        <label className="form-label text-muted small">Customer roles</label>
                        <RSelect options={roleOptions} value={roleOptions.find((o) => o.value === filterRole) || roleOptions[0]} onChange={(opt) => setFilterRole(opt.value)} className="react-select-sm" />
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="form-group">
                        <label className="form-label text-muted small">Registration date from</label>
                        <input type="date" className="form-control form-control-sm" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="form-group">
                        <label className="form-label text-muted small">Registration date to</label>
                        <input type="date" className="form-control form-control-sm" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                      </div>
                    </Col>
                    <Col xs={12} className="text-center">
                      <Button type="submit" color="primary" size="sm">
                        <Icon name="search" className="me-1" />Search
                      </Button>
                    </Col>
                  </Row>
                </form>
              )}
            </div>

            {error && <div className="alert alert-danger m-3">{error}</div>}

            {selectedIds.size > 0 && (
              <div className="d-flex align-items-center gap-3 px-3 py-2" style={{ background: "#fff8f0", borderBottom: "1px solid #fed7aa" }}>
                <span className="fw-medium text-dark">{selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""} selected</span>
                <Button color="danger" size="sm" onClick={() => setBulkDeleteModal(true)}>
                  <Icon name="trash" className="me-1" />Delete Selected
                </Button>
                <a href="#clear" className="link link-secondary ms-auto small" onClick={(e) => { e.preventDefault(); setSelectedIds(new Set()); }}>
                  Clear selection
                </a>
              </div>
            )}

            {loading ? (
              <div className="text-center py-5"><Spinner color="primary" /></div>
            ) : (
              <>
                <DataTableBody compact>
                  <DataTableHead>
                    <DataTableRow className="nk-tb-col-check">
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input form-check-input"
                          id="chk-all"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                        />
                        <label className="custom-control-label" htmlFor="chk-all" />
                      </div>
                    </DataTableRow>
                    <DataTableRow><span className="sub-text">Email</span></DataTableRow>
                    <DataTableRow size="md"><span className="sub-text">Name</span></DataTableRow>
                    <DataTableRow size="md"><span className="sub-text">Customer roles</span></DataTableRow>
                    <DataTableRow size="lg"><span className="sub-text">Phone</span></DataTableRow>
                    <DataTableRow size="sm"><span className="sub-text">Active</span></DataTableRow>
                    <DataTableRow size="lg"><span className="sub-text">Registered</span></DataTableRow>
                    <DataTableRow className="nk-tb-col-tools text-end"><span className="sub-text">Edit</span></DataTableRow>
                  </DataTableHead>

                  {customers.length > 0 ? customers.map((item) => (
                    <DataTableItem key={item.id} className={selectedIds.has(item.id) ? "selected" : ""}>
                      <DataTableRow className="nk-tb-col-check">
                        <div className="custom-control custom-checkbox">
                          <input
                            type="checkbox"
                            className="custom-control-input form-check-input"
                            id={`chk-${item.id}`}
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                          />
                          <label className="custom-control-label" htmlFor={`chk-${item.id}`} />
                        </div>
                      </DataTableRow>
                      <DataTableRow>
                        <div className="user-card">
                          <UserAvatar theme={getTheme(item.id)} className="xs" text={getInitials(item)} />
                          <div className="user-name">
                            <Link to={`/customers/${item.id}`} className="tb-lead">{item.emailAddress}</Link>
                          </div>
                        </div>
                      </DataTableRow>
                      <DataTableRow size="md">
                        <span>{getDisplayName(item)}</span>
                      </DataTableRow>
                      <DataTableRow size="md">
                        <Badge color={item.role === "admin" ? "primary" : "light"} className="text-capitalize">{item.role === "admin" ? "Administrators" : "Registered"}</Badge>
                      </DataTableRow>
                      <DataTableRow size="lg">
                        <span>{item.phoneNumber || <em className="text-soft">—</em>}</span>
                      </DataTableRow>
                      <DataTableRow size="sm">
                        {item.isActive ? (
                          <Badge color="success" pill>Active</Badge>
                        ) : (
                          <Badge color="warning" pill style={{ color: "#92400e" }}>Pending Approval</Badge>
                        )}
                      </DataTableRow>
                      <DataTableRow size="lg">
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </DataTableRow>
                      <DataTableRow className="nk-tb-col-tools">
                        <ul className="nk-tb-actions gx-1">
                          <li>
                            <Link to={`/customers/${item.id}`} className="btn btn-trigger btn-icon">
                              <Icon name="edit-alt-fill" />
                            </Link>
                          </li>
                          <li>
                            <UncontrolledDropdown>
                              <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger"><Icon name="more-h" /></DropdownToggle>
                              <DropdownMenu end>
                                <ul className="link-list-opt no-bdr">
                                  <li><Link to={`/customers/${item.id}`} className="dropdown-item"><Icon name="eye" /><span>View Details</span></Link></li>
                                  <li onClick={() => openEditModal(item)}><DropdownItem tag="a" href="#edit" onClick={(ev) => ev.preventDefault()}><Icon name="edit" /><span>Quick Edit</span></DropdownItem></li>
                                  <li className="divider" />
                                  <li onClick={() => toggleActive(item)}>
                                    <DropdownItem tag="a" href="#toggle" onClick={(ev) => ev.preventDefault()} className={!item.isActive ? "text-success fw-bold" : ""}>
                                      <Icon name={item.isActive ? "na" : "check-circle-fill"} className={!item.isActive ? "text-success" : ""} />
                                      <span>{item.isActive ? "Deactivate" : "Approve Account"}</span>
                                    </DropdownItem>
                                  </li>
                                  <li onClick={() => confirmDelete(item)}>
                                    <DropdownItem tag="a" href="#delete" onClick={(ev) => ev.preventDefault()} className="text-danger">
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
                  )) : (
                    <div className="text-center p-4"><span className="text-silent">No customers found.</span></div>
                  )}
                </DataTableBody>

                <div className="card-inner d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <span className="me-2 text-muted small">Show</span>
                    <RSelect
                      options={[{ value: 15, label: "15" }, { value: 25, label: "25" }, { value: 50, label: "50" }]}
                      value={{ value: itemPerPage, label: String(itemPerPage) }}
                      onChange={(opt) => { setItemPerPage(opt.value); setCurrentPage(1); }}
                      className="w-80px react-select-sm"
                    />
                    <span className="ms-2 text-muted small">items</span>
                  </div>
                  {totalItems > 0 ? (
                    <PaginationComponent itemPerPage={itemPerPage} totalItems={totalItems} paginate={(p) => setCurrentPage(p)} currentPage={currentPage} />
                  ) : (
                    <span className="text-muted small">No records</span>
                  )}
                  <span className="text-muted small">{totalItems > 0 ? `${(currentPage - 1) * itemPerPage + 1}-${Math.min(currentPage * itemPerPage, totalItems)} of ${totalItems} items` : ""}</span>
                </div>
              </>
            )}
          </div>
        </Block>

        {/* Add Customer Modal */}
        <Modal isOpen={addModal} className="modal-dialog-centered" size="lg" toggle={() => setAddModal(false)}>
          <a href="#close" onClick={(ev) => { ev.preventDefault(); setAddModal(false); }} className="close"><Icon name="cross-sm" /></a>
          <ModalBody>
            <div className="p-2">
              <h5 className="title">Add New Customer</h5>
              {addError && <div className="alert alert-danger mt-2">{addError}</div>}
              <Row className="gy-4 mt-2">
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-control" name="firstName" value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" name="lastName" value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} />
                  </div>
                </Col>
                <Col size="12">
                  <div className="form-group">
                    <label className="form-label">Email Address <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" value={addForm.emailAddress} onChange={(e) => setAddForm({ ...addForm, emailAddress: e.target.value })} />
                  </div>
                </Col>
                <Col size="12">
                  <div className="form-group">
                    <label className="form-label">Password <span className="text-danger">*</span></label>
                    <input type="password" className="form-control" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Min 8 chars, 1 uppercase, 1 number" />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-control" value={addForm.phoneNumber} onChange={(e) => setAddForm({ ...addForm, phoneNumber: e.target.value })} />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <RSelect options={roleSelectOpts} value={roleSelectOpts.find((o) => o.value === addForm.role)} onChange={(opt) => setAddForm({ ...addForm, role: opt.value })} />
                  </div>
                </Col>
                <Col size="12">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button color="primary" size="lg" disabled={addSaving} onClick={saveAdd}>
                        {addSaving ? <Spinner size="sm" /> : "Create Customer"}
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

        {/* Quick Edit Modal */}
        <Modal isOpen={editModal} className="modal-dialog-centered" size="md" toggle={() => setEditModal(false)}>
          <a href="#close" onClick={(ev) => { ev.preventDefault(); setEditModal(false); }} className="close"><Icon name="cross-sm" /></a>
          <ModalBody>
            <div className="p-2">
              <h5 className="title">Quick Edit — {editUser?.emailAddress}</h5>
              {editError && <div className="alert alert-danger mt-2">{editError}</div>}
              <Row className="gy-4 mt-2">
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-control" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="text" className="form-control" value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} />
                  </div>
                </Col>
                <Col size="6">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <RSelect options={roleSelectOpts} value={roleSelectOpts.find((o) => o.value === editForm.role)} onChange={(opt) => setEditForm({ ...editForm, role: opt.value })} />
                  </div>
                </Col>
                <Col size="12">
                  <div className="custom-control custom-switch">
                    <input type="checkbox" className="custom-control-input form-check-input" id="editActive" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                    <label className="custom-control-label form-check-label ms-2" htmlFor="editActive">Active</label>
                  </div>
                </Col>
                <Col size="12">
                  <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                    <li>
                      <Button color="primary" size="lg" disabled={editSaving} onClick={saveEdit}>
                        {editSaving ? <Spinner size="sm" /> : "Save Changes"}
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

        {/* Bulk Delete Confirmation */}
        <Modal isOpen={bulkDeleteModal} className="modal-dialog-centered" size="sm" toggle={() => setBulkDeleteModal(false)}>
          <ModalBody className="text-center py-4">
            <Icon name="alert-circle" className="nk-modal-icon icon-circle icon-circle-xxl ni-4x bg-danger" />
            <h5 className="mt-3">Delete {selectedIds.size} User{selectedIds.size !== 1 ? "s" : ""}?</h5>
            <p className="small text-muted">This will permanently remove the selected accounts. This cannot be undone.</p>
            <div className="mt-3">
              <Button color="danger" disabled={bulkDeleting} onClick={doBulkDelete}>
                {bulkDeleting ? <Spinner size="sm" /> : `Yes, Delete ${selectedIds.size}`}
              </Button>
              <Button className="ms-2 btn-dim" color="light" onClick={() => setBulkDeleteModal(false)}>Cancel</Button>
            </div>
          </ModalBody>
        </Modal>

        {/* Delete Confirmation */}
        <Modal isOpen={deleteModal} className="modal-dialog-centered" size="sm" toggle={() => setDeleteModal(false)}>
          <ModalBody className="text-center py-4">
            <Icon name="alert-circle" className="nk-modal-icon icon-circle icon-circle-xxl ni-4x bg-warning" />
            <h5 className="mt-3">Delete Customer?</h5>
            <p className="text-muted">{deleteTarget?.emailAddress}</p>
            <p className="small text-muted">This will deactivate the customer account.</p>
            <div className="mt-3">
              <Button color="danger" disabled={deleteLoading} onClick={doDelete}>
                {deleteLoading ? <Spinner size="sm" /> : "Yes, Delete"}
              </Button>
              <Button className="ms-2 btn-dim" color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
            </div>
          </ModalBody>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default AdminCustomerList;
