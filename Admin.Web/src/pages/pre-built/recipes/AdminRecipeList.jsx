import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Modal, ModalBody, Spinner, Badge } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete, getAccessToken } from "@/utils/apiClient";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);
const fmtTime = (min) => (min ? `${min} min` : "—");
const CATEGORIES = ["Appetizer", "Soup", "Salad", "Entrée", "Side Dish", "Dessert", "Beverage", "Sauce", "Breakfast", "Other"];
const UNITS = ["cup", "tbsp", "tsp", "oz", "lb", "g", "kg", "ml", "l", "piece", "slice", "clove", "bunch", "pinch", "each"];

const blankIngredient = () => ({ uid: uid(), ingredientName: "", quantity: "", unit: "cup", sortOrder: 0 });
const blankStep       = (n) => ({ uid: uid(), stepNumber: n, instruction: "" });
const blankForm = () => ({
  name: "", description: "", prepTimeMinutes: "", cookTimeMinutes: "",
  servings: "", category: "", tags: "", isActive: true,
  ingredients: [blankIngredient()],
  steps: [blankStep(1)],
});

// ─── Sort Icon ───────────────────────────────────────────────────────────────

const SortIcon = ({ field, sortField, sort }) => (
  <Icon name={sortField === field ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
);

// ─── Component ───────────────────────────────────────────────────────────────

const AdminRecipeList = () => {
  const location  = useLocation();
  const navigate  = useNavigate();

  // ── List state ────────────────────────────────────────────────────────────
  const [recipes,    setRecipes]    = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemPerPage,  setItemPerPage]  = useState(10);
  const [sort,         setSort]         = useState("asc");
  const [sortField,    setSortField]    = useState("name");
  const [searchText,   setSearchText]   = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);

  // ── Editor / view state ───────────────────────────────────────────────────
  const [view,          setView]          = useState("list");   // "list" | "editor"
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [form,          setForm]          = useState(blankForm());
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState(null);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Export state ──────────────────────────────────────────────────────────
  const [exporting,   setExporting]   = useState(false);
  const [exportError, setExportError] = useState(null);

  const searchTimer = useRef(null);

  // ── Open editor immediately when routed to /recipes/create ───────────────
  useEffect(() => {
    if (location.pathname.includes("/recipes/create")) {
      setEditingRecipe(null);
      setForm(blankForm());
      setFormError(null);
      setView("editor");
    }
  }, [location.pathname]);

  // ── Load recipes ─────────────────────────────────────────────────────────

  const loadRecipes = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const opts = {
        page: currentPage, limit: itemPerPage,
        order: sort, orderBy: sortField,
        search: searchText || undefined,
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/recipes?${qs}`);
      setRecipes(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, sort, sortField, searchText]);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

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
      loadRecipes({ page: 1, search: val || undefined });
    }, 400);
  };



  // ── Editor helpers ────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingRecipe(null);
    setForm(blankForm());
    setFormError(null);
    setView("editor");
  };

  const openEdit = (recipe) => {
    setEditingRecipe(recipe);
    setForm({
      name:            recipe.name ?? "",
      description:     recipe.description ?? "",
      prepTimeMinutes: recipe.prepTimeMinutes ?? "",
      cookTimeMinutes: recipe.cookTimeMinutes ?? "",
      servings:        recipe.servings ?? "",
      category:        recipe.category ?? "",
      tags:            recipe.tags ?? "",
      isActive:        recipe.isActive ?? true,
      ingredients: recipe.ingredients?.length
        ? recipe.ingredients.map((i) => ({ uid: uid(), ingredientName: i.ingredientName, quantity: String(i.quantity), unit: i.unit, sortOrder: i.sortOrder }))
        : [blankIngredient()],
      steps: recipe.steps?.length
        ? recipe.steps.map((s) => ({ uid: uid(), stepNumber: s.stepNumber, instruction: s.instruction }))
        : [blankStep(1)],
    });
    setFormError(null);
    setView("editor");
  };

  const backToList = () => {
    setView("list");
    setEditingRecipe(null);
    if (location.pathname.includes("/recipes/create")) navigate("/recipes");
  };

  const addIngredient = () =>
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, blankIngredient()] }));
  const removeIngredient = (id) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((i) => i.uid !== id) }));
  const updateIngredient = (id, key, val) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((i) => i.uid === id ? { ...i, [key]: val } : i) }));

  const addStep = () =>
    setForm((f) => ({ ...f, steps: [...f.steps, blankStep(f.steps.length + 1)] }));
  const removeStep = (id) =>
    setForm((f) => {
      const next = f.steps.filter((s) => s.uid !== id).map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
      return { ...f, steps: next.length ? next : [blankStep(1)] };
    });
  const updateStep = (id, val) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s) => s.uid === id ? { ...s, instruction: val } : s) }));

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveRecipe = async () => {
    if (!form.name.trim()) { setFormError("Recipe name is required."); return; }
    setSaving(true); setFormError(null);
    try {
      const validIngredients = form.ingredients
        .filter((i) => i.ingredientName.trim() && i.quantity !== "" && parseFloat(i.quantity) > 0)
        .map((i, idx) => ({ ingredientName: i.ingredientName.trim(), quantity: parseFloat(i.quantity), unit: i.unit || "each", sortOrder: idx }));
      const validSteps = form.steps
        .filter((s) => s.instruction.trim())
        .map((s, idx) => ({ stepNumber: idx + 1, instruction: s.instruction.trim() }));
      const body = {
        name: form.name.trim(), description: form.description || undefined, isActive: form.isActive,
        prepTimeMinutes: form.prepTimeMinutes !== "" ? parseInt(form.prepTimeMinutes, 10) : undefined,
        cookTimeMinutes: form.cookTimeMinutes !== "" ? parseInt(form.cookTimeMinutes, 10) : undefined,
        servings:        form.servings !== "" ? parseInt(form.servings, 10) : undefined,
        category:        form.category || undefined, tags: form.tags || undefined,
        ingredients: validIngredients.length ? validIngredients : undefined,
        steps:       validSteps.length ? validSteps : undefined,
      };
      if (editingRecipe) await apiPatch(`/recipes/${editingRecipe.id}`, body);
      else await apiPost("/recipes", body);
      backToList(); loadRecipes();
    } catch (e) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/recipes/${deleteTarget.id}`);
      setDeleteModal(false); setDeleteTarget(null); loadRecipes();
    } catch (e) { setError(e.message); }
    finally { setDeleteLoading(false); }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const doExport = async (format) => {
    setExporting(true); setExportError(null);
    try {
      const res = await apiPost("/exports", { entity: "recipes", format });
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
      const a = document.createElement("a"); a.href = url; a.download = `recipes-export.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setExportError(e.message); }
    finally { setExporting(false); }
  };


  // ── EDITOR VIEW ──────────────────────────────────────────────────────────

  if (view === "editor") {
    const previewTags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

    return (
      <React.Fragment>
        <Head title={editingRecipe ? "Edit Recipe" : "New Recipe"} />
        <Content>
          {/* Page header */}
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <Button color="light" size="sm" onClick={backToList} className="mb-2">
                  <Icon name="arrow-left" /><span>Back to Recipes</span>
                </Button>
                <BlockTitle page>{editingRecipe ? "Edit Recipe" : "New Recipe"}</BlockTitle>
              </BlockHeadContent>
              <BlockHeadContent>
                <div className="d-flex gap-2 align-items-center">
                  <div className="form-check form-switch">
                    <input
                      type="checkbox" className="form-check-input" id="isActiveSwitch"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="isActiveSwitch">Active</label>
                  </div>
                  <Button color="primary" onClick={saveRecipe} disabled={saving}>
                    {saving ? <Spinner size="sm" /> : <><Icon name="save" /><span>{editingRecipe ? "Save Changes" : "Create Recipe"}</span></>}
                  </Button>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          {formError && <div className="alert alert-danger mb-3">{formError}</div>}

          <Block>
            <Row className="g-4">
              {/* ── LEFT PANEL: Form ──────────────────────────────────────── */}
              <Col lg="7">
                <div className="card card-bordered h-100">
                  <div className="card-inner">

                    {/* Recipe Title */}
                    <div className="mb-4">
                      <input
                        className="form-control form-control-lg fw-bold border-0 border-bottom rounded-0 px-0"
                        style={{ fontSize: "1.6rem", color: "#6b5a4e" }}
                        placeholder="Recipe Title"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>

                    {/* Description */}
                    <div className="form-group mb-4">
                      <label className="form-label text-uppercase small fw-bold text-muted">Description / Notes</label>
                      <textarea
                        className="form-control" rows={3}
                        placeholder="A brief description of this recipe, its origins, or any special notes..."
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                    {/* Meta row */}
                    <Row className="g-3 mb-4">
                      <Col size="3">
                        <div className="form-group">
                          <label className="form-label text-uppercase small fw-bold text-muted">Prep Time</label>
                          <div className="input-group">
                            <input type="number" min="0" className="form-control" placeholder="15"
                              value={form.prepTimeMinutes}
                              onChange={(e) => setForm((f) => ({ ...f, prepTimeMinutes: e.target.value }))}
                            />
                            <span className="input-group-text">min</span>
                          </div>
                        </div>
                      </Col>
                      <Col size="3">
                        <div className="form-group">
                          <label className="form-label text-uppercase small fw-bold text-muted">Cook Time</label>
                          <div className="input-group">
                            <input type="number" min="0" className="form-control" placeholder="30"
                              value={form.cookTimeMinutes}
                              onChange={(e) => setForm((f) => ({ ...f, cookTimeMinutes: e.target.value }))}
                            />
                            <span className="input-group-text">min</span>
                          </div>
                        </div>
                      </Col>
                      <Col size="3">
                        <div className="form-group">
                          <label className="form-label text-uppercase small fw-bold text-muted">Servings</label>
                          <input type="number" min="1" className="form-control" placeholder="4"
                            value={form.servings}
                            onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))}
                          />
                        </div>
                      </Col>
                      <Col size="3">
                        <div className="form-group">
                          <label className="form-label text-uppercase small fw-bold text-muted">Category</label>
                          <select className="form-select" value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                            <option value="">Select...</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </Col>
                    </Row>


                    {/* Ingredients */}
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3" style={{ borderBottom: "2px solid #e9ecef", paddingBottom: 8 }}>
                        <Icon name="list" className="me-1" />Ingredients
                      </h6>
                      {form.ingredients.map((ing) => (
                        <div key={ing.uid} className="d-flex align-items-center gap-2 mb-2">
                          <input
                            type="number" min="0" step="0.01" className="form-control" style={{ width: 70 }}
                            placeholder="Qty" value={ing.quantity}
                            onChange={(e) => updateIngredient(ing.uid, "quantity", e.target.value)}
                          />
                          <select className="form-select" style={{ width: 90 }} value={ing.unit}
                            onChange={(e) => updateIngredient(ing.uid, "unit", e.target.value)}>
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input
                            type="text" className="form-control" placeholder="Ingredient name"
                            value={ing.ingredientName}
                            onChange={(e) => updateIngredient(ing.uid, "ingredientName", e.target.value)}
                          />
                          <button type="button" className="btn btn-icon btn-sm btn-outline-danger"
                            onClick={() => removeIngredient(ing.uid)} disabled={form.ingredients.length === 1}>
                            <Icon name="cross" />
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-sm btn-outline-success mt-1" onClick={addIngredient}>
                        <Icon name="plus" /><span>Add Ingredient</span>
                      </button>
                    </div>

                    {/* Instructions / Steps */}
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3" style={{ borderBottom: "2px solid #e9ecef", paddingBottom: 8 }}>
                        <Icon name="align-left" className="me-1" />Instructions
                      </h6>
                      {form.steps.map((step, idx) => (
                        <div key={step.uid} className="d-flex align-items-start gap-2 mb-2">
                          <span
                            className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold flex-shrink-0"
                            style={{ width: 28, height: 28, background: "#c0392b", fontSize: 13, marginTop: 6 }}>
                            {idx + 1}
                          </span>
                          <textarea
                            className="form-control" rows={2}
                            placeholder={`Describe step ${idx + 1}...`}
                            value={step.instruction}
                            onChange={(e) => updateStep(step.uid, e.target.value)}
                          />
                          <button type="button" className="btn btn-icon btn-sm btn-outline-danger mt-1"
                            onClick={() => removeStep(step.uid)} disabled={form.steps.length === 1}>
                            <Icon name="cross" />
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-sm btn-outline-success mt-1" onClick={addStep}>
                        <Icon name="plus" /><span>Add Step</span>
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="form-group mb-3">
                      <label className="form-label text-uppercase small fw-bold text-muted">Tags <span className="text-soft">(comma-separated)</span></label>
                      <input
                        type="text" className="form-control"
                        placeholder="e.g. vegetarian, quick, comfort food, Italian"
                        value={form.tags}
                        onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      />
                    </div>

                  </div>{/* /card-inner */}
                </div>{/* /card */}
              </Col>{/* /left panel */}

              {/* ── RIGHT PANEL: Live Preview ──────────────────────────────── */}
              <Col lg="5">
                <div style={{ position: "sticky", top: 80 }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-uppercase small fw-bold text-muted">Live Preview</span>
                    <Button color="danger" size="sm" onClick={() => window.print()}>
                      <Icon name="printer" /><span>Print Recipe</span>
                    </Button>
                  </div>
                  <div className="card card-bordered shadow-sm">
                    <div className="card-inner">
                      {!form.name.trim() && form.ingredients.every((i) => !i.ingredientName.trim()) && form.steps.every((s) => !s.instruction.trim()) ? (
                        /* Empty state */
                        <div className="text-center py-5">
                          <em className="icon ni ni-text-rich" style={{ fontSize: 48, color: "#c0392b", opacity: 0.6 }} />
                          <p className="fw-bold text-muted mt-3 mb-1">Your recipe will appear here</p>
                          <p className="text-soft small">Start filling in the fields on the left to see your recipe take shape.</p>
                        </div>
                      ) : (
                        /* Populated preview */
                        <>
                          <h3 className="fw-bold mb-1" style={{ color: "#6b5a4e" }}>{form.name || <span className="text-muted">Recipe Title</span>}</h3>
                          {form.description && <p className="text-soft small mb-3">{form.description}</p>}

                          {/* Meta pills */}
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {form.prepTimeMinutes !== "" && <Badge color="light" className="text-dark border"><Icon name="clock" className="me-1" />Prep {form.prepTimeMinutes} min</Badge>}
                            {form.cookTimeMinutes !== "" && <Badge color="light" className="text-dark border"><Icon name="clock" className="me-1" />Cook {form.cookTimeMinutes} min</Badge>}
                            {form.servings !== "" && <Badge color="light" className="text-dark border"><Icon name="user" className="me-1" />{form.servings} servings</Badge>}
                            {form.category && <Badge color="warning" className="text-dark">{form.category}</Badge>}
                          </div>

                          {/* Ingredients list */}
                          {form.ingredients.some((i) => i.ingredientName.trim()) && (
                            <>
                              <h6 className="fw-bold mb-2" style={{ color: "#6b5a4e" }}>Ingredients</h6>
                              <ul className="list-unstyled small mb-3">
                                {form.ingredients.filter((i) => i.ingredientName.trim()).map((i) => (
                                  <li key={i.uid} className="mb-1">
                                    <span className="fw-semibold">{i.quantity} {i.unit}</span> — {i.ingredientName}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {/* Steps list */}
                          {form.steps.some((s) => s.instruction.trim()) && (
                            <>
                              <h6 className="fw-bold mb-2" style={{ color: "#6b5a4e" }}>Instructions</h6>
                              <ol className="ps-3 small mb-3">
                                {form.steps.filter((s) => s.instruction.trim()).map((s, i) => (
                                  <li key={s.uid} className="mb-2">{s.instruction}</li>
                                ))}
                              </ol>
                            </>
                          )}

                          {/* Tags */}
                          {previewTags.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-2">
                              {previewTags.map((t, i) => <Badge key={i} color="secondary" pill className="text-capitalize">{t}</Badge>)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Col>{/* /right panel */}

            </Row>
          </Block>
        </Content>
      </React.Fragment>
    );
  } // end editor view


  // ── LIST VIEW ─────────────────────────────────────────────────────────────

  return (
    <React.Fragment>
      <Head title="Recipes" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Recipes</BlockTitle>
              <BlockDes className="text-soft"><p>You have a total of {totalItems} recipe{totalItems !== 1 ? "s" : ""}.</p></BlockDes>
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
                      <Button color="primary" onClick={openNew}>
                        <Icon name="plus" /><span>New Recipe</span>
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
                        placeholder="Search by name or description..." value={searchText} onChange={onSearchChange} />
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
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => onSortClick("category")}>
                    Category <SortIcon field="category" sortField={sortField} sort={sort} />
                  </span>
                </DataTableRow>
                <DataTableRow size="lg">
                  <span className="sub-text">Prep</span>
                </DataTableRow>
                <DataTableRow size="lg">
                  <span className="sub-text">Cook</span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text">Servings</span>
                </DataTableRow>
                <DataTableRow size="sm">
                  <span className="sub-text">Status</span>
                </DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={7} className="text-center py-4"><Spinner /></td></tr>
              ) : recipes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-muted">No recipes found.</td></tr>
              ) : recipes.map((recipe) => (
                <DataTableItem key={recipe.id}>
                  <DataTableRow>
                    <span className="tb-product">
                      <span className="title fw-semibold">{recipe.name}</span>
                      {recipe.tags && <span className="d-block text-soft small">{recipe.tags.split(",").slice(0, 2).join(", ")}</span>}
                    </span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="text-soft">{recipe.category || "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-soft">{fmtTime(recipe.prepTimeMinutes)}</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-soft">{fmtTime(recipe.cookTimeMinutes)}</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="text-soft">{recipe.servings ?? "—"}</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <Badge color={recipe.isActive ? "success" : "secondary"} className="text-capitalize">
                      {recipe.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li>
                        <UncontrolledDropdown>
                          <DropdownToggle tag="a" className="dropdown-toggle btn btn-icon btn-trigger"><Icon name="more-h" /></DropdownToggle>
                          <DropdownMenu end>
                            <ul className="link-list-opt no-bdr">
                              <li><DropdownItem onClick={() => openEdit(recipe)}><Icon name="edit" /><span>Edit</span></DropdownItem></li>
                              <li><DropdownItem onClick={() => { setDeleteTarget(recipe); setDeleteModal(true); }}><Icon name="trash" /><span>Delete</span></DropdownItem></li>
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

        {/* Delete Modal */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalBody className="modal-body-lg text-center">
            <div className="nk-modal">
              <Icon name="trash" className="nk-modal-icon icon-circle icon-circle-xxl bg-danger text-white" />
              <h4 className="nk-modal-title">Delete Recipe?</h4>
              <div className="nk-modal-text">
                <p className="lead">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
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

export default AdminRecipeList;
