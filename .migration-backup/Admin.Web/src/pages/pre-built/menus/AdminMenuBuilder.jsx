import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spinner, Badge } from "reactstrap";
import Head from "@/layout/head/Head";
import Content from "@/layout/content/Content";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_ICONS = [
  { label: "None", value: "" },
  { label: "🍽 Bowl",   value: "bowl"   },
  { label: "🥩 Meat",   value: "meat"   },
  { label: "🥗 Vegs",   value: "leaf"   },
  { label: "☕ Drinks", value: "cup"    },
  { label: "🍰 Dessert",value: "cake"   },
];

const THEMES = [
  { label: "Default", value: "default", bg: "#ffffff", accent: "#16c784", text: "#1c2b46" },
  { label: "Dark",    value: "dark",    bg: "#1a1a2e", accent: "#e94560", text: "#eaeaea" },
  { label: "Warm",    value: "warm",    bg: "#fdf6ec", accent: "#e67e22", text: "#5d4037" },
  { label: "Cool",    value: "cool",    bg: "#eaf4fb", accent: "#2980b9", text: "#1a3a4a" },
  { label: "Light",   value: "light",   bg: "#f8f9fa", accent: "#6c757d", text: "#343a40" },
];

const ICON_MAP = {
  bowl: "🍽", meat: "🥩", leaf: "🥗", cup: "☕", cake: "🍰",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid  = () => Math.random().toString(36).slice(2);
const fmt$ = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "");

const blankItem = () => ({
  _uid: uid(), _isNew: true,
  name: "", description: "", basePrice: "", pricingModel: "each",
  isActive: true, mediaAssetId: null, mediaUrl: null, sectionId: null,
  priceOverride: "",
});

// ─── Section Icon badge ───────────────────────────────────────────────────────

const SectionBadge = ({ icon }) => (
  <span style={{ marginRight: 6 }}>{ICON_MAP[icon] ?? "🍴"}</span>
);

// ─── Preview Card ─────────────────────────────────────────────────────────────

const MenuPreview = ({ menu, sections, items, layout, theme }) => {
  const t = THEMES.find((x) => x.value === theme) ?? THEMES[0];

  const sectionedItems = sections.map((sec) => ({
    ...sec,
    previewItems: items.filter((it) => it.sectionId === sec.id && it.name.trim()),
  })).filter((sec) => sec.name.trim());

  const colCount = layout === "1col" ? 1 : 2;

  return (
    <div
      style={{
        background: t.bg, color: t.text, borderRadius: 12, padding: "28px 24px",
        border: `2px solid ${t.accent}22`, fontFamily: "'Segoe UI', sans-serif",
        minHeight: 400,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ marginBottom: 8 }}>
          <img
            src="https://cdn.thejigglingpig.com/media/2026/03/79b614aa-f325-4b91-b81c-9a2c63aaa89a.png"
            alt="The Jiggling Pig, LLC"
            style={{ maxHeight: 64, objectFit: "contain" }}
          />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: "1.6rem", color: t.text, margin: 0 }}>
          {menu?.name || <span style={{ opacity: 0.4 }}>Menu Title</span>}
        </h2>
        <div style={{ fontSize: "0.7rem", letterSpacing: 3, opacity: 0.5, marginTop: 4 }}>
          ESTABLISHED {new Date().getFullYear()}
        </div>
        <div style={{ width: 40, height: 3, background: t.accent, margin: "10px auto 0" }} />
      </div>

      {/* Sections grid */}
      {sectionedItems.length === 0 ? (
        <div style={{ textAlign: "center", opacity: 0.35, paddingTop: 32 }}>
          <div style={{ fontSize: 48 }}>🍽</div>
          <p style={{ marginTop: 12 }}>Add sections and food items to see the preview</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${colCount}, 1fr)`,
            gap: "24px 32px",
          }}
        >
          {sectionedItems.map((sec) => (
            <div key={sec.id}>
              {/* Section header */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  borderBottom: `2px solid ${t.accent}44`, paddingBottom: 6, marginBottom: 12,
                }}
              >
                <SectionBadge icon={sec.icon} />
                <span style={{ fontWeight: 700, fontSize: "0.75rem", letterSpacing: 2, textTransform: "uppercase" }}>
                  {sec.name}
                </span>
              </div>
              {/* Items */}
              {sec.previewItems.map((item) => (
                <div key={item._uid ?? item.id} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  {item.mediaUrl && (
                    <img
                      src={item.mediaUrl} alt={item.name}
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: t.accent, fontSize: "0.9rem", whiteSpace: "nowrap", marginLeft: 8 }}>
                        {fmt$(item.priceOverride !== "" ? item.priceOverride : item.basePrice)}
                      </span>
                    </div>
                    {item.description && (
                      <p style={{ fontSize: "0.75rem", opacity: 0.7, margin: "3px 0 0", lineHeight: 1.4 }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── AdminMenuBuilder Component ───────────────────────────────────────────────

const AdminMenuBuilder = () => {
  const { menuId } = useParams();
  const navigate    = useNavigate();
  const fileRefs    = useRef({});

  // ── Loading / error ──────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [publishing, setPublishing] = useState(false);

  // ── Menu meta ─────────────────────────────────────────────────────────────
  const [menu,      setMenu]      = useState(null);
  const [menuTitle, setMenuTitle] = useState("");
  const [menuType,  setMenuType]  = useState("catering");
  const [isActive,  setIsActive]  = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  // ── Design controls ───────────────────────────────────────────────────────
  const [layout,  setLayout]  = useState("2col");
  const [theme,   setTheme]   = useState("default");

  // ── Sections & items ──────────────────────────────────────────────────────
  const [sections, setSections] = useState([]);
  const [items,    setItems]    = useState([]);

  // ── Section form ──────────────────────────────────────────────────────────
  const [newSecName, setNewSecName] = useState("");
  const [newSecIcon, setNewSecIcon] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  // ── Photo upload state ────────────────────────────────────────────────────
  const [uploadingItem, setUploadingItem] = useState(null);

  // ── Load builder payload ──────────────────────────────────────────────────
  const loadBuilder = useCallback(async () => {
    if (!menuId) return;
    setLoading(true); setError(null);
    try {
      const res = await apiGet(`/menus/${menuId}/builder`);
      const m   = res?.data ?? res;
      setMenu(m);
      setMenuTitle(m.name ?? "");
      setMenuType(m.menuType ?? "catering");
      setIsActive(m.isActive ?? true);
      setStartDate(m.startDate ? m.startDate.slice(0, 10) : "");
      setEndDate(m.endDate   ? m.endDate.slice(0, 10)   : "");
      setLayout(m.layout ?? "2col");
      setTheme(m.theme   ?? "default");

      const secs = m.sections ?? [];
      setSections(secs.map((s) => ({ id: s.id, name: s.name, icon: s.icon ?? "", displayOrder: s.displayOrder })));

      // Flatten items from all sections
      const flat = [];
      secs.forEach((sec) => {
        (sec.items ?? []).forEach((si) => {
          const mi = si.menuItem;
          flat.push({
            _uid: uid(),
            id: mi.id,
            sectionItemId: `${sec.id}__${mi.id}`,
            sectionId: sec.id,
            name: mi.name ?? "",
            description: mi.description ?? "",
            basePrice: mi.basePrice ?? "",
            priceOverride: si.priceOverride ?? "",
            pricingModel: mi.pricingModel ?? "each",
            isActive: mi.isActive ?? true,
            mediaAssetId: mi.mediaAssetId ?? null,
            mediaUrl: mi.mediaAsset?.url ?? null,
            displayOrder: si.displayOrder,
          });
        });
      });
      setItems(flat);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [menuId]);

  useEffect(() => { loadBuilder(); }, [loadBuilder]);

  // ── Save menu meta ────────────────────────────────────────────────────────
  const saveMenu = async () => {
    setSaving(true); setSaveError(null);
    try {
      await apiPatch(`/menus/${menuId}`, {
        name: menuTitle, menuType, isActive, layout, theme,
        startDate: startDate || undefined,
        endDate:   endDate   || undefined,
      });
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  // ── Publish ───────────────────────────────────────────────────────────────
  const publishMenu = async () => {
    setPublishing(true); setSaveError(null);
    try {
      await saveMenu();
      await apiPost(`/menus/${menuId}/publish`, {});
      setMenu((m) => ({ ...m, isPublished: true }));
    } catch (e) { setSaveError(e.message); }
    finally { setPublishing(false); }
  };

  // ── Section CRUD ──────────────────────────────────────────────────────────
  const addSection = async () => {
    if (!newSecName.trim()) return;
    setAddingSection(true);
    try {
      const res = await apiPost(`/menus/${menuId}/sections`, {
        name: newSecName.trim(), icon: newSecIcon, displayOrder: sections.length,
      });
      const sec = res?.data ?? res;
      setSections((s) => [...s, { id: sec.id, name: sec.name, icon: sec.icon ?? "", displayOrder: sec.displayOrder }]);
      setNewSecName(""); setNewSecIcon("");
    } catch (e) { setSaveError(e.message); }
    finally { setAddingSection(false); }
  };

  const deleteSection = async (secId) => {
    try {
      await apiDelete(`/menus/${menuId}/sections/${secId}`);
      setSections((s) => s.filter((x) => x.id !== secId));
      setItems((its) => its.filter((i) => i.sectionId !== secId));
    } catch (e) { setSaveError(e.message); }
  };

  // ── Item CRUD ─────────────────────────────────────────────────────────────
  const addItem = () => {
    setItems((its) => [...its, blankItem()]);
  };

  const updateItemField = (uid, field, val) => {
    setItems((its) => its.map((i) => i._uid === uid ? { ...i, [field]: val } : i));
  };

  const saveItem = async (item) => {
    try {
      const body = {
        name: item.name.trim(), description: item.description || undefined,
        basePrice: item.basePrice !== "" ? Number(item.basePrice) : undefined,
        pricingModel: item.pricingModel ?? "each", isActive: item.isActive,
        mediaAssetId: item.mediaAssetId || undefined,
      };
      if (item._isNew) {
        // Create the menu item globally, then assign to section
        const res = await apiPost(`/menus/items`, body);
        const mi  = res?.data ?? res;
        if (item.sectionId) {
          await apiPost(`/menus/${menuId}/sections/${item.sectionId}/items`, {
            menuItemId: mi.id,
            priceOverride: item.priceOverride !== "" ? Number(item.priceOverride) : undefined,
            displayOrder: items.filter((x) => x.sectionId === item.sectionId).length,
          });
        }
        setItems((its) => its.map((i) => i._uid === item._uid
          ? { ...i, id: mi.id, _isNew: false, mediaUrl: mi.mediaAsset?.url ?? null }
          : i));
      } else {
        await apiPatch(`/menus/items/${item.id}`, body);
        if (item.sectionId && item.priceOverride !== "") {
          await apiPatch(`/menus/${menuId}/sections/${item.sectionId}/items/${item.id}`, {
            priceOverride: Number(item.priceOverride),
          });
        }
      }
    } catch (e) { setSaveError(e.message); }
  };

  const deleteItem = async (item) => {
    if (!item._isNew) {
      try {
        if (item.sectionId) await apiDelete(`/menus/${menuId}/sections/${item.sectionId}/items/${item.id}`);
        await apiDelete(`/menus/items/${item.id}`);
      } catch (e) { setSaveError(e.message); return; }
    }
    setItems((its) => its.filter((i) => i._uid !== item._uid));
  };

  const changeSection = async (item, newSectionId) => {
    if (!item._isNew && item.sectionId && item.id) {
      try {
        // Remove from old section
        await apiDelete(`/menus/${menuId}/sections/${item.sectionId}/items/${item.id}`);
        // Add to new section
        if (newSectionId) {
          await apiPost(`/menus/${menuId}/sections/${newSectionId}/items`, {
            menuItemId: item.id,
            priceOverride: item.priceOverride !== "" ? Number(item.priceOverride) : undefined,
            displayOrder: items.filter((x) => x.sectionId === newSectionId).length,
          });
        }
      } catch (e) { setSaveError(e.message); }
    }
    updateItemField(item._uid, "sectionId", newSectionId);
  };

  // ── Photo upload ──────────────────────────────────────────────────────────
  const pickPhoto = (item) => {
    if (!fileRefs.current[item._uid]) return;
    fileRefs.current[item._uid].click();
  };

  const onPhotoChange = async (item, file) => {
    if (!file) return;
    setUploadingItem(item._uid);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "menus");
      const res = await apiUpload("/media", fd);
      const asset = res?.data ?? res;
      updateItemField(item._uid, "mediaAssetId", asset.id);
      updateItemField(item._uid, "mediaUrl", asset.url);
      if (!item._isNew && item.id) {
        await apiPatch(`/menus/items/${item.id}`, { mediaAssetId: asset.id });
      }
    } catch (e) { setSaveError(e.message); }
    finally { setUploadingItem(null); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <Content><div className="text-center py-5"><Spinner /><p className="mt-3 text-muted">Loading builder…</p></div></Content>
  );

  if (error) return (
    <Content>
      <div className="alert alert-danger">{error}</div>
      <Button color="light" onClick={() => navigate("/menus")}>← Back to Menus</Button>
    </Content>
  );

  const currentTheme = THEMES.find((t) => t.value === theme) ?? THEMES[0];

  return (
    <React.Fragment>
      <Head title={`Menu Builder — ${menuTitle || "Untitled"}`} />
      <Content>

        {/* ── Top bar ────────────────────────────────────────────────────────── */}
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <Button color="light" size="sm" onClick={() => navigate("/menus")} className="mb-2">
                <Icon name="arrow-left" /><span>Back to Menus</span>
              </Button>
              <BlockTitle page>
                Menu Builder
                {menu?.isPublished && <Badge color="success" className="ms-2" style={{ fontSize: "0.65rem" }}>Published</Badge>}
              </BlockTitle>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="d-flex gap-2 align-items-center">
                {saveError && <span className="text-danger small">{saveError}</span>}
                <Button color="light" onClick={saveMenu} disabled={saving}>
                  {saving ? <Spinner size="sm" /> : <><Icon name="save" /><span>Save Menu</span></>}
                </Button>
                <Button color="success" onClick={publishMenu} disabled={publishing || saving}>
                  {publishing ? <Spinner size="sm" /> : <><Icon name="upload-cloud" /><span>Publish</span></>}
                </Button>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <Row className="g-4" style={{ minHeight: "80vh" }}>

            {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
            <Col lg="4" xl="3">
              <div
                style={{
                  position: "sticky", top: 80, maxHeight: "calc(100vh - 120px)",
                  overflowY: "auto", paddingRight: 10,
                }}
              >

                {/* ── Menu Identity ──────────────────────────────────────── */}
                <div className="card card-bordered mb-3">
                  <div className="card-inner py-3">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <Icon name="menu-squared" style={{ color: "#16c784" }} />
                      <span className="fw-bold text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: 1 }}>Menu Identity</span>
                    </div>

                    <div className="form-group mb-2">
                      <label className="form-label form-label-sm text-muted">MENU TITLE</label>
                      <input
                        className="form-control form-control-sm"
                        placeholder="e.g. March Madness BBQ"
                        value={menuTitle}
                        onChange={(e) => setMenuTitle(e.target.value)}
                      />
                    </div>

                    <div className="form-group mb-2">
                      <label className="form-label form-label-sm text-muted">TYPE</label>
                      <select className="form-select form-select-sm" value={menuType} onChange={(e) => setMenuType(e.target.value)}>
                        <option value="catering">Catering</option>
                        <option value="truck">Food Truck</option>
                        <option value="event">Event</option>
                      </select>
                    </div>

                    <Row className="g-2 mb-2">
                      <Col size="6">
                        <label className="form-label form-label-sm text-muted">START DATE</label>
                        <input type="date" className="form-control form-control-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      </Col>
                      <Col size="6">
                        <label className="form-label form-label-sm text-muted">END DATE</label>
                        <input type="date" className="form-control form-control-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </Col>
                    </Row>

                    <div className="form-check form-switch mt-1">
                      <input
                        type="checkbox" className="form-check-input" id="activeSwitch"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <label className="form-check-label small" htmlFor="activeSwitch">Active</label>
                    </div>
                  </div>
                </div>

                {/* ── Design Controls ────────────────────────────────────── */}
                <div className="card card-bordered mb-3">
                  <div className="card-inner py-3">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <Icon name="setting-alt" style={{ color: "#16c784" }} />
                      <span className="fw-bold text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: 1 }}>Design Controls</span>
                    </div>

                    {/* Layout toggle */}
                    <div className="mb-3">
                      <label className="form-label form-label-sm text-muted">LAYOUT</label>
                      <div className="d-flex gap-2">
                        {["1col", "2col"].map((lv) => (
                          <button
                            key={lv}
                            type="button"
                            className={`btn btn-sm ${layout === lv ? "btn-primary" : "btn-outline-light"}`}
                            style={{ minWidth: 54, fontSize: "0.7rem" }}
                            onClick={() => setLayout(lv)}
                          >
                            {lv === "1col" ? "1 Col" : "2 Col"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Theme */}
                    <div className="mb-2">
                      <label className="form-label form-label-sm text-muted">VISUAL THEME</label>
                      <select className="form-select form-select-sm mb-2" value={theme} onChange={(e) => setTheme(e.target.value)}>
                        {THEMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {/* Swatches */}
                      <div className="d-flex gap-2">
                        {THEMES.map((t) => (
                          <button
                            key={t.value}
                            type="button"
                            title={t.label}
                            onClick={() => setTheme(t.value)}
                            style={{
                              width: 28, height: 28, borderRadius: "50%", border: `2px solid ${theme === t.value ? t.accent : "#dee2e6"}`,
                              background: t.bg, cursor: "pointer", padding: 0,
                              boxShadow: theme === t.value ? `0 0 0 2px ${t.accent}66` : "none",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Sections ───────────────────────────────────────────── */}
                <div className="card card-bordered mb-3">
                  <div className="card-inner py-3">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <Icon name="folder" style={{ color: "#16c784" }} />
                      <span className="fw-bold text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: 1 }}>Sections</span>
                      <Badge color="secondary" pill className="ms-auto">{sections.length}</Badge>
                    </div>

                    {sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="d-flex align-items-center justify-content-between gap-2 mb-2 px-2 py-2 rounded"
                        style={{ background: "#f8f9fa", border: "1px solid #e9ecef" }}
                      >
                        <span className="small fw-semibold flex-grow-1 text-truncate">
                          {ICON_MAP[sec.icon] && <span className="me-1">{ICON_MAP[sec.icon]}</span>}
                          {sec.name}
                        </span>
                        <button
                          type="button"
                          className="btn btn-icon btn-sm flex-shrink-0"
                          style={{ minWidth: 36, minHeight: 36, width: 36, height: 36, border: "none", color: "#e85347" }}
                          onClick={() => deleteSection(sec.id)}
                          title="Remove section"
                        >
                          <Icon name="cross" />
                        </button>
                      </div>
                    ))}

                    {/* Add section */}
                    <div className="mt-3 d-flex align-items-center gap-2 flex-wrap">
                      <select
                        className="form-select form-select-sm flex-shrink-0"
                        style={{ width: 56 }}
                        value={newSecIcon}
                        onChange={(e) => setNewSecIcon(e.target.value)}
                      >
                        {SECTION_ICONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <input
                        className="form-control form-control-sm flex-grow-1"
                        style={{ minWidth: 120 }}
                        placeholder="Section name…"
                        value={newSecName}
                        onChange={(e) => setNewSecName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSection()}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success flex-shrink-0 d-flex align-items-center justify-content-center"
                        style={{ minWidth: 40, minHeight: 38 }}
                        onClick={addSection}
                        disabled={addingSection}
                        title="Add section"
                      >
                        {addingSection ? <Spinner size="sm" /> : <Icon name="plus" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Food Items ─────────────────────────────────────────── */}
                <div className="card card-bordered">
                  <div className="card-inner py-3">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <Icon name="bowl" style={{ color: "#16c784" }} />
                      <span className="fw-bold text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: 1 }}>Food Items</span>
                      <Badge color="secondary" pill className="ms-auto">{items.length} Items</Badge>
                    </div>

                    {items.map((item) => (
                      <div
                        key={item._uid}
                        className="mb-4 p-3 rounded"
                        style={{ border: "1px solid #e9ecef", background: "#fff", overflow: "visible" }}
                      >
                        {/* Section (category) — own row at top */}
                        <div className="mb-2">
                          <label className="form-label form-label-sm text-muted mb-1 d-block" style={{ fontSize: "0.65rem", letterSpacing: "0.05em" }}>
                            SECTION
                          </label>
                          <select
                            className="form-select form-select-sm"
                            value={item.sectionId ?? ""}
                            onChange={(e) => changeSection(item, e.target.value || null)}
                          >
                            <option value="">— No section —</option>
                            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>

                        {/* Name + price + delete — clear row */}
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <input
                            className="form-control form-control-sm fw-semibold flex-grow-1"
                            style={{ minWidth: 0 }}
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => updateItemField(item._uid, "name", e.target.value)}
                            onBlur={() => item.name.trim() && saveItem(item)}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control form-control-sm text-end flex-shrink-0"
                            style={{ width: 80 }}
                            placeholder="0.00"
                            value={item.basePrice}
                            onChange={(e) => updateItemField(item._uid, "basePrice", e.target.value)}
                            onBlur={() => item.name.trim() && saveItem(item)}
                          />
                          <button
                            type="button"
                            className="btn btn-icon btn-sm flex-shrink-0"
                            style={{ minWidth: 36, minHeight: 36, width: 36, height: 36, border: "none", color: "#e85347" }}
                            onClick={() => deleteItem(item)}
                            title="Remove item"
                          >
                            <Icon name="trash" />
                          </button>
                        </div>

                        {/* Description — own row */}
                        <textarea
                          className="form-control form-control-sm mb-3"
                          rows={2}
                          placeholder="Short description…"
                          value={item.description}
                          onChange={(e) => updateItemField(item._uid, "description", e.target.value)}
                          onBlur={() => item.name.trim() && saveItem(item)}
                        />

                        {/* Add Photo — own row, no overlap with name */}
                        <div className="d-flex align-items-center gap-2">
                          <input
                            ref={(el) => { if (el) fileRefs.current[item._uid] = el; }}
                            type="file"
                            accept="image/*"
                            className="d-none"
                            onChange={(e) => onPhotoChange(item, e.target.files?.[0])}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2 px-3 py-2"
                            style={{ minHeight: 38, fontSize: "0.8125rem" }}
                            onClick={() => pickPhoto(item)}
                            disabled={uploadingItem === item._uid}
                            title={item.mediaUrl ? "Change photo" : "Add photo"}
                          >
                            {uploadingItem === item._uid ? (
                              <Spinner size="sm" />
                            ) : (
                              <>
                                <Icon name={item.mediaUrl ? "reload" : "img"} className="flex-shrink-0" />
                                <span className="text-nowrap">{item.mediaUrl ? "Change" : "Add Photo"}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Photo preview thumbnail */}
                        {item.mediaUrl && (
                          <img
                            src={item.mediaUrl}
                            alt={item.name}
                            className="mt-2"
                            style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 6 }}
                          />
                        )}
                      </div>
                    ))}

                    <button type="button" className="btn btn-sm btn-outline-success w-100 mt-3 d-flex align-items-center justify-content-center gap-2 py-2" onClick={addItem}>
                      <Icon name="plus" /><span>Add New Food Item</span>
                    </button>
                  </div>
                </div>

              </div>
            </Col>

            {/* ── RIGHT PANEL — Live Preview ──────────────────────────────── */}
            <Col lg="8" xl="9">
              <div style={{ position: "sticky", top: 80 }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-uppercase small fw-bold text-muted">
                    <Icon name="view-grid" className="me-1" />Live Preview
                  </span>
                  <span className="text-soft small">
                    Layout: <strong>{layout === "1col" ? "1 Column" : "2 Columns"}</strong>
                    &nbsp;·&nbsp;Theme: <strong>{currentTheme.label}</strong>
                  </span>
                </div>

                <div className="card card-bordered shadow-sm p-2">
                  <MenuPreview
                    menu={{ name: menuTitle }}
                    sections={sections}
                    items={items}
                    layout={layout}
                    theme={theme}
                  />
                </div>

                {/* Live sync indicator */}
                <div
                  className="d-flex align-items-center justify-content-end gap-2 mt-2"
                  style={{ fontSize: "0.72rem", color: "#8094ae" }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16c784", display: "inline-block" }} />
                  Live Sync Active
                </div>
              </div>
            </Col>

          </Row>
        </Block>
      </Content>
    </React.Fragment>
  );
};

export { MenuPreview };
export default AdminMenuBuilder;


