import React, { useState, useEffect, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
import { useLocation, useNavigate } from "react-router-dom";
import { DndContext, closestCenter, useSensors, useSensor, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
const CATEGORIES = ["Appetizer", "Soup", "Salad", "Entrée", "Side Dish", "Dessert", "Beverage", "Sauce", "Rub", "Dry Mix", "Drink", "Breakfast", "Other"];
const SERVING_PRESETS = { Sauce: { qty: 1.5, unit: "tbsp" }, Rub: { qty: 1, unit: "tbsp" }, "Dry Mix": { qty: 1, unit: "tbsp" }, Drink: { qty: 8, unit: "oz" } };
const CONTAINER_SIZES = [4, 6, 8, 10, 12, 16, 20, 24, 32, 64];
const UNITS = ["cup", "tbsp", "tsp", "oz", "lb", "g", "kg", "ml", "l", "stick", "gal", "pt", "qt", "#10 can", "piece", "slice", "clove", "bunch", "pinch", "each"];

const UNIT_TO_OZ = {
  cup: 8, tbsp: 0.5, tsp: 1 / 6, oz: 1, lb: 16,
  g: 0.035274, kg: 35.274, ml: 0.033814, l: 33.814,
  gal: 128, pt: 16, qt: 32, stick: 4,
};

const calcTotalYieldOz = (ingredients) => {
  const total = ingredients.reduce((sum, ing) => {
    const qty    = combinedQty(ing.quantity, ing.fraction);
    const factor = UNIT_TO_OZ[ing.unit] ?? 0;
    return sum + qty * factor;
  }, 0);
  return Math.round(total);
};

const FRACTIONS = [
  { label: "",    value: 0      },
  { label: "1/8", value: 1/8   },
  { label: "1/4", value: 1/4   },
  { label: "3/8", value: 3/8   },
  { label: "1/2", value: 1/2   },
  { label: "5/8", value: 5/8   },
  { label: "3/4", value: 3/4   },
  { label: "7/8", value: 7/8   },
  { label: "1/3", value: 1/3   },
  { label: "2/3", value: 2/3   },
];
const fractionToDecimal = (label) => (FRACTIONS.find((f) => f.label === label)?.value ?? 0);
const decimalToFraction = (dec) => {
  if (!dec || Math.abs(dec) < 0.01) return "";
  let best = ""; let bestDiff = Infinity;
  for (const f of FRACTIONS.slice(1)) {
    const diff = Math.abs(f.value - dec);
    if (diff < bestDiff) { bestDiff = diff; best = f.label; }
  }
  return bestDiff < 0.05 ? best : "";
};
const combinedQty = (quantity, fraction) => parseFloat(quantity || 0) + fractionToDecimal(fraction || "");
const displayQty  = (quantity, fraction) => {
  const whole    = parseFloat(quantity || 0);
  const fracPart = fraction ? ` ${fraction}` : "";
  return whole > 0 ? `${whole}${fracPart}` : fraction || "";
};

const blankIngredient = () => ({ uid: uid(), ingredientName: "", quantity: "", fraction: "", unit: "cup", sortOrder: 0 });
const blankStep       = (n) => ({ uid: uid(), stepNumber: n, instruction: "" });
const blankForm = () => ({
  name: "", description: "", prepTimeMinutes: "", cookTimeMinutes: "",
  servings: "", category: "", tags: "", isActive: true,
  yieldOz: "", containerSizeOz: "", servingSizeQty: "", servingSizeUnit: "",
  ingredients: [blankIngredient()],
  steps: [blankStep(1)],
});

// ─── Sort Icon ───────────────────────────────────────────────────────────────

const SortIcon = ({ field, sortField, sort }) => (
  <Icon name={sortField === field ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
);

// ─── Sortable ingredient row (drag handle + fields) ───────────────────────────

const SortableIngredientRow = ({ ing, updateIngredient, removeIngredient, isOnly }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ing.uid });
  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    border: "1px solid #e9ecef",
    backgroundColor: "#fafafa",
    minHeight: 48,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="d-flex align-items-center gap-2 rounded p-2 mb-3"
    >
      <div
        className="d-flex align-items-center justify-content-center flex-shrink-0 text-muted"
        style={{ width: 28, height: 36, cursor: "grab" }}
        {...listeners}
        {...attributes}
        title="Drag to reorder"
      >
        <Icon name="move" />
      </div>
      <input
        type="number"
        min="0"
        step="1"
        className="form-control form-control-sm flex-shrink-0"
        style={{ width: 60 }}
        placeholder="#"
        value={ing.quantity}
        onChange={(e) => updateIngredient(ing.uid, "quantity", e.target.value)}
      />
      <select
        className="form-select form-select-sm flex-shrink-0"
        style={{ width: 90 }}
        value={ing.fraction}
        onChange={(e) => updateIngredient(ing.uid, "fraction", e.target.value)}
        title="Fraction"
      >
        {FRACTIONS.map((f) => <option key={f.label} value={f.label}>{f.label || "—"}</option>)}
      </select>
      <select
        className="form-select form-select-sm flex-shrink-0"
        style={{ width: 90 }}
        value={ing.unit}
        onChange={(e) => updateIngredient(ing.uid, "unit", e.target.value)}
      >
        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <input
        type="text"
        className="form-control form-control-sm flex-grow-1"
        style={{ minWidth: 0, maxWidth: 180 }}
        placeholder="Ingredient name"
        value={ing.ingredientName}
        onChange={(e) => updateIngredient(ing.uid, "ingredientName", e.target.value)}
      />
      <button
        type="button"
        className="btn btn-icon btn-sm flex-shrink-0 border-0"
        style={{ width: 36, height: 36, backgroundColor: "#c0392b", color: "#fff", borderRadius: 8 }}
        onClick={() => removeIngredient(ing.uid)}
        disabled={isOnly}
        title="Remove ingredient"
      >
        <Icon name="trash" />
      </button>
    </div>
  );
};

// ─── FDA-Style Nutrition Label ────────────────────────────────────────────────

const DV = { totalFat: 78, saturatedFat: 20, cholesterol: 300, sodium: 2300, totalCarbs: 275, fiber: 28, sugar: 50, protein: 50, vitaminD: 20, calcium: 1300, iron: 18, potassium: 4700 };

const NutritionLabel = ({ data, recipeName }) => {
  const servings = data.servingsPerRecipe || 1;
  const pv = (key) => Math.round((data[key] || 0) / servings * 10) / 10;
  const dvp = (key) => {
    const d = DV[key];
    return d ? Math.round(pv(key) / d * 100) : 0;
  };

  // If container size is set, show servings per container; otherwise per recipe
  const servingsPerContainer = data.containersYielded
    ? Math.round(servings / data.containersYielded)
    : null;
  const servingsLine = servingsPerContainer
    ? `About ${servingsPerContainer} serving${servingsPerContainer !== 1 ? "s" : ""} per container`
    : `${servings} serving${servings !== 1 ? "s" : ""} per recipe`;

  const labelStyle = { border: "2px solid #000", padding: "4px 8px", fontFamily: "Arial, Helvetica, sans-serif", maxWidth: 360, color: "#000", backgroundColor: "#fff" };
  const hrThick = { borderTop: "8px solid #000", margin: "2px 0" };
  const hrMed = { borderTop: "3px solid #000", margin: "2px 0" };
  const hrThin = { borderTop: "1px solid #000", margin: "1px 0" };
  const rowStyle = { display: "flex", justifyContent: "space-between", fontSize: 13 };

  return (
    <div style={labelStyle}>
      <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>Nutrition Facts</div>
      <div style={{ fontSize: 11 }}>{recipeName || "Recipe"}</div>
      <div style={hrThick} />
      <div style={{ ...rowStyle, fontSize: 11 }}>
        <span>{servingsLine}</span>
      </div>
      <div style={{ ...rowStyle, fontWeight: 700, fontSize: 14 }}>
        <span>Serving size</span>
        <span>{data.servingSize || "1 serving"}</span>
      </div>
      <div style={hrThick} />
      <div style={{ fontSize: 11, fontWeight: 700 }}>Amount per serving</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 22, fontWeight: 900 }}>Calories</span>
        <span style={{ fontSize: 22, fontWeight: 900 }}>{Math.round(pv("calories"))}</span>
      </div>
      <div style={hrMed} />
      <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700 }}>% Daily Value*</div>
      <div style={hrThin} />
      <div style={rowStyle}><span><strong>Total Fat</strong> {pv("totalFat")}g</span><strong>{dvp("totalFat")}%</strong></div>
      <div style={hrThin} />
      <div style={{ ...rowStyle, paddingLeft: 16 }}><span>Saturated Fat {pv("saturatedFat")}g</span><strong>{dvp("saturatedFat")}%</strong></div>
      <div style={hrThin} />
      <div style={{ ...rowStyle, paddingLeft: 16 }}><span><em>Trans</em> Fat {pv("transFat")}g</span></div>
      <div style={hrThin} />
      <div style={rowStyle}><span><strong>Cholesterol</strong> {pv("cholesterol")}mg</span><strong>{dvp("cholesterol")}%</strong></div>
      <div style={hrThin} />
      <div style={rowStyle}><span><strong>Sodium</strong> {pv("sodium")}mg</span><strong>{dvp("sodium")}%</strong></div>
      <div style={hrThin} />
      <div style={rowStyle}><span><strong>Total Carbohydrate</strong> {pv("totalCarbs")}g</span><strong>{dvp("totalCarbs")}%</strong></div>
      <div style={hrThin} />
      <div style={{ ...rowStyle, paddingLeft: 16 }}><span>Dietary Fiber {pv("fiber")}g</span><strong>{dvp("fiber")}%</strong></div>
      <div style={hrThin} />
      <div style={{ ...rowStyle, paddingLeft: 16 }}><span>Total Sugars {pv("sugar")}g</span></div>
      <div style={hrThin} />
      <div style={rowStyle}><span><strong>Protein</strong> {pv("protein")}g</span><strong>{dvp("protein")}%</strong></div>
      <div style={hrThick} />
      <div style={rowStyle}><span>Vitamin D {pv("vitaminD")}mcg</span><span>{dvp("vitaminD")}%</span></div>
      <div style={hrThin} />
      <div style={rowStyle}><span>Calcium {pv("calcium")}mg</span><span>{dvp("calcium")}%</span></div>
      <div style={hrThin} />
      <div style={rowStyle}><span>Iron {pv("iron")}mg</span><span>{dvp("iron")}%</span></div>
      <div style={hrThin} />
      <div style={rowStyle}><span>Potassium {pv("potassium")}mg</span><span>{dvp("potassium")}%</span></div>
      <div style={hrMed} />
      <div style={{ fontSize: 10, lineHeight: 1.3 }}>
        * The % Daily Value (DV) tells you how much a nutrient in a
        serving of food contributes to a daily diet. 2,000 calories a
        day is used for general nutrition advice.
      </div>
    </div>
  );
};

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

  // ── Nutrition state ────────────────────────────────────────────────────
  const [nutritionModal, setNutritionModal] = useState(false);
  const [nutritionData,  setNutritionData]  = useState(null);
  const [analyzing,      setAnalyzing]      = useState(false);
  const [nutritionError, setNutritionError] = useState(null);

  // ── Linked products state ────────────────────────────────────────────
  const [linkedProducts,   setLinkedProducts]   = useState([]);
  const [productSearch,    setProductSearch]    = useState("");
  const [productResults,   setProductResults]   = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const [linkingProduct,   setLinkingProduct]   = useState(false);

  // ── Batch calculator state ───────────────────────────────────────────
  const [batchScale, setBatchScale] = useState(1);

  const searchTimer = useRef(null);
  const productSearchTimer = useRef(null);

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
    setLinkedProducts([]);
    setProductSearch("");
    setProductResults([]);
    setBatchScale(1);
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
      yieldOz:         recipe.yieldOz ?? "",
      containerSizeOz: recipe.containerSizeOz ?? "",
      servingSizeQty:  recipe.servingSizeQty ?? "",
      servingSizeUnit: recipe.servingSizeUnit ?? "",
      ingredients: recipe.ingredients?.length
        ? recipe.ingredients.map((i) => {
            const raw  = parseFloat(i.quantity) || 0;
            const whole = Math.floor(raw);
            const frac  = decimalToFraction(Math.round((raw - whole) * 10000) / 10000);
            return { uid: uid(), ingredientName: i.ingredientName, quantity: whole > 0 ? String(whole) : "", fraction: frac, unit: i.unit, sortOrder: i.sortOrder };
          })
        : [blankIngredient()],
      steps: recipe.steps?.length
        ? recipe.steps.map((s) => ({ uid: uid(), stepNumber: s.stepNumber, instruction: s.instruction }))
        : [blankStep(1)],
    });
    setFormError(null);
    setLinkedProducts((recipe.productMaps ?? []).map((m) => m.product));
    setProductSearch("");
    setProductResults([]);
    setBatchScale(1);
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

  const handleIngredientsDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setForm((f) => {
      const oldIndex = f.ingredients.findIndex((i) => i.uid === active.id);
      const newIndex = f.ingredients.findIndex((i) => i.uid === over.id);
      if (oldIndex === -1 || newIndex === -1) return f;
      return { ...f, ingredients: arrayMove(f.ingredients, oldIndex, newIndex) };
    });
  };

  const ingredientSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Auto-calculate Total Yield from ingredient weights/volumes
  useEffect(() => {
    const computed = calcTotalYieldOz(form.ingredients);
    const next = computed > 0 ? String(computed) : "";
    setForm((f) => f.yieldOz !== next ? { ...f, yieldOz: next } : f);
  }, [form.ingredients]);

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
        .filter((i) => i.ingredientName.trim() && combinedQty(i.quantity, i.fraction) > 0)
        .map((i, idx) => ({ ingredientName: i.ingredientName.trim(), quantity: combinedQty(i.quantity, i.fraction), unit: i.unit || "each", sortOrder: idx }));
      const validSteps = form.steps
        .filter((s) => s.instruction.trim())
        .map((s, idx) => ({ stepNumber: idx + 1, instruction: s.instruction.trim() }));
      const body = {
        name: form.name.trim(), description: form.description || undefined, isActive: form.isActive,
        prepTimeMinutes: form.prepTimeMinutes !== "" ? parseInt(form.prepTimeMinutes, 10) : undefined,
        cookTimeMinutes: form.cookTimeMinutes !== "" ? parseInt(form.cookTimeMinutes, 10) : undefined,
        servings:        form.servings !== "" ? parseInt(form.servings, 10) : undefined,
        category:        form.category || undefined, tags: form.tags || undefined,
        yieldOz:         form.yieldOz !== "" ? parseFloat(form.yieldOz) : undefined,
        containerSizeOz: form.containerSizeOz !== "" ? parseFloat(form.containerSizeOz) : undefined,
        servingSizeQty:  form.servingSizeQty !== "" ? parseFloat(form.servingSizeQty) : undefined,
        servingSizeUnit: form.servingSizeUnit || undefined,
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


  // ── Nutrition helpers ─────────────────────────────────────────────────────

  const analyzeRecipeNutrition = async () => {
    if (!editingRecipe?.id) return;
    setAnalyzing(true);
    setNutritionError(null);
    try {
      const res = await apiPost(`/recipes/${editingRecipe.id}/nutrition/analyze`);
      setNutritionData(res?.data ?? res);
      setNutritionModal(true);
    } catch (e) {
      setNutritionError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const loadExistingNutrition = async () => {
    if (!editingRecipe?.id) return;
    setAnalyzing(true);
    setNutritionError(null);
    try {
      const res = await apiGet(`/recipes/${editingRecipe.id}/nutrition`);
      const data = res?.data ?? res;
      if (data) {
        setNutritionData(data);
        setNutritionModal(true);
        setAnalyzing(false);
      } else {
        await analyzeRecipeNutrition();
      }
    } catch {
      await analyzeRecipeNutrition();
    }
  };

  const printNutritionLabel = () => {
    const el = document.getElementById("nutrition-label-print");
    if (!el) return;
    const w = window.open("", "_blank", "width=450,height=700");
    w.document.write(`<html><head><title>Nutrition Facts</title><style>
      body { font-family: Arial, Helvetica, sans-serif; padding: 20px; margin: 0; }
      @media print { body { padding: 10px; } }
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const [downloadingPng, setDownloadingPng] = useState(false);
  const downloadLabelPng = async () => {
    const el = document.getElementById("nutrition-label-print");
    if (!el) return;
    setDownloadingPng(true);

    // Render the label into a clean offscreen div so admin panel CSS
    // doesn't bleed in (blue text, wrong fonts, etc.)
    const wrapper = document.createElement("div");
    wrapper.style.cssText = [
      "position:fixed",
      "top:-99999px",
      "left:-99999px",
      "background:#fff",
      "padding:12px",
      "font-family:Arial,Helvetica,sans-serif",
      "color:#000",
      "display:inline-block",
      "line-height:normal",
    ].join(";");
    wrapper.innerHTML = el.innerHTML;
    // Force every child element to black text so admin theme colours can't win
    wrapper.querySelectorAll("*").forEach((node) => {
      node.style.color = "#000";
      node.style.fontFamily = "Arial, Helvetica, sans-serif";
    });
    document.body.appendChild(wrapper);

    try {
      // scrollWidth / scrollHeight gives the FULL rendered size, not just viewport
      const fullW = wrapper.scrollWidth;
      const fullH = wrapper.scrollHeight;
      const SCALE = 4; // 4× = ~288 dpi equivalent, crisp for print
      const canvas = await html2canvas(wrapper, {
        scale: SCALE,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: fullW,
        height: fullH,
      });
      const link = document.createElement("a");
      const recipeName = (form.name || "nutrition-label").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      link.download = `${recipeName}-nutrition-label.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      document.body.removeChild(wrapper);
      setDownloadingPng(false);
    }
  };

  const printRecipe = () => {
    if (!form.name.trim()) return;

    const metaBadges = [
      form.prepTimeMinutes !== "" ? `<span class="badge badge-light">Prep: ${form.prepTimeMinutes} min</span>` : "",
      form.cookTimeMinutes !== "" ? `<span class="badge badge-light">Cook: ${form.cookTimeMinutes} min</span>` : "",
      form.servings         !== "" ? `<span class="badge badge-light">${form.servings} servings</span>` : "",
      form.category               ? `<span class="badge badge-warn">${form.category}</span>` : "",
      form.yieldOz                ? `<span class="badge badge-info">Yield: ${form.yieldOz} oz</span>` : "",
      form.yieldOz && form.containerSizeOz
        ? `<span class="badge badge-green">${Math.floor((parseFloat(form.yieldOz) / parseFloat(form.containerSizeOz)) * 10) / 10} × ${form.containerSizeOz}oz containers</span>` : "",
      form.servingSizeQty && form.servingSizeUnit
        ? `<span class="badge badge-light">Serving: ${form.servingSizeQty} ${form.servingSizeUnit}</span>` : "",
    ].filter(Boolean).join("");

    const validIngredients = form.ingredients.filter((i) => i.ingredientName.trim());
    const ingredientsHtml = validIngredients.length
      ? `<h2>Ingredients</h2><ul>${validIngredients.map((i) =>
          `<li><strong>${displayQty(i.quantity, i.fraction)} ${i.unit}</strong> &mdash; ${i.ingredientName}</li>`
        ).join("")}</ul>` : "";

    const validSteps = form.steps.filter((s) => s.instruction.trim());
    const stepsHtml = validSteps.length
      ? `<h2>Instructions</h2><ol>${validSteps.map((s) =>
          `<li>${s.instruction}</li>`
        ).join("")}</ol>` : "";

    const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const tagsHtml = tags.length
      ? `<div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>` : "";

    const linkedHtml = linkedProducts.length
      ? `<div class="linked-section"><p class="linked-header">Linked Products</p><div class="tags">${
          linkedProducts.map((p) => `<span class="linked-item">${p.name}${p.price != null ? ` — $${Number(p.price).toFixed(2)}` : ""}</span>`).join("")
        }</div></div>` : "";

    const html = `<!DOCTYPE html><html><head><title>${form.name}</title><style>
      *, *::before, *::after { box-sizing: border-box; }
      body { font-family: Georgia, "Times New Roman", serif; padding: 40px 48px; margin: 0; color: #222; max-width: 680px; }
      h1  { font-size: 28px; font-weight: 900; color: #6b5a4e; margin: 0 0 6px; }
      .desc { color: #777; font-size: 13px; margin: 0 0 14px; font-style: italic; }
      .meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: Arial, sans-serif; }
      .badge-light { background: #f1f1f1; color: #333; border: 1px solid #ddd; }
      .badge-warn  { background: #e67e22; color: #fff; }
      .badge-info  { background: #2980b9; color: #fff; }
      .badge-green { background: #27ae60; color: #fff; }
      h2 { font-size: 16px; font-weight: 700; color: #6b5a4e; border-bottom: 2px solid #e8ded5; padding-bottom: 4px; margin: 22px 0 10px; }
      ul { padding-left: 0; list-style: none; margin: 0 0 8px; }
      ul li { font-size: 13px; padding: 5px 0; border-bottom: 1px solid #f2ece8; }
      ul li strong { color: #333; }
      ol { padding-left: 20px; margin: 0 0 8px; }
      ol li { font-size: 13px; padding: 5px 2px; border-bottom: 1px solid #f2ece8; line-height: 1.6; }
      .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .tag { background: #eee; color: #555; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-family: Arial, sans-serif; text-transform: capitalize; }
      .linked-section { margin-top: 20px; border-top: 1px solid #e8ded5; padding-top: 14px; }
      .linked-header { font-size: 14px; font-weight: 700; color: #6b5a4e; margin: 0 0 8px; font-family: Arial, sans-serif; }
      .linked-item { background: #eef4ff; color: #1d4ed8; padding: 2px 9px; border-radius: 12px; font-size: 11px; font-family: Arial, sans-serif; }
      @media print { body { padding: 20px 28px; } @page { margin: 1.5cm; } }
    </style></head><body>
      <h1>${form.name}</h1>
      ${form.description ? `<p class="desc">${form.description}</p>` : ""}
      ${metaBadges ? `<div class="meta">${metaBadges}</div>` : ""}
      ${ingredientsHtml}
      ${stepsHtml}
      ${tagsHtml}
      ${linkedHtml}
    </body></html>`;

    const w = window.open("", "_blank", "width=720,height=900");
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  // ── Linked Products helpers ──────────────────────────────────────────────

  const searchProducts = (query) => {
    setProductSearch(query);
    clearTimeout(productSearchTimer.current);
    if (!query.trim()) { setProductResults([]); return; }
    productSearchTimer.current = setTimeout(async () => {
      setProductSearching(true);
      try {
        const res = await apiGet(`/products?search=${encodeURIComponent(query)}&limit=8`);
        const all = res?.data ?? [];
        const linkedIds = new Set(linkedProducts.map((p) => p.id));
        setProductResults(all.filter((p) => !linkedIds.has(p.id)));
      } catch { setProductResults([]); }
      finally { setProductSearching(false); }
    }, 300);
  };

  const doLinkProduct = async (product) => {
    if (!editingRecipe?.id) return;
    setLinkingProduct(true);
    try {
      await apiPost(`/recipes/${editingRecipe.id}/products`, { productId: product.id });
      setLinkedProducts((prev) => [...prev, product]);
      setProductSearch("");
      setProductResults([]);
    } catch (e) { setFormError(e.message); }
    finally { setLinkingProduct(false); }
  };

  const doUnlinkProduct = async (productId) => {
    if (!editingRecipe?.id) return;
    try {
      await apiDelete(`/recipes/${editingRecipe.id}/products/${productId}`);
      setLinkedProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (e) { setFormError(e.message); }
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
              <Col lg="7" style={{ minWidth: 0 }}>
                <div className="card card-bordered h-100">
                  <div className="card-inner" style={{ minWidth: 0 }}>

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
                            onChange={(e) => {
                              const cat = e.target.value;
                              const preset = SERVING_PRESETS[cat];
                              setForm((f) => ({
                                ...f, category: cat,
                                ...(preset ? { servingSizeQty: String(preset.qty), servingSizeUnit: preset.unit } : {}),
                              }));
                            }}>
                            <option value="">Select...</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </Col>
                    </Row>

                    {/* Product / Packaging row – always visible */}
                    <Row className="g-3 mb-4">
                        <Col size="3">
                          <div className="form-group">
                            <label className="form-label text-uppercase small fw-bold text-muted">Total Yield</label>
                            <div className="input-group">
                              <input type="number" min="0" step="0.1" className="form-control"
                                placeholder="Auto"
                                value={form.yieldOz}
                                disabled
                                style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
                              />
                              <span className="input-group-text">oz</span>
                            </div>
                            <small className="text-muted mt-1 d-block">Auto-calculated from ingredients</small>
                          </div>
                        </Col>
                        <Col size="3">
                          <div className="form-group">
                            <label className="form-label text-uppercase small fw-bold text-muted">Container Size</label>
                            <div className="input-group">
                              <select className="form-select" value={String(form.containerSizeOz)}
                                onChange={(e) => setForm((f) => ({ ...f, containerSizeOz: e.target.value }))}>
                                <option value="">Select...</option>
                                {CONTAINER_SIZES.map((s) => <option key={s} value={String(s)}>{s} oz</option>)}
                              </select>
                            </div>
                          </div>
                        </Col>
                        <Col size="3">
                          <div className="form-group">
                            <label className="form-label text-uppercase small fw-bold text-muted">Serving Size</label>
                            <div className="input-group">
                              <input type="number" min="0" step="0.5" className="form-control" placeholder="1.5"
                                value={form.servingSizeQty}
                                onChange={(e) => setForm((f) => ({ ...f, servingSizeQty: e.target.value }))}
                              />
                              <select className="input-group-text" style={{ appearance: "auto", cursor: "pointer" }}
                                value={form.servingSizeUnit}
                                onChange={(e) => setForm((f) => ({ ...f, servingSizeUnit: e.target.value }))}>
                                <option value="">unit</option>
                                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            {form.servingSizeQty && form.servingSizeUnit && (
                              <small className="text-muted mt-1 d-block">
                                Nutrition label per {form.servingSizeQty} {form.servingSizeUnit}
                              </small>
                            )}
                          </div>
                        </Col>
                        <Col size="3">
                          <div className="form-group">
                            <label className="form-label text-uppercase small fw-bold text-muted">Containers</label>
                            <div className="py-2 px-3 rounded" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", minHeight: 38, display: "flex", alignItems: "center" }}>
                              {parseFloat(form.yieldOz) > 0 && parseFloat(form.containerSizeOz) > 0 ? (
                                <span className="fw-bold" style={{ color: "#166534" }}>
                                  {Math.round((parseFloat(form.yieldOz) / parseFloat(form.containerSizeOz)) * 100) / 100} × {form.containerSizeOz}oz
                                </span>
                              ) : parseFloat(form.containerSizeOz) > 0 ? (
                                <span className="text-muted small">Add ingredients to calculate</span>
                              ) : (
                                <span className="text-muted small">Select a container size</span>
                              )}
                            </div>
                          </div>
                        </Col>
                      </Row>

                    {/* Ingredients */}
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3 text-nowrap" style={{ borderBottom: "2px solid #e9ecef", paddingBottom: 8 }}>
                        <Icon name="list" className="me-1" />Ingredients
                      </h6>
                      <DndContext
                        sensors={ingredientSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleIngredientsDragEnd}
                      >
                        <SortableContext
                          items={form.ingredients.map((i) => i.uid)}
                          strategy={verticalListSortingStrategy}
                        >
                          {form.ingredients.map((ing) => (
                            <SortableIngredientRow
                              key={ing.uid}
                              ing={ing}
                              updateIngredient={updateIngredient}
                              removeIngredient={removeIngredient}
                              isOnly={form.ingredients.length === 1}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                      <button type="button" className="btn btn-sm btn-outline-success mt-2 d-inline-flex align-items-center" onClick={addIngredient}>
                        <Icon name="plus" className="me-2" /><span>Add Ingredient</span>
                      </button>
                    </div>

                    {/* Instructions / Steps */}
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3 text-nowrap" style={{ borderBottom: "2px solid #e9ecef", paddingBottom: 8 }}>
                        <Icon name="align-left" className="me-1" />Instructions
                      </h6>
                      {form.steps.map((step, idx) => (
                        <div
                          key={step.uid}
                          className="mb-3"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "28px 1fr 36px",
                            gap: "0.5rem",
                            alignItems: "center",
                            minWidth: 0,
                          }}
                        >
                          <span
                            className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
                            style={{ width: 28, height: 28, background: "#c0392b", fontSize: 13 }}
                          >
                            {idx + 1}
                          </span>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder={`Describe step ${idx + 1}...`}
                            value={step.instruction}
                            onChange={(e) => updateStep(step.uid, e.target.value)}
                            style={{ minWidth: 0, resize: "vertical" }}
                          />
                          <button
                            type="button"
                            className="btn btn-icon btn-sm border-0"
                            style={{
                              width: 36,
                              height: 36,
                              backgroundColor: "#c0392b",
                              color: "#fff",
                              borderRadius: 8,
                            }}
                            onClick={() => removeStep(step.uid)}
                            disabled={form.steps.length === 1}
                            title="Remove step"
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline-success mt-2 d-inline-flex align-items-center" onClick={addStep}>
                        <Icon name="plus" className="me-2" /><span>Add Step</span>
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

                    {/* Linked Products */}
                    <div className="mb-4">
                      <h6 className="fw-bold mb-3 text-nowrap" style={{ borderBottom: "2px solid #e9ecef", paddingBottom: 8 }}>
                        <Icon name="package" className="me-1" />Linked Products
                      </h6>
                    {!editingRecipe?.id ? (
                      <div className="alert alert-light border d-flex align-items-center gap-2 py-2 px-3 mb-0" style={{ borderStyle: "dashed !important" }}>
                        <em className="icon ni ni-info text-info fs-5" />
                        <span className="small text-muted">Save this recipe first, then you can link it to a store product.</span>
                      </div>
                    ) : (<>
                        {linkedProducts.length > 0 && (
                          <div className="mb-3">
                            {linkedProducts.map((p) => (
                              <div key={p.id} className="d-flex align-items-center justify-content-between border rounded p-2 mb-2" style={{ backgroundColor: "#fafafa" }}>
                                <div>
                                  <strong>{p.name}</strong>
                                  {p.price != null && <span className="text-muted ms-2">${Number(p.price).toFixed(2)}</span>}
                                  {p.isDeleted && <Badge color="danger" className="ms-2 badge-sm">Deleted</Badge>}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-icon btn-sm border-0"
                                  style={{ width: 32, height: 32, backgroundColor: "#c0392b", color: "#fff", borderRadius: 8 }}
                                  onClick={() => doUnlinkProduct(p.id)}
                                  title="Unlink product"
                                >
                                  <Icon name="cross" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search products to link..."
                            value={productSearch}
                            onChange={(e) => searchProducts(e.target.value)}
                          />
                          {productSearching && <Spinner size="sm" className="position-absolute" style={{ right: 10, top: 10 }} />}
                          {productResults.length > 0 && (
                            <div className="border rounded shadow-sm mt-1" style={{ position: "absolute", zIndex: 10, width: "100%", backgroundColor: "#fff", maxHeight: 240, overflowY: "auto" }}>
                              {productResults.map((p) => (
                                <div
                                  key={p.id}
                                  className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => doLinkProduct(p)}
                                >
                                  <div>
                                    <span className="fw-medium">{p.name}</span>
                                    {p.price != null && <span className="text-muted ms-2">${Number(p.price).toFixed(2)}</span>}
                                  </div>
                                  <Icon name="plus" className="text-success" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {linkedProducts.length === 0 && !productSearch && (
                          <p className="text-soft small mt-2 mb-0">No products linked yet. Search above to link a product to this recipe.</p>
                        )}
                    </>)}
                    </div>

                  </div>{/* /card-inner */}
                </div>{/* /card */}
              </Col>{/* /left panel */}

              {/* ── RIGHT PANEL: Live Preview ──────────────────────────────── */}
              <Col lg="5">
                <div style={{ position: "sticky", top: 80 }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-uppercase small fw-bold text-muted">Live Preview</span>
                    <div className="d-flex gap-2">
                      {editingRecipe?.id && (
                        <Button color="success" size="sm" onClick={loadExistingNutrition} disabled={analyzing}>
                          {analyzing ? <Spinner size="sm" /> : <><Icon name="bar-chart" /><span>Analyze Recipe</span></>}
                        </Button>
                      )}
                      <Button color="danger" size="sm" onClick={printRecipe} disabled={!form.name.trim()}>
                        <Icon name="printer" /><span>Print Recipe</span>
                      </Button>
                    </div>
                  </div>
                  {nutritionError && <div className="alert alert-warning py-1 px-2 small mb-2">{nutritionError}</div>}
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
                            {form.yieldOz && <Badge color="info" className="text-white">Yield: {form.yieldOz} oz</Badge>}
                            {form.containerSizeOz && form.yieldOz && (
                              <Badge color="success" className="text-white">
                                {Math.floor((parseFloat(form.yieldOz) / parseFloat(form.containerSizeOz)) * 10) / 10} x {form.containerSizeOz}oz containers
                              </Badge>
                            )}
                            {form.servingSizeQty && form.servingSizeUnit && (
                              <Badge color="light" className="text-dark border">Serving: {form.servingSizeQty} {form.servingSizeUnit}</Badge>
                            )}
                          </div>

                          {/* Ingredients list */}
                          {form.ingredients.some((i) => i.ingredientName.trim()) && (
                            <>
                              <h6 className="fw-bold mb-2" style={{ color: "#6b5a4e" }}>Ingredients</h6>
                              <ul className="list-unstyled small mb-3">
                                {form.ingredients.filter((i) => i.ingredientName.trim()).map((i) => (
                                  <li key={i.uid} className="mb-1">
                                    <span className="fw-semibold">{displayQty(i.quantity, i.fraction)} {i.unit}</span> — {i.ingredientName}
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

                          {/* Linked Products in preview */}
                          {linkedProducts.length > 0 && (
                            <div className="mt-3 pt-3" style={{ borderTop: "1px solid #e9ecef" }}>
                              <h6 className="fw-bold mb-2" style={{ color: "#6b5a4e" }}>
                                <Icon name="package" className="me-1" />Linked Products
                              </h6>
                              <div className="d-flex flex-wrap gap-2">
                                {linkedProducts.map((p) => (
                                  <Badge key={p.id} color="outline-primary" className="badge-sm">
                                    {p.name}{p.price != null ? ` — $${Number(p.price).toFixed(2)}` : ""}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Batch Calculator ─────────────────────────────────── */}
                  {form.ingredients.some((i) => i.ingredientName.trim() && combinedQty(i.quantity, i.fraction) > 0) && (
                    <div className="card card-bordered shadow-sm mt-3">
                      <div className="card-inner py-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="fw-bold mb-0">
                              <em className="icon ni ni-calc me-1" />Batch Calculator
                            </h6>
                            <p className="text-soft small mb-0">Scale ingredient quantities for any batch size.</p>
                          </div>
                          <div className="d-flex gap-1">
                            {[1, 2, 5, 10].map((n) => (
                              <button
                                key={n}
                                type="button"
                                className={`btn btn-sm ${batchScale === n ? "btn-primary" : "btn-outline-light"}`}
                                onClick={() => setBatchScale(n)}
                              >{n}×</button>
                            ))}
                          </div>
                        </div>

                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <label className="form-label small text-muted mb-1">Scale Factor</label>
                            <div className="input-group input-group-sm">
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                className="form-control"
                                value={batchScale}
                                onChange={(e) => setBatchScale(Math.max(0.1, parseFloat(e.target.value) || 1))}
                              />
                              <span className="input-group-text">×</span>
                            </div>
                          </div>
                          {form.yieldOz && form.containerSizeOz && (
                            <div className="col-6">
                              <label className="form-label small text-muted mb-1">Target Containers</label>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm"
                                value={Math.round(parseFloat(form.yieldOz) / parseFloat(form.containerSizeOz) * batchScale * 10) / 10}
                                onChange={(e) => {
                                  const target = parseFloat(e.target.value) || 1;
                                  const base = parseFloat(form.yieldOz) / parseFloat(form.containerSizeOz);
                                  setBatchScale(Math.max(0.1, Math.round((target / base) * 100) / 100));
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {(form.yieldOz || form.containerSizeOz) && (
                          <div className="mb-3 p-2 rounded d-flex flex-wrap gap-3" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}>
                            {form.yieldOz && (
                              <div>
                                <span className="small text-muted d-block">Scaled Yield</span>
                                <strong>{Math.round(parseFloat(form.yieldOz) * batchScale * 10) / 10} oz</strong>
                              </div>
                            )}
                            {form.yieldOz && form.containerSizeOz && (
                              <div>
                                <span className="small text-muted d-block">Containers</span>
                                <strong className="text-success">
                                  {Math.floor(parseFloat(form.yieldOz) * batchScale / parseFloat(form.containerSizeOz) * 10) / 10} × {form.containerSizeOz}oz
                                </strong>
                              </div>
                            )}
                            {batchScale !== 1 && (
                              <div>
                                <span className="small text-muted d-block">Multiplier</span>
                                <strong className="text-primary">{batchScale}×</strong>
                              </div>
                            )}
                          </div>
                        )}

                        <h6 className="fw-bold small mb-2" style={{ color: "#6b5a4e" }}>
                          Ingredients {batchScale !== 1 && <Badge color="primary" pill className="ms-1">{batchScale}× batch</Badge>}
                        </h6>
                        <div style={{ maxHeight: 260, overflowY: "auto" }}>
                          <table className="table table-sm table-borderless mb-0">
                            <tbody>
                              {form.ingredients.filter((i) => i.ingredientName.trim()).map((i) => {
                                const baseQty   = combinedQty(i.quantity, i.fraction);
                                const scaledNum = baseQty > 0 ? Math.round(baseQty * batchScale * 1000) / 1000 : "";
                                const changed   = batchScale !== 1 && baseQty > 0;
                                return (
                                  <tr key={i.uid}>
                                    <td className="ps-0 text-muted small">{i.ingredientName}</td>
                                    <td className={`text-end pe-0 fw-semibold small ${changed ? "text-primary" : ""}`}>
                                      {scaledNum} {i.unit}
                                      {changed && (
                                        <span className="text-muted ms-1" style={{ fontSize: 10 }}>
                                          (base: {displayQty(i.quantity, i.fraction)})
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                </div>{/* /sticky */}
              </Col>{/* /right panel */}

            </Row>
          </Block>

          {/* ── Nutrition Label Modal ────────────────────────────────── */}
          <Modal isOpen={nutritionModal} toggle={() => setNutritionModal(false)} size="lg">
            <ModalBody className="p-4">
              {nutritionData && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0 fw-bold">Nutrition Analysis — {form.name || "Recipe"}</h5>
                    <div className="d-flex gap-2">
                      <Button color="warning" size="sm" onClick={analyzeRecipeNutrition} disabled={analyzing}>
                        {analyzing ? <Spinner size="sm" /> : <><Icon name="reload" /><span>Re-analyze</span></>}
                      </Button>
                      <Button color="success" size="sm" onClick={downloadLabelPng} disabled={downloadingPng}>
                        {downloadingPng ? <Spinner size="sm" /> : <><Icon name="download" /><span>Download PNG</span></>}
                      </Button>
                      <Button color="primary" size="sm" onClick={printNutritionLabel}>
                        <Icon name="printer" /><span>Print Label</span>
                      </Button>
                      <Button color="light" size="sm" onClick={() => setNutritionModal(false)}>
                        <Icon name="cross" />
                      </Button>
                    </div>
                  </div>

                  {/* Container yield summary */}
                  {(nutritionData.totalRecipeOz || nutritionData.containersYielded) && (
                    <div className="mb-3 p-3 rounded d-flex flex-wrap gap-4" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}>
                      {nutritionData.totalRecipeOz > 0 && (
                        <div><span className="small text-muted d-block">Total Yield</span><strong>{nutritionData.totalRecipeOz} oz</strong></div>
                      )}
                      {nutritionData.containerSizeOz && (
                        <div><span className="small text-muted d-block">Container Size</span><strong>{nutritionData.containerSizeOz} oz</strong></div>
                      )}
                      {nutritionData.containersYielded && (
                        <div><span className="small text-muted d-block">Containers Yielded</span><strong className="text-success">{nutritionData.containersYielded}</strong></div>
                      )}
                      <div><span className="small text-muted d-block">Serving Size</span><strong>{nutritionData.servingSize}</strong></div>
                      <div><span className="small text-muted d-block">Servings per Recipe</span><strong>{nutritionData.servingsPerRecipe}</strong></div>
                    </div>
                  )}

                  <div className="row g-4">
                    {/* Left: FDA-style Nutrition Label */}
                    <div className="col-md-6">
                      <div id="nutrition-label-print">
                        <NutritionLabel data={nutritionData} recipeName={form.name} />
                      </div>
                    </div>

                    {/* Right: Ingredient Match Details */}
                    <div className="col-md-6">
                      <h6 className="fw-bold mb-3" style={{ borderBottom: "2px solid #e9ecef", paddingBottom: 8 }}>
                        Ingredient Analysis
                      </h6>
                      {nutritionData.ingredientMatches?.length > 0 ? (
                        <div style={{ maxHeight: 500, overflowY: "auto" }}>
                          {nutritionData.ingredientMatches.map((m, i) => (
                            <div key={i} className="mb-3 p-2 rounded" style={{ border: "1px solid #e9ecef", backgroundColor: m.matched ? "#f0fdf4" : "#fef2f2" }}>
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <span style={{ fontSize: 14 }}>{m.matched ? "\u2705" : "\u274C"}</span>
                                <strong className="small">{m.quantity} {m.unit} {m.ingredientName}</strong>
                              </div>
                              {m.matched && (
                                <div className="small text-muted">
                                  Matched: <em>{m.usdaFood}</em>
                                  <br />({m.gramsUsed}g used for calculation)
                                </div>
                              )}
                              {m.error && <div className="small text-danger">{m.error}</div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted small">No ingredient data available.</p>
                      )}
                      <div className="mt-3 p-2 rounded small" style={{ backgroundColor: "#f8f9fa", border: "1px solid #e9ecef" }}>
                        <strong>Note:</strong> Values are estimates from USDA FoodData Central.
                        Unit-to-gram conversions use standard approximations.
                        Results may vary based on ingredient brands and preparation methods.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </ModalBody>
          </Modal>

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
