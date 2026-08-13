import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, Spinner, Badge } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Button,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { value: "text",    label: "Text / Info",     icon: "file-text",     hint: "General information, how something works" },
  { value: "steps",   label: "Step-by-Step",    icon: "list-ol",       hint: "Numbered instructions; each step can have a photo" },
  { value: "tip",     label: "Tip",             icon: "bulb",          hint: "Pro tip or best practice callout" },
  { value: "warning", label: "Warning / Safety", icon: "alert-circle", hint: "Safety notice or caution callout" },
  { value: "image",   label: "Photo / Diagram", icon: "img",           hint: "Standalone photo with a caption" },
];
const blockTypeMeta = (t) => BLOCK_TYPES.find((b) => b.value === t) || BLOCK_TYPES[0];

const SECTION_ICONS = ["book", "setting", "fire", "truck", "home", "grid-alt", "tool" , "shield-check", "alert-circle", "bulb", "clipboard-check", "coffee", "box", "activity"];

// ─── Small helpers ───────────────────────────────────────────────────────────

const flattenTree = (nodes, depth = 0, out = []) => {
  (nodes || []).forEach((n) => {
    out.push({ ...n, depth });
    flattenTree(n.children, depth + 1, out);
  });
  return out;
};

const findNode = (nodes, id) => {
  for (const n of nodes || []) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
};

const numberFor = (nodes, id) => {
  // Hierarchical numbering, e.g. "2.1.3"
  const walk = (list, prefix) => {
    for (let i = 0; i < list.length; i++) {
      const num = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      if (list[i].id === id) return num;
      const hit = walk(list[i].children || [], num);
      if (hit) return hit;
    }
    return null;
  };
  return walk(nodes, "");
};

// ─── Image upload field (shared by blocks & steps) ───────────────────────────

const ImageField = ({ value, caption, onChange, onCaptionChange, compact }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const pick = () => inputRef.current?.click();
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiUpload("/guides/upload", fd);
      const asset = res?.data ?? res;
      onChange(asset.url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={handleFile} />
      {value ? (
        <div className="d-flex align-items-start gap-2">
          <img src={value} alt="" style={{ width: compact ? 90 : 140, height: compact ? 64 : 100, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e9f2" }} />
          <div className="flex-grow-1">
            <input
              className="form-control form-control-sm mb-1"
              placeholder="Photo caption (optional)"
              value={caption || ""}
              onChange={(e) => onCaptionChange(e.target.value)}
            />
            <div className="d-flex gap-1">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={pick} disabled={uploading}>
                {uploading ? <Spinner size="sm" /> : <><Icon name="upload" className="me-1" />Replace</>}
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { onChange(null); onCaptionChange(""); }}>
                <Icon name="trash" className="me-1" />Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-sm btn-dim btn-outline-secondary" onClick={pick} disabled={uploading}>
          {uploading ? <Spinner size="sm" /> : <><Icon name="img" className="me-1" />Add photo</>}
        </button>
      )}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
};

// ─── Block renderer (view mode) ──────────────────────────────────────────────

const CALLOUT_STYLES = {
  tip:     { bg: "#f0f9f1", border: "#1ee0ac", icon: "bulb",         label: "TIP" },
  warning: { bg: "#fdf3f3", border: "#e85347", icon: "alert-circle", label: "WARNING" },
};

const BlockView = ({ block }) => {
  const [lightbox, setLightbox] = useState(null); // url

  const img = (url, cap, maxH = 340) => (
    <figure className="mt-2 mb-0">
      <img
        src={url} alt={cap || ""}
        style={{ maxWidth: "100%", maxHeight: maxH, borderRadius: 8, border: "1px solid #e5e9f2", cursor: "zoom-in" }}
        onClick={() => setLightbox(url)}
      />
      {cap && <figcaption className="small text-muted mt-1">{cap}</figcaption>}
    </figure>
  );

  let body;
  if (block.type === "steps") {
    body = (
      <>
      {block.body && <p className="mb-2" style={{ whiteSpace: "pre-wrap" }}>{block.body}</p>}
      <ol className="ps-0 mb-0" style={{ listStyle: "none", counterReset: "step" }}>
        {(block.steps || []).map((s, i) => (
          <li key={s.id} className="d-flex mb-3">
            <div
              className="flex-shrink-0 d-flex align-items-center justify-content-center fw-bold text-white"
              style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#854fff", fontSize: 13, marginRight: 12, marginTop: 2 }}
            >
              {i + 1}
            </div>
            <div className="flex-grow-1">
              <div style={{ whiteSpace: "pre-wrap" }}>{s.text}</div>
              {s.imageUrl && img(s.imageUrl, s.imageCaption, 260)}
            </div>
          </li>
        ))}
        {(block.steps || []).length === 0 && <li className="text-muted fst-italic small">No steps added yet.</li>}
      </ol>
      </>
    );
  } else if (block.type === "tip" || block.type === "warning") {
    const st = CALLOUT_STYLES[block.type];
    body = (
      <div className="p-3 rounded" style={{ backgroundColor: st.bg, borderLeft: `4px solid ${st.border}` }}>
        <div className="fw-bold small mb-1" style={{ color: st.border, letterSpacing: 1 }}>
          <Icon name={st.icon} className="me-1" />{st.label}{block.title ? ` — ${block.title}` : ""}
        </div>
        <div style={{ whiteSpace: "pre-wrap" }}>{block.body}</div>
        {block.imageUrl && img(block.imageUrl, block.imageCaption)}
      </div>
    );
  } else if (block.type === "image") {
    body = (
      <div>
        {block.imageUrl ? img(block.imageUrl, block.imageCaption || block.title, 420)
          : <div className="text-muted fst-italic small">No photo uploaded yet.</div>}
      </div>
    );
  } else {
    body = (
      <div>
        <div style={{ whiteSpace: "pre-wrap" }}>{block.body}</div>
        {block.imageUrl && img(block.imageUrl, block.imageCaption)}
      </div>
    );
  }

  return (
    <div className="mb-4">
      {block.title && block.type !== "tip" && block.type !== "warning" && (
        <h6 className="mb-2">{block.title}</h6>
      )}
      {body}
      {lightbox && (
        <Modal isOpen toggle={() => setLightbox(null)} size="xl" centered>
          <ModalBody className="text-center p-2">
            <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "82vh" }} onClick={() => setLightbox(null)} />
          </ModalBody>
        </Modal>
      )}
    </div>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

const AdminUserGuide = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Section modal
  const [sectionModal, setSectionModal] = useState(null); // { mode: 'create'|'edit', section?, parentId? }
  const [sectionForm, setSectionForm] = useState({ title: "", description: "", icon: "", parentId: "" });

  // Block modal
  const [blockModal, setBlockModal] = useState(null); // { mode, sectionId, block? }
  const [blockForm, setBlockForm] = useState({ type: "text", title: "", body: "", imageUrl: null, imageCaption: "" });

  // Step modal
  const [stepModal, setStepModal] = useState(null); // { mode, blockId, step? }
  const [stepForm, setStepForm] = useState({ text: "", imageUrl: null, imageCaption: "" });

  const [confirmDelete, setConfirmDelete] = useState(null); // { kind, id, label }

  const load = useCallback(async (keepSelection = true) => {
    try {
      setLoadError(null);
      const res = await apiGet("/guides");
      const data = res?.data ?? res ?? [];
      setTree(data);
      setSelectedId((cur) => {
        if (keepSelection && cur && findNode(data, cur)) return cur;
        return data[0]?.id ?? null;
      });
    } catch (e) {
      setLoadError(e.message || "Failed to load guide");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flat = useMemo(() => flattenTree(tree), [tree]);
  const selected = useMemo(() => findNode(tree, selectedId), [tree, selectedId]);
  const selectedNumber = useMemo(() => (selectedId ? numberFor(tree, selectedId) : null), [tree, selectedId]);

  const searchLower = search.trim().toLowerCase();
  const matchesSearch = (node) => {
    if (!searchLower) return true;
    const hay = [node.title, node.description, ...(node.blocks || []).flatMap((b) => [b.title, b.body, ...(b.steps || []).map((s) => s.text)])]
      .filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(searchLower)) return true;
    return (node.children || []).some(matchesSearch);
  };

  const run = async (fn) => {
    setBusy(true); setActionError(null);
    try { await fn(); await load(); }
    catch (e) { setActionError(e.message || "Something went wrong"); }
    finally { setBusy(false); }
  };

  // ── Section CRUD ──
  const openCreateSection = (parentId = "") => {
    setSectionForm({ title: "", description: "", icon: "", parentId: parentId || "" });
    setSectionModal({ mode: "create" });
  };
  const openEditSection = (section) => {
    setSectionForm({ title: section.title, description: section.description || "", icon: section.icon || "", parentId: section.parentId || "" });
    setSectionModal({ mode: "edit", section });
  };
  const saveSection = () => run(async () => {
    const payload = {
      title: sectionForm.title.trim(),
      description: sectionForm.description.trim() || null,
      icon: sectionForm.icon || null,
      parentId: sectionForm.parentId || null,
    };
    if (!payload.title) throw new Error("Title is required");
    if (sectionModal.mode === "create") {
      const res = await apiPost("/guides/sections", payload);
      const created = res?.data ?? res;
      if (created?.id) setSelectedId(created.id);
    } else {
      await apiPatch(`/guides/sections/${sectionModal.section.id}`, payload);
    }
    setSectionModal(null);
  });

  const moveSection = (section, dir) => run(async () => {
    // Reorder among siblings
    const siblings = section.parentId
      ? (findNode(tree, section.parentId)?.children || [])
      : tree;
    const ids = siblings.map((s) => s.id);
    const i = ids.indexOf(section.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await apiPost("/guides/sections/reorder", { ids });
  });

  // ── Block CRUD ──
  const openCreateBlock = (sectionId, type = "text") => {
    setBlockForm({ type, title: "", body: "", imageUrl: null, imageCaption: "" });
    setBlockModal({ mode: "create", sectionId });
  };
  const openEditBlock = (sectionId, block) => {
    setBlockForm({ type: block.type, title: block.title || "", body: block.body || "", imageUrl: block.imageUrl || null, imageCaption: block.imageCaption || "" });
    setBlockModal({ mode: "edit", sectionId, block });
  };
  const saveBlock = () => run(async () => {
    const payload = {
      type: blockForm.type,
      title: blockForm.title.trim() || null,
      body: blockForm.body.trim() || null,
      imageUrl: blockForm.imageUrl || null,
      imageCaption: blockForm.imageCaption.trim() || null,
    };
    if (blockModal.mode === "create") {
      await apiPost(`/guides/sections/${blockModal.sectionId}/blocks`, payload);
    } else {
      await apiPatch(`/guides/blocks/${blockModal.block.id}`, payload);
    }
    setBlockModal(null);
  });

  const moveBlock = (section, block, dir) => run(async () => {
    const ids = (section.blocks || []).map((b) => b.id);
    const i = ids.indexOf(block.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await apiPost(`/guides/sections/${section.id}/blocks/reorder`, { ids });
  });

  // ── Step CRUD ──
  const openCreateStep = (blockId) => {
    setStepForm({ text: "", imageUrl: null, imageCaption: "" });
    setStepModal({ mode: "create", blockId });
  };
  const openEditStep = (blockId, step) => {
    setStepForm({ text: step.text, imageUrl: step.imageUrl || null, imageCaption: step.imageCaption || "" });
    setStepModal({ mode: "edit", blockId, step });
  };
  const saveStep = () => run(async () => {
    const payload = {
      text: stepForm.text.trim(),
      imageUrl: stepForm.imageUrl || null,
      imageCaption: stepForm.imageCaption.trim() || null,
    };
    if (!payload.text) throw new Error("Step text is required");
    if (stepModal.mode === "create") {
      await apiPost(`/guides/blocks/${stepModal.blockId}/steps`, payload);
    } else {
      await apiPatch(`/guides/steps/${stepModal.step.id}`, payload);
    }
    setStepModal(null);
  });

  const moveStep = (block, step, dir) => run(async () => {
    const ids = (block.steps || []).map((s) => s.id);
    const i = ids.indexOf(step.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await apiPost(`/guides/blocks/${block.id}/steps/reorder`, { ids });
  });

  // ── Delete ──
  const doDelete = () => run(async () => {
    const { kind, id } = confirmDelete;
    if (kind === "section") await apiDelete(`/guides/sections/${id}`);
    if (kind === "block") await apiDelete(`/guides/blocks/${id}`);
    if (kind === "step") await apiDelete(`/guides/steps/${id}`);
    setConfirmDelete(null);
  });

  // ── TOC rendering ──
  const renderToc = (nodes, nested = false) => (
    <ul className="list-unstyled mb-0" style={{ paddingLeft: nested ? 16 : 0 }}>
      {nodes.filter(matchesSearch).map((node) => {
        const num = numberFor(tree, node.id); // canonical numbering even when search filters siblings
        const active = node.id === selectedId;
        return (
          <li key={node.id}>
            <div
              className={`d-flex align-items-center px-2 py-1 rounded ${active ? "bg-primary text-white" : ""}`}
              style={{ cursor: "pointer", fontSize: 13.5 }}
              onClick={() => setSelectedId(node.id)}
            >
              <span className={`fw-bold me-2 ${active ? "" : "text-muted"}`} style={{ minWidth: 26, fontSize: 12 }}>{num}</span>
              {node.icon && <Icon name={node.icon} className="me-1" />}
              <span className="text-truncate flex-grow-1">{node.title}</span>
              {!node.isPublished && <Badge color="light" className="ms-1 text-dark" pill style={{ fontSize: 9 }}>draft</Badge>}
              {editMode && (
                <span className="d-flex ms-1" onClick={(e) => e.stopPropagation()}>
                  <button className={`btn btn-xs p-0 px-1 border-0 ${active ? "text-white" : "text-muted"}`} title="Move up" onClick={() => moveSection(node, -1)}><Icon name="chevron-up" /></button>
                  <button className={`btn btn-xs p-0 px-1 border-0 ${active ? "text-white" : "text-muted"}`} title="Move down" onClick={() => moveSection(node, 1)}><Icon name="chevron-down" /></button>
                </span>
              )}
            </div>
            {(node.children || []).length > 0 && renderToc(node.children, true)}
            {editMode && (
              <div style={{ paddingLeft: 28 }}>
                <button className="btn btn-xs border-0 text-primary p-0 mb-1" style={{ fontSize: 11.5 }} onClick={() => openCreateSection(node.id)}>
                  <Icon name="plus-sm" />add subsection
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  // ── Edit-mode block card ──
  const renderEditBlock = (section, block, idx) => {
    const meta = blockTypeMeta(block.type);
    return (
      <div key={block.id} className="mb-3 p-3 rounded" style={{ border: "1px solid #e5e9f2", backgroundColor: "#fff" }}>
        <div className="d-flex align-items-center mb-2">
          <Badge color="outline-secondary" className="me-2"><Icon name={meta.icon} className="me-1" />{meta.label}</Badge>
          {block.title && <strong className="me-auto">{block.title}</strong>}
          <div className="ms-auto d-flex gap-1">
            <button className="btn btn-xs btn-outline-light" title="Move up" disabled={idx === 0} onClick={() => moveBlock(section, block, -1)}><Icon name="chevron-up" /></button>
            <button className="btn btn-xs btn-outline-light" title="Move down" disabled={idx === (section.blocks || []).length - 1} onClick={() => moveBlock(section, block, 1)}><Icon name="chevron-down" /></button>
            <button className="btn btn-xs btn-outline-primary" onClick={() => openEditBlock(section.id, block)}><Icon name="edit" /></button>
            <button className="btn btn-xs btn-outline-danger" onClick={() => setConfirmDelete({ kind: "block", id: block.id, label: block.title || meta.label })}><Icon name="trash" /></button>
          </div>
        </div>
        <BlockView block={block} />
        {block.type === "steps" && (
          <div className="mt-1">
            {(block.steps || []).map((s, si) => (
              <div key={s.id} className="d-flex align-items-center small py-1 px-2 rounded mb-1" style={{ backgroundColor: "#f8f9fa" }}>
                <span className="text-muted me-2 fw-bold">{si + 1}.</span>
                <span className="text-truncate flex-grow-1">{s.text}</span>
                {s.imageUrl && <Icon name="img" className="text-muted mx-1" />}
                <button className="btn btn-xs border-0 text-muted" disabled={si === 0} onClick={() => moveStep(block, s, -1)}><Icon name="chevron-up" /></button>
                <button className="btn btn-xs border-0 text-muted" disabled={si === (block.steps || []).length - 1} onClick={() => moveStep(block, s, 1)}><Icon name="chevron-down" /></button>
                <button className="btn btn-xs border-0 text-primary" onClick={() => openEditStep(block.id, s)}><Icon name="edit" /></button>
                <button className="btn btn-xs border-0 text-danger" onClick={() => setConfirmDelete({ kind: "step", id: s.id, label: `step ${si + 1}` })}><Icon name="trash" /></button>
              </div>
            ))}
            <button className="btn btn-sm btn-dim btn-outline-primary mt-1" onClick={() => openCreateStep(block.id)}>
              <Icon name="plus" className="me-1" />Add step
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Head title="User Guide" />
        <Content>
          <div className="text-center py-5"><Spinner color="primary" /></div>
        </Content>
      </>
    );
  }

  return (
    <>
      <Head title="User Guide" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>BBQ Rig User Guide</BlockTitle>
              <BlockDes className="text-soft"><p>Operating manual for equipment and features — sections, steps, and photos.</p></BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="d-flex gap-2">
                {editMode && (
                  <Button color="primary" onClick={() => openCreateSection("")}>
                    <Icon name="plus" className="me-1" />New Section
                  </Button>
                )}
                <Button color={editMode ? "secondary" : "light"} outline={!editMode} onClick={() => setEditMode((v) => !v)}>
                  <Icon name={editMode ? "eye" : "edit"} className="me-1" />{editMode ? "Done Editing" : "Edit Guide"}
                </Button>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {loadError && <div className="alert alert-danger">{loadError}</div>}
        {actionError && <div className="alert alert-danger py-2">{actionError}</div>}

        <Block>
          <div className="row g-gs">
            {/* ── Table of contents ── */}
            <div className="col-lg-4 col-xl-3">
              <div className="card card-bordered h-100">
                <div className="card-inner p-3">
                  <div className="d-flex align-items-center mb-2">
                    <h6 className="mb-0 me-auto"><Icon name="list" className="me-1" />Contents</h6>
                    {busy && <Spinner size="sm" />}
                  </div>
                  <div className="form-control-wrap mb-2">
                    <div className="form-icon form-icon-left"><Icon name="search" /></div>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Search the guide…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {tree.length === 0 ? (
                    <div className="text-muted small fst-italic py-3">
                      No sections yet.{" "}
                      {editMode
                        ? <button className="btn btn-link btn-sm p-0" onClick={() => openCreateSection("")}>Create your first section</button>
                        : "Click \u201CEdit Guide\u201D to start building."}
                    </div>
                  ) : renderToc(tree)}
                  {editMode && tree.length > 0 && (
                    <button className="btn btn-sm btn-dim btn-outline-primary mt-2 w-100" onClick={() => openCreateSection("")}>
                      <Icon name="plus" className="me-1" />Add top-level section
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Content pane ── */}
            <div className="col-lg-8 col-xl-9">
              {!selected ? (
                <div className="card card-bordered">
                  <div className="card-inner text-center py-5 text-muted">
                    <Icon name="book" style={{ fontSize: 42 }} />
                    <p className="mt-2 mb-0">Select a section from the table of contents{editMode ? " or create one to get started" : ""}.</p>
                  </div>
                </div>
              ) : (
                <div className="card card-bordered">
                  <div className="card-inner">
                    {/* Breadcrumb */}
                    <div className="small text-muted mb-1">
                      {(() => {
                        const crumbs = [];
                        let cur = selected;
                        while (cur?.parentId) {
                          const p = flat.find((f) => f.id === cur.parentId);
                          if (!p) break;
                          crumbs.unshift(p);
                          cur = p;
                        }
                        return crumbs.length
                          ? crumbs.map((c) => (
                              <span key={c.id}>
                                <a href="#!" onClick={(e) => { e.preventDefault(); setSelectedId(c.id); }}>{c.title}</a>
                                <Icon name="chevron-right" className="mx-1" />
                              </span>
                            ))
                          : null;
                      })()}
                    </div>

                    <div className="d-flex align-items-start mb-1">
                      <h4 className="mb-0 me-auto">
                        <span className="text-primary me-2">{selectedNumber}</span>
                        {selected.icon && <Icon name={selected.icon} className="me-1" />}
                        {selected.title}
                      </h4>
                      {editMode && (
                        <div className="d-flex gap-1 flex-shrink-0">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openEditSection(selected)}><Icon name="edit" className="me-1" />Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDelete({ kind: "section", id: selected.id, label: `"${selected.title}" (including all subsections and content)` })}><Icon name="trash" /></button>
                        </div>
                      )}
                    </div>
                    {selected.description && <p className="text-soft mb-3">{selected.description}</p>}
                    <hr className="my-3" />

                    {/* Blocks */}
                    {editMode ? (
                      <>
                        {(selected.blocks || []).map((b, i) => renderEditBlock(selected, b, i))}
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {BLOCK_TYPES.map((bt) => (
                            <button key={bt.value} className="btn btn-sm btn-dim btn-outline-primary" title={bt.hint} onClick={() => openCreateBlock(selected.id, bt.value)}>
                              <Icon name={bt.icon} className="me-1" />{bt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        {(selected.blocks || []).length === 0 && (selected.children || []).length === 0 && (
                          <div className="text-muted fst-italic">Nothing here yet.</div>
                        )}
                        {(selected.blocks || []).map((b) => <BlockView key={b.id} block={b} />)}
                      </>
                    )}

                    {/* Subsection links */}
                    {(selected.children || []).length > 0 && (
                      <div className="mt-4">
                        <h6 className="text-muted small mb-2" style={{ letterSpacing: 1 }}>IN THIS SECTION</h6>
                        <div className="row g-2">
                          {selected.children.map((c) => (
                            <div className="col-sm-6" key={c.id}>
                              <div
                                className="p-2 px-3 rounded d-flex align-items-center"
                                style={{ border: "1px solid #e5e9f2", cursor: "pointer" }}
                                onClick={() => setSelectedId(c.id)}
                              >
                                <span className="text-primary fw-bold me-2">{numberFor(tree, c.id)}</span>
                                {c.icon && <Icon name={c.icon} className="me-1" />}
                                <span className="text-truncate">{c.title}</span>
                                <Icon name="chevron-right" className="ms-auto text-muted" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Block>
      </Content>

      {/* ── Section modal ── */}
      <Modal isOpen={!!sectionModal} toggle={() => setSectionModal(null)}>
        <ModalBody>
          <h5 className="mb-3">{sectionModal?.mode === "create" ? "New Section" : "Edit Section"}</h5>
          <div className="form-group mb-2">
            <label className="form-label">Title *</label>
            <input className="form-control" value={sectionForm.title} autoFocus
              onChange={(e) => setSectionForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Smoker Operation, Trailer Hookup, Propane System" />
          </div>
          <div className="form-group mb-2">
            <label className="form-label">Summary</label>
            <textarea className="form-control" rows={2} value={sectionForm.description}
              onChange={(e) => setSectionForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description shown under the heading (optional)" />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label">Parent section</label>
              <select className="form-select form-select-sm" value={sectionForm.parentId}
                onChange={(e) => setSectionForm((f) => ({ ...f, parentId: e.target.value }))}>
                <option value="">— Top level —</option>
                {flat
                  .filter((s) => !(sectionModal?.mode === "edit" && (s.id === sectionModal.section?.id)))
                  .map((s) => <option key={s.id} value={s.id}>{"\u00A0\u00A0".repeat(s.depth)}{s.title}</option>)}
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Icon</label>
              <select className="form-select form-select-sm" value={sectionForm.icon}
                onChange={(e) => setSectionForm((f) => ({ ...f, icon: e.target.value }))}>
                <option value="">None</option>
                {SECTION_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setSectionModal(null)}>Cancel</Button>
            <Button color="primary" disabled={busy || !sectionForm.title.trim()} onClick={saveSection}>
              {busy ? <Spinner size="sm" /> : "Save"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* ── Block modal ── */}
      <Modal isOpen={!!blockModal} toggle={() => setBlockModal(null)} size="lg">
        <ModalBody>
          <h5 className="mb-3">{blockModal?.mode === "create" ? "Add Content" : "Edit Content"}</h5>
          <div className="mb-3">
            <label className="form-label d-block">Type</label>
            <div className="d-flex flex-wrap gap-1">
              {BLOCK_TYPES.map((bt) => (
                <button key={bt.value} type="button"
                  className={`btn btn-sm ${blockForm.type === bt.value ? "btn-primary" : "btn-outline-light"}`}
                  onClick={() => setBlockForm((f) => ({ ...f, type: bt.value }))}>
                  <Icon name={bt.icon} className="me-1" />{bt.label}
                </button>
              ))}
            </div>
            <div className="text-muted small mt-2">{blockTypeMeta(blockForm.type).hint}</div>
          </div>
          <div className="form-group mb-2">
            <label className="form-label">Heading {blockForm.type === "image" ? "/ photo title" : ""}</label>
            <input className="form-control" value={blockForm.title}
              onChange={(e) => setBlockForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Optional heading" />
          </div>
          {blockForm.type !== "image" && (
            <div className="form-group mb-2">
              <label className="form-label">{blockForm.type === "steps" ? "Intro text (shown above the steps)" : "Text"}</label>
              <textarea className="form-control" rows={blockForm.type === "steps" ? 2 : 5} value={blockForm.body}
                onChange={(e) => setBlockForm((f) => ({ ...f, body: e.target.value }))}
                placeholder={blockForm.type === "steps" ? "Optional intro before the numbered steps" : "Write the content…"} />
            </div>
          )}
          <div className="form-group mb-3">
            <label className="form-label">{blockForm.type === "image" ? "Photo *" : "Photo (optional)"}</label>
            <ImageField
              value={blockForm.imageUrl}
              caption={blockForm.imageCaption}
              onChange={(url) => setBlockForm((f) => ({ ...f, imageUrl: url }))}
              onCaptionChange={(c) => setBlockForm((f) => ({ ...f, imageCaption: c }))}
            />
          </div>
          {blockForm.type === "steps" && blockModal?.mode === "create" && (
            <div className="alert alert-light py-2 small mb-3">After saving, use <strong>Add step</strong> on the block to build the numbered steps (each step can have its own photo).</div>
          )}
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setBlockModal(null)}>Cancel</Button>
            <Button color="primary" disabled={busy || (blockForm.type === "image" && !blockForm.imageUrl)} onClick={saveBlock}>
              {busy ? <Spinner size="sm" /> : "Save"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* ── Step modal ── */}
      <Modal isOpen={!!stepModal} toggle={() => setStepModal(null)}>
        <ModalBody>
          <h5 className="mb-3">{stepModal?.mode === "create" ? "Add Step" : "Edit Step"}</h5>
          <div className="form-group mb-2">
            <label className="form-label">Instruction *</label>
            <textarea className="form-control" rows={3} value={stepForm.text} autoFocus
              onChange={(e) => setStepForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="e.g. Open the propane valve a quarter turn and check for the hiss of gas…" />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">Photo (optional)</label>
            <ImageField compact
              value={stepForm.imageUrl}
              caption={stepForm.imageCaption}
              onChange={(url) => setStepForm((f) => ({ ...f, imageUrl: url }))}
              onCaptionChange={(c) => setStepForm((f) => ({ ...f, imageCaption: c }))}
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setStepModal(null)}>Cancel</Button>
            <Button color="primary" disabled={busy || !stepForm.text.trim()} onClick={saveStep}>
              {busy ? <Spinner size="sm" /> : "Save"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* ── Delete confirm ── */}
      <Modal isOpen={!!confirmDelete} toggle={() => setConfirmDelete(null)} size="sm">
        <ModalBody className="text-center py-4">
          <Icon name="alert-circle" className="text-danger" style={{ fontSize: 34 }} />
          <p className="mt-2">Delete {confirmDelete?.label}?<br /><span className="text-muted small">This can't be undone.</span></p>
          <div className="d-flex justify-content-center gap-2">
            <Button color="light" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button color="danger" disabled={busy} onClick={doDelete}>{busy ? <Spinner size="sm" /> : "Delete"}</Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default AdminUserGuide;
