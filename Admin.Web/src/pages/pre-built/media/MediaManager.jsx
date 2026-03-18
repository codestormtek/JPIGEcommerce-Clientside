import React, { useState, useEffect, useCallback } from "react";
import Dropzone from "react-dropzone";
import { Modal, ModalBody, Spinner, Badge } from "reactstrap";
import Head from "@/layout/head/Head";
import ContentAlt from "@/layout/content/ContentAlt";
import { Icon, Button, PaginationComponent } from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";
import { bytesToMegaBytes } from "@/utils/Utils";

const fileName = (url = "") => url.split("/").pop() ?? url;
const formatSize = (bytes) => (bytes ? `${bytesToMegaBytes(bytes)} MB` : "—");
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
const slugify = (s) =>
  s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_\-/]/g, "");

const DOC_META = {
  "application/pdf":                                                                    { icon: "file-pdf",  color: "#e74c3c", label: "PDF"        },
  "application/msword":                                                                 { icon: "file-doc",  color: "#2980b9", label: "Word"       },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":           { icon: "file-doc",  color: "#2980b9", label: "Word"       },
  "application/vnd.ms-excel":                                                          { icon: "file-xls",  color: "#27ae60", label: "Excel"      },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":                { icon: "file-xls",  color: "#27ae60", label: "Excel"      },
  "application/vnd.ms-powerpoint":                                                     { icon: "file-ppt",  color: "#e67e22", label: "PowerPoint" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":        { icon: "file-ppt",  color: "#e67e22", label: "PowerPoint" },
  "text/plain":                                                                         { icon: "file-text", color: "#7f8c8d", label: "Text"       },
  "text/csv":                                                                           { icon: "file-text", color: "#16a085", label: "CSV"        },
};
const getDocMeta = (mime) => DOC_META[mime] ?? { icon: "file", color: "#95a5a6", label: "File" };

const SYSTEM_ICONS = {
  products: "package", categories: "tag", avatars: "user-circle",
  carousel: "layers-fill", blog: "book-read", news: "news",
  topics: "file-text", pages: "browser", galleries: "images",
  documents: "folder-fill", media: "img", widgets: "widget",
};
const folderIcon = (slug) => SYSTEM_ICONS[slug] ?? "folder";

const QUICK_FILTERS = [
  { label: "All Files",  icon: "folder",    folder: null, mediaType: null       },
  { label: "Images",     icon: "img",       folder: null, mediaType: "image"    },
  { label: "Videos",     icon: "video",     folder: null, mediaType: "video"    },
  { label: "Documents",  icon: "file-pdf",  folder: null, mediaType: "document" },
];

const UPLOAD_ACCEPT = {
  "image/*": [],
  "video/*": [],
  "application/pdf": [],
  "application/msword": [],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
  "application/vnd.ms-excel": [],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
  "application/vnd.ms-powerpoint": [],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [],
  "text/plain": [],
  "text/csv": [],
};

const typeBadgeColor = (t) =>
  t === "image" ? "info" : t === "video" ? "warning" : "secondary";

// ─────────────────────────────────────────────────────────────────────────────

const MediaManager = () => {
  /* ── list ─────────────────────────────────────────────────── */
  const [assets, setAssets]               = useState([]);
  const [meta, setMeta]                   = useState({ total: 0, page: 1, limit: 40, totalPages: 1 });
  const [page, setPage]                   = useState(1);
  const [activeFolder, setActiveFolder]   = useState(null);
  const [mediaTypeFilter, setMTF]         = useState(null);
  const [activeQuick, setActiveQuick]     = useState("All Files");
  const [search, setSearch]               = useState("");
  const [filesView, setFilesView]         = useState("grid");
  const [loading, setLoading]             = useState(false);

  /* ── folders ──────────────────────────────────────────────── */
  const [folders, setFolders]             = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);

  /* ── upload modal ─────────────────────────────────────────── */
  const [uploadModal, setUploadModal]     = useState(false);
  const [uploadFolder, setUploadFolder]   = useState("media");
  const [uploadFiles, setUploadFiles]     = useState([]);
  const [uploading, setUploading]         = useState(false);
  const [uploadErrors, setUploadErrors]   = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState("");

  /* ── new folder modal ─────────────────────────────────────── */
  const [folderModal, setFolderModal]     = useState(false);
  const [folderForm, setFolderForm]       = useState({ name: "", slug: "", parentSlug: "" });
  const [folderSaving, setFolderSaving]   = useState(false);
  const [folderError, setFolderError]     = useState("");
  const [pendingDelFolder, setPendingDelFolder] = useState(null);

  /* ── detail / edit modal ──────────────────────────────────── */
  const [detailAsset, setDetailAsset]     = useState(null);
  const [detailForm, setDetailForm]       = useState({ altText: "" });
  const [detailSaving, setDetailSaving]   = useState(false);
  const [detailError, setDetailError]     = useState("");
  const [pendingDelAsset, setPendingDelAsset] = useState(null);

  /* ── fetch folders ────────────────────────────────────────── */
  const fetchFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const res = await apiGet("/media/folders");
      setFolders(res?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  /* ── fetch assets ─────────────────────────────────────────── */
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 40, orderBy: "createdAt", order: "desc" });
      if (activeFolder)    params.set("folder",    activeFolder);
      if (mediaTypeFilter) params.set("mediaType", mediaTypeFilter);
      const res  = await apiGet(`/media?${params}`);
      const data = res?.data ?? [];
      const filtered = search
        ? data.filter((a) =>
            (a.url ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (a.altText ?? "").toLowerCase().includes(search.toLowerCase()))
        : data;
      setAssets(filtered);
      setMeta({ total: res?.meta?.total ?? 0, page, limit: 40, totalPages: res?.meta?.totalPages ?? 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, activeFolder, mediaTypeFilter, search]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  /* ── navigation helpers ───────────────────────────────────── */
  const selectQuick = (qf) => {
    setActiveQuick(qf.label);
    setActiveFolder(qf.folder);
    setMTF(qf.mediaType);
    setPage(1);
  };
  const selectFolder = (slug) => {
    setActiveFolder(slug);
    setMTF(null);
    setActiveQuick(null);
    setPage(1);
  };

  /* ── upload ───────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!uploadFiles.length) return;
    setUploading(true);
    setUploadErrors([]);
    setUploadSuccess("");
    const errs = [];
    for (const file of uploadFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", uploadFolder);
      try {
        await apiUpload("/media/upload", fd);
      } catch (e) {
        errs.push(`${file.name}: ${e.message}`);
      }
    }
    setUploading(false);
    if (!errs.length) {
      const count = uploadFiles.length;
      setUploadFiles([]);
      setUploadSuccess(`${count} file${count !== 1 ? "s" : ""} uploaded.`);
      fetchAssets();
      setTimeout(() => { setUploadModal(false); setUploadSuccess(""); }, 1800);
    } else {
      setUploadErrors(errs);
    }
  };

  const closeUploadModal = () => {
    setUploadModal(false);
    setUploadFiles([]);
    setUploadErrors([]);
    setUploadSuccess("");
  };

  /* ── create folder ────────────────────────────────────────── */
  const handleCreateFolder = async () => {
    if (!folderForm.name.trim() || !folderForm.slug.trim()) {
      setFolderError("Name and slug are required.");
      return;
    }
    setFolderSaving(true);
    setFolderError("");
    try {
      await apiPost("/media/folders", {
        name: folderForm.name.trim(),
        slug: folderForm.slug.trim(),
        parentSlug: folderForm.parentSlug || undefined,
      });
      setFolderModal(false);
      setFolderForm({ name: "", slug: "", parentSlug: "" });
      fetchFolders();
    } catch (e) {
      setFolderError(e.message);
    } finally {
      setFolderSaving(false);
    }
  };

  /* ── delete folder ────────────────────────────────────────── */
  const handleDeleteFolder = async () => {
    if (!pendingDelFolder) return;
    try {
      await apiDelete(`/media/folders/${pendingDelFolder.slug}`);
      if (activeFolder === pendingDelFolder.slug) {
        setActiveFolder(null);
        setActiveQuick("All Files");
      }
      setPendingDelFolder(null);
      fetchFolders();
    } catch (e) {
      alert(e.message);
    }
  };

  /* ── detail ───────────────────────────────────────────────── */
  const openDetail = (asset) => {
    setDetailAsset(asset);
    setDetailForm({ altText: asset.altText ?? "" });
    setDetailError("");
  };

  const saveDetail = async () => {
    setDetailSaving(true);
    setDetailError("");
    try {
      await apiPatch(`/media/${detailAsset.id}`, { altText: detailForm.altText });
      setDetailAsset(null);
      fetchAssets();
    } catch (e) {
      setDetailError(e.message);
    } finally {
      setDetailSaving(false);
    }
  };

  /* ── delete asset ─────────────────────────────────────────── */
  const confirmDeleteAsset = async () => {
    try {
      await apiDelete(`/media/${pendingDelAsset.id}`);
      if (detailAsset?.id === pendingDelAsset.id) setDetailAsset(null);
      setPendingDelAsset(null);
      fetchAssets();
    } catch (e) {
      alert(e.message);
    }
  };

  /* ── render helpers ───────────────────────────────────────── */
  const activeLabel = () => {
    if (activeQuick) return activeQuick;
    return folders.find((f) => f.slug === activeFolder)?.name ?? "All Files";
  };

  const topLevel  = folders.filter((f) => !f.parentSlug);
  const children  = (slug) => folders.filter((f) => f.parentSlug === slug);

  const renderThumb = (asset, size = 36) => {
    if (asset.mediaType === "image") {
      return (
        <img
          src={asset.url}
          alt={asset.altText ?? ""}
          style={{ width: size, height: size, objectFit: "cover", borderRadius: 4 }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      );
    }
    if (asset.mediaType === "video") {
      return <em className="icon ni ni-video" style={{ fontSize: size * 0.8, color: "#6576ff" }} />;
    }
    const { icon, color } = getDocMeta(asset.metadata?.mimeType ?? "");
    return <em className={`icon ni ni-${icon}`} style={{ fontSize: size * 0.8, color }} />;
  };

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <>
      <Head title="Media Library" />
      <ContentAlt>

        {/* Top bar */}
        <div className="nk-fmg-body-head">
          <div className="nk-fmg-search">
            <Icon name="search" />
            <input
              type="text"
              className="form-control border-transparent form-focus-none"
              placeholder="Search by name or alt text…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="nk-fmg-actions">
            <ul className="nk-block-tools g-2">
              <li>
                <Button
                  color="light"
                  outline
                  size="sm"
                  onClick={() => { setFolderForm({ name: "", slug: "", parentSlug: "" }); setFolderError(""); setFolderModal(true); }}
                >
                  <Icon name="folder-plus" /><span>New Folder</span>
                </Button>
              </li>
              <li>
                <Button
                  color="primary"
                  onClick={() => { setUploadFolder(activeFolder ?? "media"); setUploadModal(true); }}
                >
                  <Icon name="upload-cloud" /><span>Upload</span>
                </Button>
              </li>
            </ul>
          </div>
        </div>

        {/* 2-column body */}
        <div className="nk-fmg-body">

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <div
            className="nk-fmg-nav toggle-expand-content"
            style={{ minWidth: 220, borderRight: "1px solid #dbdfea", overflowY: "auto" }}
          >
            {/* Quick filters */}
            <ul className="nk-fmg-menu">
              {QUICK_FILTERS.map((qf) => (
                <li key={qf.label} className={activeQuick === qf.label ? "active" : ""}>
                  <a href="#!" onClick={(e) => { e.preventDefault(); selectQuick(qf); }}>
                    <Icon name={qf.icon} /><span>{qf.label}</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="nk-fmg-nav-divider" />

            <div className="px-3 py-1">
              <span className="overline-title overline-title-alt" style={{ fontSize: 10 }}>
                Folders
              </span>
            </div>

            {foldersLoading ? (
              <div className="text-center py-2"><Spinner size="sm" color="primary" /></div>
            ) : (
              <ul className="nk-fmg-menu">
                {topLevel.map((folder) => (
                  <React.Fragment key={folder.slug}>
                    <li className={activeFolder === folder.slug && !activeQuick ? "active" : ""}>
                      <a
                        href="#!"
                        onClick={(e) => { e.preventDefault(); selectFolder(folder.slug); }}
                        className="d-flex align-items-center justify-content-between pe-2"
                      >
                        <span>
                          <Icon name={folderIcon(folder.slug)} />
                          <span className="ms-1">{folder.name}</span>
                        </span>
                        {!folder.isSystem && (
                          <button
                            className="btn btn-icon btn-xs text-danger"
                            style={{ opacity: 0.4 }}
                            title="Delete folder"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingDelFolder(folder); }}
                          >
                            <Icon name="trash" />
                          </button>
                        )}
                      </a>
                    </li>
                    {children(folder.slug).map((child) => (
                      <li
                        key={child.slug}
                        className={activeFolder === child.slug && !activeQuick ? "active" : ""}
                        style={{ paddingLeft: 16 }}
                      >
                        <a
                          href="#!"
                          onClick={(e) => { e.preventDefault(); selectFolder(child.slug); }}
                          className="d-flex align-items-center justify-content-between pe-2"
                        >
                          <span>
                            <Icon name="corner-down-right" />
                            <span className="ms-1">{child.name}</span>
                          </span>
                          <button
                            className="btn btn-icon btn-xs text-danger"
                            style={{ opacity: 0.4 }}
                            title="Delete folder"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingDelFolder(child); }}
                          >
                            <Icon name="trash" />
                          </button>
                        </a>
                      </li>
                    ))}
                  </React.Fragment>
                ))}
              </ul>
            )}
          </div>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="nk-fmg-body-content" style={{ flex: 1, overflowY: "auto" }}>
            <div className="nk-block-head nk-block-head-sm">
              <div className="nk-block-between">
                <div className="nk-block-head-content">
                  <h5 className="nk-block-title">{activeLabel()}</h5>
                  <p className="text-muted small mb-0">
                    {meta.total} item{meta.total !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="nk-block-head-content">
                  <ul className="nk-block-tools g-1">
                    <li>
                      <button
                        className={`btn btn-trigger btn-icon${filesView === "list" ? " active" : ""}`}
                        title="List view"
                        onClick={() => setFilesView("list")}
                      >
                        <Icon name="list-thumb" />
                      </button>
                    </li>
                    <li>
                      <button
                        className={`btn btn-trigger btn-icon${filesView === "grid" ? " active" : ""}`}
                        title="Grid view"
                        onClick={() => setFilesView("grid")}
                      >
                        <Icon name="view-col3" />
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5"><Spinner color="primary" /></div>
            ) : (
              <div className={`nk-files nk-files-view-${filesView}`}>
                {filesView === "list" && assets.length > 0 && (
                  <div className="nk-files-head">
                    <div className="nk-file-item">
                      <div className="nk-file-info"><div className="tb-head">Name</div></div>
                      <div className="nk-file-meta"><div className="tb-head">Type</div></div>
                      <div className="nk-file-meta"><div className="tb-head">Size</div></div>
                      <div className="nk-file-meta"><div className="tb-head">Date</div></div>
                      <div className="nk-file-actions" />
                    </div>
                  </div>
                )}
                <div className="nk-files-list">
                  {assets.length === 0 && (
                    <div className="py-5 text-center text-muted">No files found</div>
                  )}
                  {assets.map((asset) => (
                    <div className="nk-file-item nk-file" key={asset.id}>
                      <div className="nk-file-info">
                        <div className="nk-file-title">
                          <div
                            className="nk-file-icon"
                            style={{ cursor: "pointer" }}
                            onClick={() => openDetail(asset)}
                          >
                            {renderThumb(asset)}
                          </div>
                          <div className="nk-file-name">
                            <div className="nk-file-name-text">
                              <span
                                className="title"
                                style={{ cursor: "pointer" }}
                                onClick={() => openDetail(asset)}
                              >
                                {asset.altText ?? fileName(asset.url)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {filesView !== "list" && (
                          <ul className="nk-file-desc">
                            <li className="date">{formatDate(asset.createdAt)}</li>
                            {asset.metadata?.fileSizeBytes && (
                              <li className="size">{formatSize(Number(asset.metadata.fileSizeBytes))}</li>
                            )}
                          </ul>
                        )}
                      </div>
                      {filesView === "list" && (
                        <>
                          <div className="nk-file-meta">
                            <Badge color={typeBadgeColor(asset.mediaType)} className="badge-sm badge-dim">
                              {asset.mediaType}
                            </Badge>
                          </div>
                          <div className="nk-file-meta">
                            {asset.metadata?.fileSizeBytes
                              ? formatSize(Number(asset.metadata.fileSizeBytes))
                              : "—"}
                          </div>
                          <div className="nk-file-meta">{formatDate(asset.createdAt)}</div>
                        </>
                      )}
                      <div className="nk-file-actions">
                        <div className="dropdown">
                          <a
                            href="#menu"
                            className="btn btn-sm btn-icon btn-trigger dropdown-toggle"
                            data-bs-toggle="dropdown"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Icon name="more-h" />
                          </a>
                          <div className="dropdown-menu dropdown-menu-end">
                            <ul className="link-list-opt no-bdr">
                              <li>
                                <a href="#view" className="dropdown-item" onClick={(e) => { e.preventDefault(); openDetail(asset); }}>
                                  <Icon name="eye" /><span>View / Edit</span>
                                </a>
                              </li>
                              <li>
                                <a
                                  href="#copy"
                                  className="dropdown-item"
                                  onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(asset.url); }}
                                >
                                  <Icon name="copy" /><span>Copy URL</span>
                                </a>
                              </li>
                              {asset.mediaType === "document" && (
                                <li>
                                  <a href={asset.url} target="_blank" rel="noreferrer" className="dropdown-item">
                                    <Icon name="download" /><span>Download</span>
                                  </a>
                                </li>
                              )}
                              <li>
                                <a
                                  href="#del"
                                  className="dropdown-item text-danger"
                                  onClick={(e) => { e.preventDefault(); setPendingDelAsset(asset); }}
                                >
                                  <Icon name="trash" /><span>Delete</span>
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {meta.totalPages > 1 && (
              <div className="mt-4">
                <PaginationComponent
                  itemPerPage={40}
                  totalItems={meta.total}
                  paginate={(p) => setPage(p)}
                  currentPage={page}
                />
              </div>
            )}
          </div>
        </div>
      </ContentAlt>

      {/* ── Upload Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={uploadModal} size="md" toggle={closeUploadModal}>
        <ModalBody>
          <div className="nk-modal-head mb-3">
            <h5 className="nk-modal-title title">Upload Files</h5>
            <p className="text-muted small mb-0">
              Supports images, videos, PDF, Word, Excel, PowerPoint, CSV, and text files.
            </p>
          </div>
          <div className="mb-3">
            <label className="form-label">Upload to folder</label>
            <select
              className="form-select form-select-sm"
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
            >
              {folders.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.parentSlug ? `\u00a0\u00a0↳ ${f.name}` : f.name}
                </option>
              ))}
            </select>
          </div>
          <Dropzone onDrop={(accepted) => setUploadFiles((prev) => [...prev, ...accepted])} accept={UPLOAD_ACCEPT}>
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps()} className="dropzone upload-zone dz-clickable">
                <input {...getInputProps()} />
                <div className="dz-message">
                  <span className="dz-message-text">
                    <Icon name="upload-cloud" /> Drag &amp; drop or click to browse
                  </span>
                </div>
              </div>
            )}
          </Dropzone>
          {uploadFiles.length > 0 && (
            <ul className="mt-3 list-unstyled">
              {uploadFiles.map((f, i) => (
                <li key={i} className="d-flex align-items-center justify-content-between py-1 border-bottom">
                  <span className="text-truncate" style={{ maxWidth: 290 }}>{f.name}</span>
                  <button
                    className="btn btn-sm btn-icon btn-trigger text-danger"
                    onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Icon name="cross" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {uploadSuccess && (
            <div className="alert alert-success mt-2 d-flex align-items-center gap-2">
              <Icon name="check-circle" /> {uploadSuccess}
            </div>
          )}
          {uploadErrors.length > 0 && (
            <div className="alert alert-danger mt-2">
              {uploadErrors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <div className="mt-3 d-flex justify-content-end gap-2">
            <Button color="light" onClick={closeUploadModal}>Cancel</Button>
            <Button color="primary" disabled={!uploadFiles.length || uploading} onClick={handleUpload}>
              {uploading ? <Spinner size="sm" /> : <><Icon name="upload-cloud" /> Upload</>}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* ── New Folder Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={folderModal} size="sm" toggle={() => setFolderModal(false)}>
        <ModalBody>
          <div className="nk-modal-head mb-3">
            <h5 className="nk-modal-title title">New Folder</h5>
          </div>
          {folderError && <div className="alert alert-danger py-2 mb-2 small">{folderError}</div>}
          <div className="mb-3">
            <label className="form-label">Folder Name</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="e.g. BBQ Recipes"
              value={folderForm.name}
              onChange={(e) =>
                setFolderForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">
              Slug <span className="text-muted small">(editable)</span>
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="e.g. bbq-recipes"
              value={folderForm.slug}
              onChange={(e) => setFolderForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            />
            <small className="text-muted">Lowercase letters, numbers, hyphens, underscores.</small>
          </div>
          <div className="mb-3">
            <label className="form-label">
              Parent Folder <span className="text-muted small">(optional)</span>
            </label>
            <select
              className="form-select form-select-sm"
              value={folderForm.parentSlug}
              onChange={(e) => setFolderForm((f) => ({ ...f, parentSlug: e.target.value }))}
            >
              <option value="">None (top-level)</option>
              {topLevel.map((f) => (
                <option key={f.slug} value={f.slug}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setFolderModal(false)}>Cancel</Button>
            <Button color="primary" disabled={folderSaving} onClick={handleCreateFolder}>
              {folderSaving ? <Spinner size="sm" /> : "Create Folder"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* ── Delete Folder Confirm ─────────────────────────────────────────── */}
      <Modal isOpen={!!pendingDelFolder} size="sm" toggle={() => setPendingDelFolder(null)}>
        <ModalBody>
          <h5 className="mb-2">Delete Folder</h5>
          <p className="text-muted small">
            Remove the <strong>{pendingDelFolder?.name}</strong> folder? Files inside are NOT
            deleted — only the folder entry is removed.
          </p>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setPendingDelFolder(null)}>Cancel</Button>
            <Button color="danger" onClick={handleDeleteFolder}>Delete</Button>
          </div>
        </ModalBody>
      </Modal>

      {/* ── Detail / Edit Modal ───────────────────────────────────────────── */}
      <Modal isOpen={!!detailAsset} size="lg" toggle={() => setDetailAsset(null)}>
        <ModalBody>
          {detailAsset && (
            <>
              <div className="nk-modal-head mb-3 d-flex align-items-center justify-content-between">
                <h5 className="nk-modal-title title mb-0">File Details</h5>
                <button className="btn btn-sm btn-icon btn-trigger" onClick={() => setDetailAsset(null)}>
                  <Icon name="cross" />
                </button>
              </div>
              <div className="row g-3">
                <div className="col-12 text-center">
                  {detailAsset.mediaType === "image" ? (
                    <img
                      src={detailAsset.url}
                      alt={detailAsset.altText ?? ""}
                      style={{ maxWidth: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 6 }}
                    />
                  ) : detailAsset.mediaType === "video" ? (
                    <video
                      src={detailAsset.url}
                      controls
                      style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 6 }}
                    />
                  ) : (
                    (() => {
                      const { icon, color, label } = getDocMeta(detailAsset.metadata?.mimeType ?? "");
                      return (
                        <div className="py-4 d-flex flex-column align-items-center gap-2">
                          <em className={`icon ni ni-${icon}`} style={{ fontSize: 72, color }} />
                          <span className="fw-bold text-muted">{label} Document</span>
                          <a
                            href={detailAsset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline-primary mt-1"
                          >
                            <Icon name="download" /> Download / Open
                          </a>
                        </div>
                      );
                    })()
                  )}
                </div>
                <div className="col-12">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <th style={{ width: 130 }}>URL</th>
                        <td style={{ wordBreak: "break-all" }}>
                          <a href={detailAsset.url} target="_blank" rel="noreferrer">{detailAsset.url}</a>
                        </td>
                      </tr>
                      <tr>
                        <th>Type</th>
                        <td>
                          <Badge color={typeBadgeColor(detailAsset.mediaType)} className="badge-sm badge-dim">
                            {detailAsset.mediaType}
                          </Badge>
                        </td>
                      </tr>
                      {detailAsset.metadata?.mimeType && (
                        <tr><th>MIME</th><td>{detailAsset.metadata.mimeType}</td></tr>
                      )}
                      {detailAsset.metadata?.fileSizeBytes && (
                        <tr><th>Size</th><td>{formatSize(Number(detailAsset.metadata.fileSizeBytes))}</td></tr>
                      )}
                      {detailAsset.metadata?.widthPx && (
                        <tr><th>Dimensions</th><td>{detailAsset.metadata.widthPx} × {detailAsset.metadata.heightPx} px</td></tr>
                      )}
                      {detailAsset.folder && (
                        <tr><th>Folder</th><td>{detailAsset.folder}</td></tr>
                      )}
                      <tr><th>Uploaded</th><td>{formatDate(detailAsset.createdAt)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-12">
                  <label className="form-label">
                    {detailAsset.mediaType === "document" ? "File Label" : "Alt Text"}
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={detailForm.altText}
                    onChange={(e) => setDetailForm({ altText: e.target.value })}
                  />
                  {detailError && <div className="text-danger small mt-1">{detailError}</div>}
                </div>
              </div>
              <div className="mt-3 d-flex justify-content-between align-items-center">
                <Button
                  color="danger"
                  outline
                  size="sm"
                  onClick={() => setPendingDelAsset(detailAsset)}
                >
                  <Icon name="trash" /> Delete
                </Button>
                <div className="d-flex gap-2">
                  <Button color="light" size="sm" onClick={() => navigator.clipboard.writeText(detailAsset.url)}>
                    <Icon name="copy" /> Copy URL
                  </Button>
                  <Button color="primary" size="sm" disabled={detailSaving} onClick={saveDetail}>
                    {detailSaving ? <Spinner size="sm" /> : "Save"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </ModalBody>
      </Modal>

      {/* ── Delete Asset Confirm ──────────────────────────────────────────── */}
      <Modal isOpen={!!pendingDelAsset} size="sm" toggle={() => setPendingDelAsset(null)}>
        <ModalBody>
          <h5 className="mb-2">Delete File</h5>
          <p className="text-muted small">
            Permanently remove{" "}
            <strong>{pendingDelAsset?.altText ?? fileName(pendingDelAsset?.url ?? "")}</strong>{" "}
            from the media library?
          </p>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setPendingDelAsset(null)}>Cancel</Button>
            <Button color="danger" onClick={confirmDeleteAsset}>Delete</Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default MediaManager;
