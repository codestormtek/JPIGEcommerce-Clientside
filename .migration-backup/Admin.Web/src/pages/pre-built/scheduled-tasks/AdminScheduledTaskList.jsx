import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, ModalHeader, Spinner, Input, Label, FormGroup } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button, RSelect,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const STATUS_COLORS = {
  succeeded: "success",
  failed: "danger",
  running: "info",
  pending: "secondary",
  skipped: "warning",
  cancelled: "light",
  retrying: "primary",
};

const SCHEDULE_LABELS = {
  cron: "Cron",
  once: "One-Time",
  interval: "Interval",
};

const ENABLED_FILTER = [
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
];

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never";

const fmtDuration = (ms) => {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const BLANK_FORM = {
  name: "", taskKey: "", description: "", category: "",
  scheduleType: "cron", cronExpression: "", intervalSeconds: "",
  timezone: "UTC", isEnabled: true, parametersJson: "",
  retryMaxAttempts: 0, retryDelaySeconds: 60, timeoutSeconds: 300,
  allowConcurrentRuns: false,
};

const AdminScheduledTaskList = () => {
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(20);
  const [sort, setSort] = useState("desc");
  const [sortField, setSortField] = useState("createdAt");

  const [tasks, setTasks] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [enabledFilter, setEnabledFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  const [taskTypes, setTaskTypes] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [categories, setCategories] = useState([]);

  const [formModal, setFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [historyModal, setHistoryModal] = useState(false);
  const [historyTask, setHistoryTask] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [detailExecution, setDetailExecution] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [runningId, setRunningId] = useState(null);

  const searchTimer = useRef(null);

  const loadTasks = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("page", String(overrides.page ?? currentPage));
      p.set("limit", String(itemPerPage));
      p.set("orderBy", overrides.sortField ?? sortField);
      p.set("order", overrides.sort ?? sort);
      if (overrides.search ?? searchText) p.set("search", overrides.search ?? searchText);
      if (overrides.isEnabled ?? enabledFilter) p.set("isEnabled", (overrides.isEnabled ?? enabledFilter)?.value ?? "");
      if (overrides.category ?? categoryFilter) p.set("category", (overrides.category ?? categoryFilter)?.value ?? "");
      if (overrides.lastStatus ?? statusFilter) p.set("lastStatus", (overrides.lastStatus ?? statusFilter)?.value ?? "");

      const res = await apiGet(`/admin/scheduled-tasks?${p.toString()}`);
      setTasks(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, sortField, searchText, enabledFilter, categoryFilter, statusFilter]);

  useEffect(() => { loadTasks(); }, [currentPage, sort, sortField, enabledFilter, categoryFilter, statusFilter]);

  useEffect(() => {
    apiGet("/admin/scheduled-tasks/meta/task-types").then((r) => setTaskTypes(r?.data ?? [])).catch(() => {});
    apiGet("/admin/scheduled-tasks/meta/timezones").then((r) => setTimezones(r?.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    const cats = [...new Set(tasks.map((t) => t.category).filter(Boolean))];
    setCategories(cats);
  }, [tasks]);

  const onSearch = (val) => {
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      loadTasks({ search: val, page: 1 });
    }, 400);
  };

  const onSort = (field) => {
    const newSort = sortField === field && sort === "asc" ? "desc" : "asc";
    setSortField(field);
    setSort(newSort);
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setFormError(null);
    setFormModal(true);
  };

  const openEdit = (task) => {
    setEditTarget(task);
    setForm({
      name: task.name || "",
      taskKey: task.taskKey || "",
      description: task.description || "",
      category: task.category || "",
      scheduleType: task.scheduleType || "cron",
      cronExpression: task.cronExpression || "",
      intervalSeconds: task.intervalSeconds || "",
      timezone: task.timezone || "UTC",
      isEnabled: task.isEnabled ?? true,
      parametersJson: task.parametersJson || "",
      retryMaxAttempts: task.retryMaxAttempts ?? 0,
      retryDelaySeconds: task.retryDelaySeconds ?? 60,
      timeoutSeconds: task.timeoutSeconds ?? 300,
      allowConcurrentRuns: task.allowConcurrentRuns ?? false,
    });
    setFormError(null);
    setFormModal(true);
  };

  const saveForm = async () => {
    setFormSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name,
        taskKey: form.taskKey,
        description: form.description || undefined,
        category: form.category || undefined,
        scheduleType: form.scheduleType,
        cronExpression: form.scheduleType === "cron" ? form.cronExpression : undefined,
        intervalSeconds: form.scheduleType === "interval" ? Number(form.intervalSeconds) || undefined : undefined,
        timezone: form.timezone,
        isEnabled: form.isEnabled,
        parametersJson: form.parametersJson || undefined,
        retryMaxAttempts: Number(form.retryMaxAttempts) || 0,
        retryDelaySeconds: Number(form.retryDelaySeconds) || 60,
        timeoutSeconds: Number(form.timeoutSeconds) || 300,
        allowConcurrentRuns: form.allowConcurrentRuns,
      };

      if (editTarget) {
        const { taskKey, ...updateBody } = body;
        await apiPatch(`/admin/scheduled-tasks/${editTarget.id}`, updateBody);
      } else {
        await apiPost("/admin/scheduled-tasks", body);
      }
      setFormModal(false);
      loadTasks();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const toggleEnabled = async (task) => {
    try {
      if (task.isEnabled) {
        await apiPatch(`/admin/scheduled-tasks/${task.id}/disable`);
      } else {
        await apiPatch(`/admin/scheduled-tasks/${task.id}/enable`);
      }
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = (task) => {
    setDeleteTarget(task);
    setDeleteModal(true);
  };

  const doDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiDelete(`/admin/scheduled-tasks/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      loadTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const runNow = async (task) => {
    setRunningId(task.id);
    try {
      await apiPost(`/admin/scheduled-tasks/${task.id}/run`, {});
      setTimeout(() => loadTasks(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTimeout(() => setRunningId(null), 2000);
    }
  };

  const openHistory = async (task) => {
    setHistoryTask(task);
    setHistoryPage(1);
    setHistoryModal(true);
    await loadHistory(task.id, 1);
  };

  const loadHistory = async (taskId, page) => {
    setHistoryLoading(true);
    try {
      const res = await apiGet(`/admin/scheduled-tasks/${taskId}/history?page=${page}&limit=15`);
      setHistoryData(res?.data ?? []);
      setHistoryTotal(res?.meta?.total ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openExecutionDetail = async (executionId) => {
    setDetailLoading(true);
    setDetailModal(true);
    try {
      const res = await apiGet(`/admin/scheduled-tasks/executions/${executionId}`);
      setDetailExecution(res?.data ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const taskTypeOptions = taskTypes.map((t) => ({ value: t.key, label: `${t.name} (${t.key})` }));
  const timezoneOptions = timezones.map((t) => ({ value: t, label: t }));
  const categoryOptions = categories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
  const statusOptions = ["succeeded", "failed", "running", "pending", "skipped"].map((s) => ({
    value: s, label: s.charAt(0).toUpperCase() + s.slice(1),
  }));

  return (
    <>
      <Head title="Scheduled Tasks" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">Scheduled Tasks</BlockTitle>
              <p className="text-soft">{totalItems} task{totalItems !== 1 ? "s" : ""} total</p>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button color="primary" onClick={openCreate}>
                  <Icon name="plus" />
                  <span>Add Task</span>
                </Button>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <Row className="g-3 mb-3">
            <Col md="3">
              <input
                className="form-control"
                placeholder="Search tasks..."
                value={searchText}
                onChange={(e) => onSearch(e.target.value)}
              />
            </Col>
            <Col md="2">
              <RSelect
                placeholder="Enabled"
                options={ENABLED_FILTER}
                value={enabledFilter}
                onChange={(v) => { setEnabledFilter(v); setCurrentPage(1); }}
                isClearable
              />
            </Col>
            <Col md="2">
              <RSelect
                placeholder="Category"
                options={categoryOptions}
                value={categoryFilter}
                onChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
                isClearable
              />
            </Col>
            <Col md="2">
              <RSelect
                placeholder="Last Status"
                options={statusOptions}
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                isClearable
              />
            </Col>
            <Col md="3" className="text-end">
              <Button size="sm" color="light" onClick={() => {
                setSearchText(""); setEnabledFilter(null); setCategoryFilter(null); setStatusFilter(null);
                setCurrentPage(1);
                loadTasks({ search: "", isEnabled: null, category: null, lastStatus: null, page: 1 });
              }}>
                <Icon name="undo" /> Reset
              </Button>
            </Col>
          </Row>

          {error && <div className="alert alert-danger mb-3">{error}</div>}

          <DataTable className="card-stretch">
            <DataTableBody compact>
              <DataTableHead>
                <DataTableRow><span onClick={() => onSort("name")} className="cursor-pointer">Name {sortField === "name" ? (sort === "asc" ? "↑" : "↓") : ""}</span></DataTableRow>
                <DataTableRow size="md"><span>Task Key</span></DataTableRow>
                <DataTableRow size="md"><span>Category</span></DataTableRow>
                <DataTableRow size="sm"><span>Schedule</span></DataTableRow>
                <DataTableRow size="md"><span>Enabled</span></DataTableRow>
                <DataTableRow size="lg"><span onClick={() => onSort("lastRunAt")} className="cursor-pointer">Last Run {sortField === "lastRunAt" ? (sort === "asc" ? "↑" : "↓") : ""}</span></DataTableRow>
                <DataTableRow size="lg"><span onClick={() => onSort("nextRunAt")} className="cursor-pointer">Next Run {sortField === "nextRunAt" ? (sort === "asc" ? "↑" : "↓") : ""}</span></DataTableRow>
                <DataTableRow size="sm"><span>Status</span></DataTableRow>
                <DataTableRow className="nk-tb-col-tools"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <div className="text-center py-4"><Spinner size="sm" /></div>
              ) : tasks.length === 0 ? (
                <div className="text-center text-soft py-4">No scheduled tasks found</div>
              ) : (
                tasks.map((task) => (
                  <DataTableItem key={task.id}>
                    <DataTableRow>
                      <span className="tb-lead">{task.name}</span>
                      {task.description && <span className="d-block text-soft fs-12px">{task.description.slice(0, 60)}{task.description.length > 60 ? "..." : ""}</span>}
                    </DataTableRow>
                    <DataTableRow size="md">
                      <code className="fs-12px">{task.taskKey}</code>
                    </DataTableRow>
                    <DataTableRow size="md">
                      {task.category ? <Badge color="outline-secondary" pill>{task.category}</Badge> : "—"}
                    </DataTableRow>
                    <DataTableRow size="sm">
                      <span className="fs-12px">
                        {SCHEDULE_LABELS[task.scheduleType] || task.scheduleType}
                        {task.cronExpression && <code className="d-block text-soft">{task.cronExpression}</code>}
                        {task.intervalSeconds && <span className="d-block text-soft">{task.intervalSeconds}s</span>}
                      </span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span
                        className={`cursor-pointer badge bg-${task.isEnabled ? "success" : "secondary"}`}
                        onClick={() => toggleEnabled(task)}
                        title={task.isEnabled ? "Click to disable" : "Click to enable"}
                        style={{ cursor: "pointer" }}
                      >
                        {task.isEnabled ? "ON" : "OFF"}
                      </span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span className="fs-12px">{fmtDateTime(task.lastRunAt)}</span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span className="fs-12px">{fmtDateTime(task.nextRunAt)}</span>
                    </DataTableRow>
                    <DataTableRow size="sm">
                      {task.lastStatus ? (
                        <Badge color={STATUS_COLORS[task.lastStatus] || "secondary"} pill>
                          {task.lastStatus}
                        </Badge>
                      ) : (
                        <span className="text-soft">—</span>
                      )}
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools">
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger">
                          <Icon name="more-h" />
                        </DropdownToggle>
                        <DropdownMenu end>
                          <ul className="link-list-opt no-bdr">
                            <li><DropdownItem tag="a" href="#edit" onClick={(e) => { e.preventDefault(); openEdit(task); }}><Icon name="edit" /><span>Edit</span></DropdownItem></li>
                            <li><DropdownItem tag="a" href="#toggle" onClick={(e) => { e.preventDefault(); toggleEnabled(task); }}><Icon name={task.isEnabled ? "pause" : "play"} /><span>{task.isEnabled ? "Disable" : "Enable"}</span></DropdownItem></li>
                            <li>
                              <DropdownItem tag="a" href="#run" onClick={(e) => { e.preventDefault(); runNow(task); }} disabled={runningId === task.id}>
                                <Icon name="reload" />
                                <span>{runningId === task.id ? "Running..." : "Run Now"}</span>
                              </DropdownItem>
                            </li>
                            <li><DropdownItem tag="a" href="#history" onClick={(e) => { e.preventDefault(); openHistory(task); }}><Icon name="list" /><span>History</span></DropdownItem></li>
                            <li className="divider" />
                            <li><DropdownItem tag="a" href="#delete" className="text-danger" onClick={(e) => { e.preventDefault(); confirmDelete(task); }}><Icon name="trash" /><span>Delete</span></DropdownItem></li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
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

        {/* ─── Create / Edit Modal ──────────────────────────────────────────── */}
        <Modal isOpen={formModal} toggle={() => setFormModal(false)} size="lg" className="modal-dialog-centered">
          <ModalHeader toggle={() => setFormModal(false)}>
            {editTarget ? "Edit Scheduled Task" : "Create Scheduled Task"}
          </ModalHeader>
          <ModalBody>
            {formError && <div className="alert alert-danger mb-3">{formError}</div>}
            <Row className="g-3">
              <Col md="6">
                <FormGroup>
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Task name" />
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label>Task Key *</Label>
                  {editTarget ? (
                    <Input value={form.taskKey} disabled />
                  ) : (
                    <RSelect
                      placeholder="Select handler..."
                      options={taskTypeOptions}
                      value={taskTypeOptions.find((o) => o.value === form.taskKey) || null}
                      onChange={(opt) => {
                        const tt = taskTypes.find((t) => t.key === opt?.value);
                        setForm({
                          ...form,
                          taskKey: opt?.value || "",
                          name: form.name || tt?.name || "",
                          description: form.description || tt?.description || "",
                          category: form.category || tt?.category || "",
                          cronExpression: form.cronExpression || tt?.defaultCron || "",
                        });
                      }}
                    />
                  )}
                </FormGroup>
              </Col>
              <Col md="12">
                <FormGroup>
                  <Label>Description</Label>
                  <Input type="textarea" rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. orders, reports" />
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>Schedule Type</Label>
                  <Input type="select" value={form.scheduleType} onChange={(e) => setForm({ ...form, scheduleType: e.target.value })}>
                    <option value="cron">Cron Expression</option>
                    <option value="interval">Interval (seconds)</option>
                    <option value="once">One-Time</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label>Timezone</Label>
                  <RSelect
                    options={timezoneOptions}
                    value={timezoneOptions.find((o) => o.value === form.timezone) || { value: "UTC", label: "UTC" }}
                    onChange={(opt) => setForm({ ...form, timezone: opt?.value || "UTC" })}
                  />
                </FormGroup>
              </Col>
              {form.scheduleType === "cron" && (
                <Col md="6">
                  <FormGroup>
                    <Label>Cron Expression</Label>
                    <Input value={form.cronExpression} onChange={(e) => setForm({ ...form, cronExpression: e.target.value })} placeholder="*/5 * * * *" />
                    <small className="text-soft">minute hour day month weekday</small>
                  </FormGroup>
                </Col>
              )}
              {form.scheduleType === "interval" && (
                <Col md="6">
                  <FormGroup>
                    <Label>Interval (seconds)</Label>
                    <Input type="number" value={form.intervalSeconds} onChange={(e) => setForm({ ...form, intervalSeconds: e.target.value })} placeholder="300" />
                  </FormGroup>
                </Col>
              )}
              <Col md="3">
                <FormGroup>
                  <Label>Max Retries</Label>
                  <Input type="number" value={form.retryMaxAttempts} onChange={(e) => setForm({ ...form, retryMaxAttempts: e.target.value })} min="0" />
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Retry Delay (s)</Label>
                  <Input type="number" value={form.retryDelaySeconds} onChange={(e) => setForm({ ...form, retryDelaySeconds: e.target.value })} min="1" />
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label>Timeout (s)</Label>
                  <Input type="number" value={form.timeoutSeconds} onChange={(e) => setForm({ ...form, timeoutSeconds: e.target.value })} min="1" />
                </FormGroup>
              </Col>
              <Col md="3" className="d-flex align-items-end pb-2">
                <FormGroup check>
                  <Input type="checkbox" id="allowConcurrent" checked={form.allowConcurrentRuns} onChange={(e) => setForm({ ...form, allowConcurrentRuns: e.target.checked })} />
                  <Label check for="allowConcurrent" className="ms-1">Allow Concurrent</Label>
                </FormGroup>
              </Col>
              <Col md="12">
                <FormGroup>
                  <Label>Parameters (JSON)</Label>
                  <Input type="textarea" rows="2" value={form.parametersJson} onChange={(e) => setForm({ ...form, parametersJson: e.target.value })} placeholder='{"key": "value"}' />
                </FormGroup>
              </Col>
              <Col md="12">
                <FormGroup check>
                  <Input type="checkbox" id="isEnabled" checked={form.isEnabled} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} />
                  <Label check for="isEnabled" className="ms-1">Enabled</Label>
                </FormGroup>
              </Col>
            </Row>
            <div className="mt-4 d-flex justify-content-end gap-2">
              <Button color="light" onClick={() => setFormModal(false)}>Cancel</Button>
              <Button color="primary" onClick={saveForm} disabled={formSaving || !form.name || !form.taskKey}>
                {formSaving ? <Spinner size="sm" /> : editTarget ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ─── Delete Confirm ───────────────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} className="modal-dialog-centered">
          <ModalBody className="modal-body-lg text-center">
            <div className="nk-modal">
              <Icon name="alert-circle" className="nk-modal-icon icon-circle icon-circle-xxl bg-danger" />
              <h4 className="nk-modal-title">Delete Task</h4>
              <div className="nk-modal-text">
                <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
              </div>
              <div className="nk-modal-action mt-3">
                <Button color="light" className="me-2" onClick={() => setDeleteModal(false)}>Cancel</Button>
                <Button color="danger" onClick={doDelete} disabled={deleteLoading}>
                  {deleteLoading ? <Spinner size="sm" /> : "Delete"}
                </Button>
              </div>
            </div>
          </ModalBody>
        </Modal>

        {/* ─── History Modal ────────────────────────────────────────────────── */}
        <Modal isOpen={historyModal} toggle={() => setHistoryModal(false)} size="lg" className="modal-dialog-centered">
          <ModalHeader toggle={() => setHistoryModal(false)}>
            Execution History — {historyTask?.name}
          </ModalHeader>
          <ModalBody>
            {historyLoading ? (
              <div className="text-center py-4"><Spinner size="sm" /></div>
            ) : historyData.length === 0 ? (
              <div className="text-center text-soft py-4">No executions yet</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Started</th>
                      <th>Duration</th>
                      <th>Trigger</th>
                      <th>Attempt</th>
                      <th>Message</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((ex) => (
                      <tr key={ex.id}>
                        <td><Badge color={STATUS_COLORS[ex.status] || "secondary"} pill>{ex.status}</Badge></td>
                        <td className="fs-12px">{fmtDateTime(ex.startedAt)}</td>
                        <td className="fs-12px">{fmtDuration(ex.durationMs)}</td>
                        <td className="fs-12px">{ex.triggeredByType}</td>
                        <td className="fs-12px">{ex.attemptNumber}</td>
                        <td className="fs-12px text-truncate" style={{ maxWidth: 200 }}>{ex.message || ex.errorMessage || "—"}</td>
                        <td>
                          <a href="#detail" onClick={(e) => { e.preventDefault(); openExecutionDetail(ex.id); }} className="text-primary fs-12px">
                            Details
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {historyTotal > 15 && (
              <div className="mt-2">
                <PaginationComponent
                  itemPerPage={15}
                  totalItems={historyTotal}
                  paginate={(p) => { setHistoryPage(p); loadHistory(historyTask.id, p); }}
                  currentPage={historyPage}
                />
              </div>
            )}
          </ModalBody>
        </Modal>

        {/* ─── Execution Detail Modal ───────────────────────────────────────── */}
        <Modal isOpen={detailModal} toggle={() => setDetailModal(false)} size="lg" className="modal-dialog-centered">
          <ModalHeader toggle={() => setDetailModal(false)}>
            Execution Detail
          </ModalHeader>
          <ModalBody>
            {detailLoading ? (
              <div className="text-center py-4"><Spinner size="sm" /></div>
            ) : !detailExecution ? (
              <div className="text-center text-soft py-4">Not found</div>
            ) : (
              <>
                <Row className="g-3 mb-3">
                  <Col md="4">
                    <strong className="d-block text-soft fs-12px">Status</strong>
                    <Badge color={STATUS_COLORS[detailExecution.status] || "secondary"} pill>{detailExecution.status}</Badge>
                  </Col>
                  <Col md="4">
                    <strong className="d-block text-soft fs-12px">Started</strong>
                    {fmtDateTime(detailExecution.startedAt)}
                  </Col>
                  <Col md="4">
                    <strong className="d-block text-soft fs-12px">Duration</strong>
                    {fmtDuration(detailExecution.durationMs)}
                  </Col>
                  <Col md="4">
                    <strong className="d-block text-soft fs-12px">Triggered By</strong>
                    {detailExecution.triggeredByType}{detailExecution.triggeredByUserId ? ` (${detailExecution.triggeredByUserId})` : ""}
                  </Col>
                  <Col md="4">
                    <strong className="d-block text-soft fs-12px">Attempt</strong>
                    {detailExecution.attemptNumber}
                  </Col>
                  <Col md="4">
                    <strong className="d-block text-soft fs-12px">Correlation ID</strong>
                    <code className="fs-12px">{detailExecution.correlationId || "—"}</code>
                  </Col>
                </Row>

                {detailExecution.message && (
                  <div className="mb-3">
                    <strong className="d-block text-soft fs-12px mb-1">Message</strong>
                    <p>{detailExecution.message}</p>
                  </div>
                )}

                {detailExecution.errorMessage && (
                  <div className="mb-3">
                    <strong className="d-block text-danger fs-12px mb-1">Error</strong>
                    <pre className="bg-light p-2 rounded fs-12px" style={{ maxHeight: 200, overflow: "auto" }}>
                      {detailExecution.errorMessage}
                      {detailExecution.errorStack && `\n\n${detailExecution.errorStack}`}
                    </pre>
                  </div>
                )}

                {detailExecution.logs && detailExecution.logs.length > 0 && (
                  <div>
                    <strong className="d-block text-soft fs-12px mb-1">Logs ({detailExecution.logs.length})</strong>
                    <div className="bg-light p-2 rounded" style={{ maxHeight: 300, overflow: "auto" }}>
                      {detailExecution.logs.map((log, i) => (
                        <div key={log.id || i} className="fs-12px mb-1">
                          <span className={`fw-bold text-${log.logLevel === "error" ? "danger" : log.logLevel === "warn" ? "warning" : "muted"}`}>
                            [{log.logLevel}]
                          </span>{" "}
                          <span className="text-soft">{fmtDateTime(log.createdAt)}</span>{" "}
                          {log.message}
                          {log.details && <pre className="ms-3 text-soft mb-0">{log.details}</pre>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </ModalBody>
        </Modal>
      </Content>
    </>
  );
};

export default AdminScheduledTaskList;
