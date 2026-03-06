import React, { useState, useEffect, useCallback, useRef } from "react";
import Dropzone from "react-dropzone";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, Spinner, Nav, NavItem, NavLink, TabContent, TabPane, Progress } from "reactstrap";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button, RSelect,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";
import { Editor } from "@tinymce/tinymce-react";
import { useTheme } from "@/layout/provider/Theme";
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/content/default/content";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/charmap";
import "tinymce/plugins/preview";
import "tinymce/plugins/anchor";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/media";
import "tinymce/plugins/table";
import "tinymce/plugins/help";
import "tinymce/plugins/wordcount";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];
const STATUS_COLORS = { draft: "secondary", scheduled: "warning", published: "success", archived: "danger" };

const toSlug = (t) =>
  t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const stripHtml = (html) => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const BLANK_FORM = {
  title: "", slug: "", excerpt: "", bodyHtml: "",
  status: STATUS_OPTIONS[0], categoryIds: [], tagIds: [],
  publishedAt: "", featuredMediaAssetId: null,
};

const AdminNewsList = () => {
  const theme = useTheme();

  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemPerPage, setItemPerPage]   = useState(10);
  const [sort, setSort]                 = useState("desc");
  const [sortField, setSortField]       = useState("publishedAt");

  const [posts, setPosts]               = useState([]);
  const [totalItems, setTotalItems]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [tagOptions, setTagOptions]           = useState([]);
  const [statusFilter, setStatusFilter]       = useState(null);
  const [categoryFilter, setCategoryFilter]   = useState(null);

  const [addModal, setAddModal]         = useState(false);
  const [addForm, setAddForm]           = useState(BLANK_FORM);
  const [addSaving, setAddSaving]       = useState(false);
  const [addError, setAddError]         = useState(null);
  const [addTab, setAddTab]             = useState("content");

  const [editModal, setEditModal]       = useState(false);
  const [editPost, setEditPost]         = useState(null);
  const [editForm, setEditForm]         = useState(BLANK_FORM);
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState(null);
  const [editTab, setEditTab]           = useState("content");

  const [imageFile, setImageFile]           = useState(null);
  const [imagePreview, setImagePreview]     = useState(null);
  const [imageUploading, setImageUploading] = useState(null);
  const [imageError, setImageError]         = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  const [deleteModal, setDeleteModal]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [emailModal, setEmailModal]     = useState(false);
  const [emailTarget, setEmailTarget]   = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailProgress, setEmailProgress] = useState(null);
  const [emailResult, setEmailResult]   = useState(null);

  const [previewModal, setPreviewModal] = useState(false);
  const [previewPost, setPreviewPost]   = useState(null);

  const searchTimer = useRef(null);

  const loadPosts = useCallback(async (overrides = {}) => {
    setLoading(true); setError(null);
    try {
      const opts = {
        page: currentPage, limit: itemPerPage, order: sort, orderBy: sortField,
        postType: "news",
        status: statusFilter?.value ?? undefined,
        categoryId: categoryFilter?.value ?? undefined,
        search: searchText || undefined,
        ...overrides,
      };
      const qs = Object.entries(opts)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const res = await apiGet(`/content?${qs}`);
      setPosts(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [currentPage, itemPerPage, sort, sortField, statusFilter, categoryFilter, searchText]);

  useEffect(() => {
    (async () => {
      try {
        const [cats, tags] = await Promise.all([apiGet("/content/categories"), apiGet("/content/tags")]);
        setCategoryOptions((Array.isArray(cats) ? cats : cats?.data ?? []).map((c) => ({ label: c.name, value: c.id })));
        setTagOptions((Array.isArray(tags) ? tags : tags?.data ?? []).map((t) => ({ label: t.name, value: t.id })));
      } catch { /* non-fatal */ }
    })();
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const onSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setCurrentPage(1); loadPosts({ page: 1, search: val || undefined }); }, 400);
  };

  const openAddModal = () => {
    setAddForm(BLANK_FORM); setImageFile(null); setImagePreview(null);
    setImageError(null); setExistingImageUrl(null); setAddError(null); setAddTab("content");
    setAddModal(true);
  };

  const openEditModal = (post) => {
    setEditPost(post);
    setEditForm({
      title: post.title ?? "", slug: post.slug ?? "", excerpt: post.excerpt ?? "",
      bodyHtml: post.bodyHtml ?? "",
      status: STATUS_OPTIONS.find((o) => o.value === post.status) ?? STATUS_OPTIONS[0],
      categoryIds: (post.categories ?? []).map((c) => ({ label: c.category?.name, value: c.category?.id })),
      tagIds: (post.tags ?? []).map((t) => ({ label: t.tag?.name, value: t.tag?.id })),
      publishedAt: post.publishedAt ? post.publishedAt.substring(0, 16) : "",
      featuredMediaAssetId: post.featuredMediaAssetId ?? null,
    });
    setExistingImageUrl(post.featuredMediaAsset?.url ?? null);
    setImageFile(null); setImagePreview(null); setImageError(null); setEditError(null); setEditTab("content");
    setEditModal(true);
  };

  const confirmDelete = (post) => { setDeleteTarget(post); setDeleteModal(true); };

  const doDelete = async () => {
    setDeleteLoading(true);
    try { await apiDelete(`/content/${deleteTarget.id}`); setDeleteModal(false); setDeleteTarget(null); loadPosts(); }
    catch (e) { alert(e.message); }
    finally { setDeleteLoading(false); }
  };

  const openPreview = (post) => { setPreviewPost(post); setPreviewModal(true); };

  const openEmailModal = (post) => {
    setEmailTarget(post); setEmailResult(null); setEmailProgress(null); setEmailModal(true);
  };

  const doSendEmail = async () => {
    if (!emailTarget) return;
    setEmailSending(true); setEmailResult(null); setEmailProgress({ sent: 0, total: 0, errors: 0 });
    try {
      const subsRes = await apiGet("/subscribers?limit=500&optInEmail=true");
      const subscribers = (subsRes?.data ?? subsRes ?? []).filter((s) => s.emailAddress && s.optInEmail !== false);
      if (subscribers.length === 0) {
        setEmailResult({ success: false, message: "No subscribers with email opt-in found." });
        setEmailSending(false);
        return;
      }
      setEmailProgress({ sent: 0, total: subscribers.length, errors: 0 });

      const imgTag = emailTarget.featuredMediaAsset?.url
        ? `<img src="${emailTarget.featuredMediaAsset.url}" alt="${emailTarget.title}" style="max-width:100%;height:auto;border-radius:8px;margin-bottom:16px;" />`
        : "";
      const subject = `News: ${emailTarget.title}`;
      const bodyHtml = `
        <div style="max-width:640px;margin:0 auto;font-family:sans-serif;color:#333;">
          <h1 style="color:#1a1a2e;margin-bottom:8px;">${emailTarget.title}</h1>
          <p style="color:#6c757d;font-size:13px;margin-bottom:16px;">Published ${fmtDateTime(emailTarget.publishedAt)}</p>
          ${imgTag}
          ${emailTarget.excerpt ? `<p style="font-size:15px;color:#555;font-style:italic;border-left:3px solid #6576ff;padding-left:12px;margin-bottom:16px;">${emailTarget.excerpt}</p>` : ""}
          <div style="font-size:15px;line-height:1.7;">${emailTarget.bodyHtml}</div>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="font-size:12px;color:#999;">You received this because you subscribed to news updates from The Jiggling Pig.</p>
        </div>
      `;
      const bodyText = stripHtml(emailTarget.bodyHtml);

      let sent = 0, errors = 0;
      for (const sub of subscribers) {
        try {
          await apiPost("/notifications/send", {
            to: sub.emailAddress,
            subject,
            bodyHtml,
            bodyText,
          });
          sent++;
        } catch {
          errors++;
        }
        setEmailProgress({ sent: sent + errors, total: subscribers.length, errors });
      }

      setEmailResult({
        success: true,
        message: `Sent to ${sent} subscriber${sent !== 1 ? "s" : ""}${errors > 0 ? ` (${errors} failed)` : ""}.`,
      });
    } catch (e) {
      setEmailResult({ success: false, message: e.message });
    } finally {
      setEmailSending(false);
    }
  };

  const uploadFeaturedImage = async (file, mode) => {
    setImageUploading(mode); setImageError(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "news");
      const res = await apiUpload("/media/upload", fd);
      return (res?.data ?? res)?.id ?? null;
    } catch (e) { setImageError(e.message); return null; }
    finally { setImageUploading(null); }
  };

  const onAddSubmit = async () => {
    setAddSaving(true); setAddError(null);
    try {
      let featuredMediaAssetId = addForm.featuredMediaAssetId;
      if (imageFile) { featuredMediaAssetId = await uploadFeaturedImage(imageFile, "add"); }
      await apiPost("/content", {
        postType: "news", title: addForm.title,
        slug: addForm.slug || toSlug(addForm.title),
        excerpt: addForm.excerpt || undefined,
        bodyHtml: addForm.bodyHtml,
        status: addForm.status?.value ?? "draft",
        featuredMediaAssetId: featuredMediaAssetId ?? undefined,
        publishedAt: addForm.publishedAt ? new Date(addForm.publishedAt).toISOString() : undefined,
        categoryIds: addForm.categoryIds.map((c) => c.value),
        tagIds: addForm.tagIds.map((t) => t.value),
      });
      setAddModal(false); loadPosts();
    } catch (e) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  const onEditSubmit = async () => {
    setEditSaving(true); setEditError(null);
    try {
      let featuredMediaAssetId = editForm.featuredMediaAssetId;
      if (imageFile) { featuredMediaAssetId = await uploadFeaturedImage(imageFile, "edit"); }
      await apiPatch(`/content/${editPost.id}`, {
        title: editForm.title, slug: editForm.slug,
        excerpt: editForm.excerpt || undefined,
        bodyHtml: editForm.bodyHtml,
        status: editForm.status?.value ?? "draft",
        featuredMediaAssetId: featuredMediaAssetId ?? undefined,
        publishedAt: editForm.publishedAt ? new Date(editForm.publishedAt).toISOString() : undefined,
        categoryIds: editForm.categoryIds.map((c) => c.value),
        tagIds: editForm.tagIds.map((t) => t.value),
      });
      setEditModal(false); loadPosts();
    } catch (e) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  const tinymceInit = {
    height: 420,
    menubar: false,
    plugins: "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount",
    toolbar:
      "undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | " +
      "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | " +
      "link image media table | code fullscreen | help",
    content_style:
      theme.skin === "dark"
        ? "body { background:#1e2234; color:#fff; font-family:sans-serif; font-size:14px; }"
        : "body { color:#364a63; font-family:sans-serif; font-size:14px; }",
  };

  const renderForm = (form, setForm, tab, setTab) => (
    <>
      <Nav tabs className="mb-3">
        {["content", "media", "settings"].map((t) => (
          <NavItem key={t}>
            <NavLink tag="button" type="button"
              className={`nav-link${tab === t ? " active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "content" ? "Content" : t === "media" ? "Media" : "Settings"}
            </NavLink>
          </NavItem>
        ))}
      </Nav>

      <TabContent activeTab={tab}>
        <TabPane tabId="content">
          <div className="form-group mb-3">
            <label className="form-label">Title <span className="text-danger">*</span></label>
            <input type="text" className="form-control" placeholder="Article title"
              value={form.title}
              onChange={(e) => {
                const t = e.target.value;
                setForm((f) => ({ ...f, title: t, slug: f.slug ? f.slug : toSlug(t) }));
              }}
            />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">Slug <span className="text-danger">*</span></label>
            <input type="text" className="form-control" placeholder="url-friendly-slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <div className="form-note">Auto-generated from title. Must be lowercase with hyphens.</div>
          </div>
          <div className="form-group mb-3">
            <label className="form-label">Excerpt / Summary</label>
            <textarea className="form-control" rows={3} placeholder="Short summary shown in article listings and email previews..."
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            />
          </div>
          <div className="form-group mb-2">
            <label className="form-label">Body <span className="text-danger">*</span></label>
            <Editor
              licenseKey="gpl"
              value={form.bodyHtml}
              onEditorChange={(content) => setForm((f) => ({ ...f, bodyHtml: content }))}
              init={tinymceInit}
            />
          </div>
        </TabPane>

        <TabPane tabId="media">
          <label className="form-label fw-bold">Header / Featured Image</label>
          {(imagePreview || existingImageUrl) && (
            <div className="mb-3">
              <img src={imagePreview || existingImageUrl} alt="Featured"
                style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 8, objectFit: "cover", border: "1px solid #e5e9f2" }}
              />
              <div className="text-muted small mt-1">
                {imageFile ? imageFile.name : "Current image — drop a new file to replace"}
              </div>
            </div>
          )}
          <Dropzone
            onDrop={(files) => { const f = files[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }}
            accept={{ "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] }}
            maxFiles={1}
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div {...getRootProps()} style={{
                border: `2px dashed ${isDragActive ? "#6576ff" : "#c9d0d7"}`,
                borderRadius: 8, padding: "36px 16px", textAlign: "center", cursor: "pointer",
                background: isDragActive ? "rgba(101,118,255,.06)" : (theme.skin === "dark" ? "#1e2234" : "#f8f9fa"),
                transition: "border-color .2s",
              }}>
                <input {...getInputProps()} />
                <Icon name="img" style={{ fontSize: 40, color: "#8094ae" }} />
                <p className="mt-2 mb-0 text-muted">
                  {isDragActive ? "Drop the image here…" : "Drag & drop an image, or click to browse"}
                </p>
                <p className="text-muted mb-0" style={{ fontSize: 11 }}>JPG · PNG · GIF · WebP (max 25 MB)</p>
              </div>
            )}
          </Dropzone>
          {imageError && <div className="alert alert-danger mt-2">{imageError}</div>}
        </TabPane>

        <TabPane tabId="settings">
          <Row className="g-3">
            <Col md={6}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <RSelect options={STATUS_OPTIONS} value={form.status}
                  onChange={(opt) => setForm((f) => ({ ...f, status: opt }))} />
              </div>
            </Col>
            <Col md={6}>
              <div className="form-group">
                <label className="form-label">Publish Date</label>
                <input type="datetime-local" className="form-control"
                  value={form.publishedAt}
                  onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
                />
              </div>
            </Col>
            <Col md={6}>
              <div className="form-group">
                <label className="form-label">Categories</label>
                <RSelect isMulti options={categoryOptions} value={form.categoryIds}
                  onChange={(opts) => setForm((f) => ({ ...f, categoryIds: opts ?? [] }))}
                  placeholder="Select categories…" />
              </div>
            </Col>
            <Col md={6}>
              <div className="form-group">
                <label className="form-label">Tags</label>
                <RSelect isMulti options={tagOptions} value={form.tagIds}
                  onChange={(opts) => setForm((f) => ({ ...f, tagIds: opts ?? [] }))}
                  placeholder="Select tags…" />
              </div>
            </Col>
          </Row>
        </TabPane>
      </TabContent>
    </>
  );

  return (
    <React.Fragment>
      <Head title="News Articles" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>News Articles</BlockTitle>
              <BlockDes className="text-soft">
                <p>You have a total of {totalItems} news article{totalItems !== 1 ? "s" : ""}.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <div className="toggle-expand-content">
                  <ul className="nk-block-tools g-3">
                    <li className="nk-block-tools-opt">
                      <Button color="primary" onClick={openAddModal}>
                        <Icon name="plus" /><span>Add Article</span>
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
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools">
                  <div className="d-flex g-2 flex-wrap">
                    <div style={{ minWidth: 160 }}>
                      <RSelect placeholder="Status" options={STATUS_OPTIONS} value={statusFilter} isClearable
                        onChange={(opt) => { setStatusFilter(opt); setCurrentPage(1); }} />
                    </div>
                    <div style={{ minWidth: 160 }}>
                      <RSelect placeholder="Category" options={categoryOptions} value={categoryFilter} isClearable
                        onChange={(opt) => { setCategoryFilter(opt); setCurrentPage(1); }} />
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
                            <li className={sort === "asc" ? "active" : ""}><DropdownItem onClick={() => setSort("asc")}>Oldest</DropdownItem></li>
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
                      <Button className="search-back btn-icon toggle-search"
                        onClick={() => { setSearchOpen(false); setSearchText(""); loadPosts({ search: undefined }); }}>
                        <Icon name="arrow-left" />
                      </Button>
                      <input type="text" className="border-transparent form-focus-none form-control"
                        placeholder="Search by title…" value={searchText} onChange={onSearchChange} />
                      <Button className="search-submit btn-icon"><Icon name="search" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DataTableBody>
              <DataTableHead>
                <DataTableRow size="sm" style={{ width: 64 }}><span className="sub-text">Img</span></DataTableRow>
                <DataTableRow>
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => { setSortField("title"); setSort((s) => s === "asc" ? "desc" : "asc"); }}>
                    Title <Icon name={sortField === "title" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow size="md"><span className="sub-text">Status</span></DataTableRow>
                <DataTableRow size="lg"><span className="sub-text">Preview</span></DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text" style={{ cursor: "pointer" }} onClick={() => { setSortField("publishedAt"); setSort((s) => s === "asc" ? "desc" : "asc"); }}>
                    Published <Icon name={sortField === "publishedAt" ? (sort === "asc" ? "sort-up-fill" : "sort-down-fill") : "sort"} />
                  </span>
                </DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end"><span>&nbsp;</span></DataTableRow>
              </DataTableHead>

              {loading ? (
                <tr><td colSpan={6} className="text-center py-4"><Spinner /></td></tr>
              ) : posts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-muted">No news articles found.</td></tr>
              ) : posts.map((post) => (
                <DataTableItem key={post.id}>
                  <DataTableRow size="sm">
                    {post.featuredMediaAsset?.url ? (
                      <img src={post.featuredMediaAsset.url} alt={post.title}
                        style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 52, height: 52, background: "#e5e9f2", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="img" style={{ color: "#8094ae", fontSize: 22 }} />
                      </div>
                    )}
                  </DataTableRow>
                  <DataTableRow>
                    <div className="user-info">
                      <span className="tb-lead">{post.title}</span>
                      <span className="d-block text-muted small">{post.slug}</span>
                    </div>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <Badge color={STATUS_COLORS[post.status] ?? "secondary"} className="text-capitalize">
                      {post.status}
                    </Badge>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="text-muted small" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: 260 }}>
                      {post.excerpt || stripHtml(post.bodyHtml).substring(0, 120)}
                    </span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span>{fmtDate(post.publishedAt)}</span>
                  </DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end">
                    <ul className="nk-tb-actions gx-1">
                      <li className="nk-tb-action-hidden">
                        <a href="#preview" onClick={(e) => { e.preventDefault(); openPreview(post); }}
                          className="btn btn-trigger btn-icon" title="Preview">
                          <Icon name="eye" />
                        </a>
                      </li>
                      <li className="nk-tb-action-hidden">
                        <a href="#edit" onClick={(e) => { e.preventDefault(); openEditModal(post); }}
                          className="btn btn-trigger btn-icon" title="Edit">
                          <Icon name="edit" />
                        </a>
                      </li>
                      {post.status === "published" && (
                        <li className="nk-tb-action-hidden">
                          <a href="#email" onClick={(e) => { e.preventDefault(); openEmailModal(post); }}
                            className="btn btn-trigger btn-icon" title="Email to subscribers"
                            style={{ color: "#6576ff" }}>
                            <Icon name="mail" />
                          </a>
                        </li>
                      )}
                      <li className="nk-tb-action-hidden">
                        <a href="#delete" onClick={(e) => { e.preventDefault(); confirmDelete(post); }}
                          className="btn btn-trigger btn-icon text-danger" title="Delete">
                          <Icon name="trash" />
                        </a>
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
                  paginate={setCurrentPage} currentPage={currentPage}
                />
              )}
            </div>
          </DataTable>
        </Block>

        {/* ── Add Modal ─────────────────────────────────────────────────────── */}
        <Modal isOpen={addModal} toggle={() => setAddModal(false)} size="xl" scrollable>
          <ModalBody className="modal-body-lg">
            <div className="nk-modal-head mb-3">
              <h5 className="title">Create News Article</h5>
            </div>
            {renderForm(addForm, setAddForm, addTab, setAddTab)}
            {addError && <div className="alert alert-danger mt-2">{addError}</div>}
            <div className="mt-3 d-flex justify-content-end">
              <Button color="light" className="me-2" onClick={() => setAddModal(false)}>Cancel</Button>
              <Button color="primary" onClick={onAddSubmit} disabled={addSaving || imageUploading === "add"}>
                {addSaving || imageUploading === "add" ? <Spinner size="sm" /> : "Create Article"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Edit Modal ────────────────────────────────────────────────────── */}
        <Modal isOpen={editModal} toggle={() => setEditModal(false)} size="xl" scrollable>
          <ModalBody className="modal-body-lg">
            <div className="nk-modal-head mb-3">
              <h5 className="title">Edit News Article</h5>
            </div>
            {renderForm(editForm, setEditForm, editTab, setEditTab)}
            {editError && <div className="alert alert-danger mt-2">{editError}</div>}
            <div className="mt-3 d-flex justify-content-end">
              <Button color="light" className="me-2" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button color="primary" onClick={onEditSubmit} disabled={editSaving || imageUploading === "edit"}>
                {editSaving || imageUploading === "edit" ? <Spinner size="sm" /> : "Save Changes"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Delete Modal ──────────────────────────────────────────────────── */}
        <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
          <ModalBody className="modal-body-sm text-center">
            <div className="nk-modal-head mb-2">
              <h5 className="title">Delete Article</h5>
            </div>
            <p>Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.</p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <Button color="light" onClick={() => setDeleteModal(false)}>Cancel</Button>
              <Button color="danger" onClick={doDelete} disabled={deleteLoading}>
                {deleteLoading ? <Spinner size="sm" /> : "Delete"}
              </Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Preview Modal ─────────────────────────────────────────────────── */}
        <Modal isOpen={previewModal} toggle={() => setPreviewModal(false)} size="lg" scrollable>
          <ModalBody className="modal-body-lg">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h4 className="mb-1">{previewPost?.title}</h4>
                <div className="d-flex align-items-center gap-2">
                  <Badge color={STATUS_COLORS[previewPost?.status] ?? "secondary"} className="text-capitalize">
                    {previewPost?.status}
                  </Badge>
                  <span className="text-muted small">{fmtDateTime(previewPost?.publishedAt)}</span>
                </div>
              </div>
              <a href="#close" onClick={(e) => { e.preventDefault(); setPreviewModal(false); }}
                className="close" style={{ fontSize: 24 }}>
                <Icon name="cross" />
              </a>
            </div>

            {previewPost?.featuredMediaAsset?.url && (
              <img src={previewPost.featuredMediaAsset.url} alt={previewPost.title}
                style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 8, marginBottom: 16 }}
              />
            )}

            {previewPost?.excerpt && (
              <p className="lead" style={{ fontStyle: "italic", color: "#555", borderLeft: "3px solid #6576ff", paddingLeft: 12, marginBottom: 16 }}>
                {previewPost.excerpt}
              </p>
            )}

            <div className="mb-3" style={{ lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: previewPost?.bodyHtml ?? "" }}
            />

            {previewPost?.categories?.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mb-2">
                <span className="text-muted small me-1">Categories:</span>
                {previewPost.categories.map((c, i) => (
                  <Badge key={i} color="outline-primary" className="text-capitalize">{c.category?.name}</Badge>
                ))}
              </div>
            )}
            {previewPost?.tags?.length > 0 && (
              <div className="d-flex flex-wrap gap-1">
                <span className="text-muted small me-1">Tags:</span>
                {previewPost.tags.map((t, i) => (
                  <Badge key={i} color="outline-secondary" className="text-capitalize">{t.tag?.name}</Badge>
                ))}
              </div>
            )}

            <div className="mt-3 d-flex justify-content-end gap-2">
              {previewPost?.status === "published" && (
                <Button color="primary" size="sm" onClick={() => { setPreviewModal(false); openEmailModal(previewPost); }}>
                  <Icon name="mail" /> <span className="ms-1">Email to Subscribers</span>
                </Button>
              )}
              <Button color="light" size="sm" onClick={() => setPreviewModal(false)}>Close</Button>
            </div>
          </ModalBody>
        </Modal>

        {/* ── Email to Subscribers Modal ─────────────────────────────────────── */}
        <Modal isOpen={emailModal} toggle={() => !emailSending && setEmailModal(false)} size="md">
          <ModalBody>
            <div className="nk-modal-head mb-3">
              <h5 className="title"><Icon name="mail" /> Email to Subscribers</h5>
            </div>

            {!emailResult ? (
              <>
                <div className="alert alert-light border mb-3">
                  <div className="fw-bold mb-1">{emailTarget?.title}</div>
                  <div className="text-muted small">
                    {emailTarget?.excerpt || stripHtml(emailTarget?.bodyHtml ?? "").substring(0, 150) + "…"}
                  </div>
                </div>

                <p className="text-muted">
                  This will send the article as an email to all subscribers who have opted in to receive email communications.
                </p>

                {emailProgress && emailSending && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Sending…</span>
                      <span>{emailProgress.sent} / {emailProgress.total}</span>
                    </div>
                    <Progress
                      value={emailProgress.total > 0 ? Math.round((emailProgress.sent / emailProgress.total) * 100) : 0}
                      color={emailProgress.errors > 0 ? "warning" : "primary"}
                      animated striped
                    />
                    {emailProgress.errors > 0 && (
                      <div className="text-warning small mt-1">{emailProgress.errors} error{emailProgress.errors !== 1 ? "s" : ""} so far</div>
                    )}
                  </div>
                )}

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <Button color="light" onClick={() => setEmailModal(false)} disabled={emailSending}>Cancel</Button>
                  <Button color="primary" onClick={doSendEmail} disabled={emailSending}>
                    {emailSending ? <><Spinner size="sm" /> Sending…</> : <><Icon name="send" /> <span className="ms-1">Send Now</span></>}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-3">
                <div className="mb-3">
                  <Icon name={emailResult.success ? "check-circle" : "alert-circle"}
                    style={{ fontSize: 48, color: emailResult.success ? "#1ee0ac" : "#e85347" }} />
                </div>
                <h6 className={emailResult.success ? "text-success" : "text-danger"}>
                  {emailResult.success ? "Emails Sent" : "Failed"}
                </h6>
                <p className="text-muted">{emailResult.message}</p>
                <Button color="light" onClick={() => setEmailModal(false)}>Close</Button>
              </div>
            )}
          </ModalBody>
        </Modal>
      </Content>
    </React.Fragment>
  );
};

export default AdminNewsList;
