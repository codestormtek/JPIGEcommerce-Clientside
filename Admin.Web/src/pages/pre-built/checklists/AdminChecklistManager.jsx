import React, { useState, useEffect, useRef, useCallback } from "react";
import { Spinner, Progress, Input, Badge } from "reactstrap";
import {
  Block, BlockHead, BlockHeadContent, BlockTitle, BlockDes,
  Icon, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = "checklists-data";
const lsLoad = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; } };
const lsSave = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data));

// ─── SortableTask row ─────────────────────────────────────────────────────────

function SortableTask({ task, onChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="d-flex align-items-center gap-2 py-2 border-bottom">
      {/* Drag handle — hidden when printing */}
      <span
        {...attributes}
        {...listeners}
        className="text-muted cursor-grab print-hide"
        style={{ touchAction: "none" }}
        title="Drag to reorder"
      >
        <Icon name="menu" />
      </span>

      {/* Checkbox */}
      <input
        type="checkbox"
        className="form-check-input mt-0"
        checked={task.done}
        onChange={(e) => onChange(task.id, "done", e.target.checked)}
      />

      {/* Text */}
      <Input
        bsSize="sm"
        className={`border-0 shadow-none flex-grow-1 ${task.done ? "text-decoration-line-through text-muted" : ""}`}
        value={task.text}
        placeholder="Task description…"
        onChange={(e) => onChange(task.id, "text", e.target.value)}
      />

      {/* Delete — hidden when printing */}
      <button
        type="button"
        className="btn btn-trigger btn-icon text-danger print-hide"
        onClick={() => onDelete(task.id)}
        title="Remove task"
      >
        <Icon name="trash" />
      </button>
    </div>
  );
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function ChecklistDetailView({ checklist, onBack, onSaved }) {
  const [name, setName]     = useState(checklist.name);
  const [tasks, setTasks]   = useState(checklist.tasks ?? []);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);
  const nextPos = useRef(tasks.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Auto-save to localStorage on any change
  useEffect(() => {
    const ls = lsLoad() ?? [];
    const idx = ls.findIndex((c) => c.id === checklist.id);
    const updated = { ...checklist, name, tasks };
    if (idx >= 0) ls[idx] = updated; else ls.push(updated);
    lsSave(ls);
  }, [name, tasks]);  // eslint-disable-line

  const onTaskChange = useCallback((id, field, val) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: val } : t)));
  }, []);

  const onTaskDelete = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addTask = () => {
    const tempId = `temp-${Date.now()}`;
    setTasks((prev) => [...prev, { id: tempId, text: "", done: false, position: nextPos.current++ }]);
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setTasks((prev) => {
      const oldIdx = prev.findIndex((t) => t.id === active.id);
      const newIdx = prev.findIndex((t) => t.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((t, i) => ({ ...t, position: i }));
    });
  };

  const saveToDb = async () => {
    setSaving(true);
    try {
      await apiPost(`/checklists/${checklist.id}/sync`, {
        name,
        tasks: tasks.map((t, i) => ({ text: t.text, done: t.done, position: i })),
      });
      setToast("Saved!");
      const fresh = await apiGet(`/checklists/${checklist.id}`);
      if (fresh?.data) { setTasks(fresh.data.tasks ?? []); onSaved(fresh.data); }
    } catch (e) {
      setToast("Save failed: " + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const done  = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      {/* Toolbar */}
      <BlockHead size="sm" className="print-hide">
        <BlockHeadContent>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <button type="button" className="btn btn-outline-light" onClick={onBack}>
              <Icon name="arrow-left" /> All Lists
            </button>
            <div className="d-flex gap-2">
              {toast && <Badge color={toast.startsWith("Save failed") ? "danger" : "success"} className="align-self-center">{toast}</Badge>}
              <Button color="light" outline onClick={() => window.print()}>
                <Icon name="printer" /> Print
              </Button>
              <Button color="primary" onClick={saveToDb} disabled={saving}>
                {saving ? <Spinner size="sm" /> : <><Icon name="save" /> Save</>}
              </Button>
            </div>
          </div>
        </BlockHeadContent>
      </BlockHead>

      <Block>
        <div className="card card-bordered">
          <div className="card-inner">
            {/* Editable title */}
            <Input
              className="h4 border-0 shadow-none fw-bold mb-2 px-0"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="List name…"
              style={{ fontSize: "1.25rem" }}
            />

            {/* Progress */}
            <div className="d-flex align-items-center gap-3 mb-3">
              <Progress value={pct} color="primary" className="flex-grow-1" style={{ height: 8 }} />
              <small className="text-soft text-nowrap">{done}/{total} done ({pct}%)</small>
            </div>

            {/* Task list */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((task) => (
                  <SortableTask key={task.id} task={task} onChange={onTaskChange} onDelete={onTaskDelete} />
                ))}
              </SortableContext>
            </DndContext>

            {/* Add task */}
            <button
              type="button"
              className="btn btn-dashed w-100 mt-3 print-hide"
              style={{ borderStyle: "dashed" }}
              onClick={addTask}
            >
              <Icon name="plus" /> Add Task
            </button>
          </div>
        </div>
      </Block>
    </>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────

function ChecklistHomeScreen({ checklists, loading, onCreate, onOpen, onDelete }) {
  return (
    <>
      <BlockHead size="sm">
        <BlockHeadContent>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <BlockTitle page>My Checklists</BlockTitle>
              <BlockDes className="text-soft">Create and manage multiple task lists.</BlockDes>
            </div>
            <Button color="primary" onClick={onCreate} className="print-hide">
              <Icon name="plus" /> New List
            </Button>
          </div>
        </BlockHeadContent>
      </BlockHead>

      {loading ? (
        <div className="text-center py-5"><Spinner color="primary" /></div>
      ) : (
        <Block>
          {checklists.length === 0 ? (
            <div className="text-center text-muted py-5">
              <Icon name="list-check" style={{ fontSize: 48 }} />
              <p className="mt-3">No checklists yet. Click <strong>New List</strong> to create one.</p>
            </div>
          ) : (
            <div className="row g-3">
              {checklists.map((cl) => {
                const total = cl.tasks?.length ?? 0;
                const done  = cl.tasks?.filter((t) => t.done).length ?? 0;
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={cl.id} className="col-sm-6 col-md-4 col-xl-3">
                    <div
                      className="card h-100 border card-bordered checklist-card position-relative"
                      style={{ cursor: "pointer" }}
                      onClick={() => onOpen(cl)}
                    >
                      <div className="card-inner">
                        <h6 className="mb-1 text-truncate">{cl.name}</h6>
                        <p className="text-soft small mb-2">{done}/{total} tasks done</p>
                        <Progress value={pct} color="primary" style={{ height: 6 }} />
                      </div>
                      {/* Delete hover button */}
                      <button
                        type="button"
                        className="btn btn-trigger btn-icon text-danger position-absolute top-0 end-0 m-1 print-hide checklist-delete-btn"
                        onClick={(e) => { e.stopPropagation(); onDelete(cl.id); }}
                        title="Delete list"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Block>
      )}
    </>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

const AdminChecklistManager = () => {
  const [view, setView]               = useState("home");
  const [checklists, setChecklists]   = useState([]);
  const [active, setActive]           = useState(null);
  const [loading, setLoading]         = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/checklists?limit=100&orderBy=updatedAt&order=desc");
      const rows = res?.data ?? [];
      setChecklists(rows);
      lsSave(rows);
    } catch {
      const cached = lsLoad();
      if (cached) setChecklists(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    try {
      const res = await apiPost("/checklists", { name: "Untitled List" });
      const created = res?.data;
      if (created) { setChecklists((p) => [created, ...p]); setActive(created); setView("detail"); }
    } catch (e) { alert("Could not create: " + e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this checklist and all its tasks?")) return;
    try {
      await apiDelete(`/checklists/${id}`);
      setChecklists((p) => p.filter((c) => c.id !== id));
      lsSave((lsLoad() ?? []).filter((c) => c.id !== id));
    } catch (e) { alert("Could not delete: " + e.message); }
  };

  const handleOpen  = (cl) => { setActive(cl); setView("detail"); };
  const handleBack  = () => { setView("home"); fetchAll(); };
  const handleSaved = (updated) => {
    setChecklists((p) => p.map((c) => (c.id === updated.id ? updated : c)));
    setActive(updated);
  };

  return (
    <React.Fragment>
      <Head title="Checklists" />
      <Content>
        {view === "home" ? (
          <ChecklistHomeScreen
            checklists={checklists} loading={loading}
            onCreate={handleCreate} onOpen={handleOpen} onDelete={handleDelete}
          />
        ) : (
          <ChecklistDetailView checklist={active} onBack={handleBack} onSaved={handleSaved} />
        )}
      </Content>
    </React.Fragment>
  );
};

export default AdminChecklistManager;
