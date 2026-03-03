import React, { useState, useEffect, useCallback } from "react";
import Dropzone from "react-dropzone";
import { Modal, ModalBody, Spinner, Badge, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import Head from "@/layout/head/Head";
import ContentAlt from "@/layout/content/ContentAlt";
import { Icon, Button, PaginationComponent } from "@/components/Component";
import { apiGet, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";
import { bytesToMegaBytes } from "@/utils/Utils";

const fileName = (url = "") => url.split("/").pop() ?? url;
const formatSize = (bytes) => (bytes ? `${bytesToMegaBytes(bytes)} MB` : "—");
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

/** Folders mirror the API upload sub-directories. `folder: null` means "all". */
const FOLDERS = [
  { label: "All Files",   icon: "folder",      folder: null           },
  { label: "Products",    icon: "package",     folder: "products"     },
  { label: "Categories",  icon: "tag",         folder: "categories"   },
  { label: "Avatars",     icon: "user-circle", folder: "avatars"      },
  { label: "Carousel",    icon: "layers-fill", folder: "carousel"     },
  { label: "Blog",        icon: "book-read",   folder: "blog"         },
  { label: "News",        icon: "news",        folder: "news"         },
  { label: "Topics",      icon: "file-text",   folder: "topics"       },
  { label: "General",     icon: "img",         folder: "media"        },
];

const MediaManager = () => {
  /* ── list state ──────────────────────────────────────────── */
  const [assets, setAssets] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [activeFolder, setActiveFolder] = useState(null);   // null = All Files
  const [mediaTypeFilter, setMediaTypeFilter] = useState(null); // null | "image" | "video"
  const [search, setSearch] = useState("");
  const [filesView, setFilesView] = useState("grid");
  const [loading, setLoading] = useState(false);



  /* ── upload modal state ──────────────────────────────────── */
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("media"); // which folder to save to
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState("");

  /* ── detail / edit modal state ───────────────────────────── */
  const [detailAsset, setDetailAsset] = useState(null);
  const [detailForm, setDetailForm] = useState({ altText: "" });
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState("");

  /* ── delete confirm modal state ──────────────────────────── */
  const [deleteAsset, setDeleteAsset] = useState(null);

  /* ── fetch assets ────────────────────────────────────────── */
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, orderBy: "createdAt", order: "desc" });
      if (activeFolder)    params.set("folder",    activeFolder);
      if (mediaTypeFilter) params.set("mediaType", mediaTypeFilter);
      // apiGet returns the parsed JSON directly:
      // { success: true, data: [...], meta: { total, page, limit, totalPages } }
      const res = await apiGet(`/media?${params}`);
      const data = res?.data ?? [];
      const filtered = search
        ? data.filter(
            (a) =>
              (a.url ?? "").toLowerCase().includes(search.toLowerCase()) ||
              (a.altText ?? "").toLowerCase().includes(search.toLowerCase())
          )
        : data;
      setAssets(filtered);
      setMeta({
        total:      res?.meta?.total      ?? 0,
        page,
        limit:      20,
        totalPages: res?.meta?.totalPages ?? 1,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, activeFolder, mediaTypeFilter, search]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  /* ── upload handler ──────────────────────────────────────── */
  const handleUpload = async (targetFolder) => {
    if (!uploadFiles.length) return;
    setUploading(true);
    setUploadErrors([]);
    setUploadSuccess("");
    const errs = [];
    const folderKey = targetFolder ?? activeFolder ?? "media";
    for (const file of uploadFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folderKey);
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
      setUploadSuccess(`${count} file${count !== 1 ? "s" : ""} uploaded successfully.`);
      fetchAssets();
      // Auto-close after a short delay so the user sees the confirmation
      setTimeout(() => { setUploadModal(false); setUploadSuccess(""); }, 1800);
    } else {
      setUploadErrors(errs);
    }
  };

  /* ── detail helpers ──────────────────────────────────────── */
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

  /* ── delete handler ──────────────────────────────────────── */
  const confirmDelete = async () => {
    try {
      await apiDelete(`/media/${deleteAsset.id}`);
      setDeleteAsset(null);
      if (detailAsset?.id === deleteAsset.id) setDetailAsset(null);
      fetchAssets();
    } catch (e) {
      alert(e.message);
    }
  };



  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <Head title="Media Library" />
      <ContentAlt>
        {/* ── Search + Upload bar ──────────────────────────────────────── */}
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
            <ul className="nk-block-tools g-3">
              <li>
                <Button color="primary" onClick={() => { setUploadFolder(activeFolder ?? "media"); setUploadModal(true); }}>
                  <Icon name="upload-cloud" /> <span>Upload</span>
                </Button>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Folder dropdown ──────────────────────────────────────────── */}
        <div className="px-4 py-2" style={{ borderBottom: "1px solid #dbdfea" }}>
          <UncontrolledDropdown>
            <DropdownToggle tag="a" className="btn btn-white btn-outline-light d-flex align-items-center gap-2" style={{ width: "fit-content" }}>
              <Icon name={FOLDERS.find((f) => f.folder === activeFolder)?.icon ?? "folder"} />
              <span>{FOLDERS.find((f) => f.folder === activeFolder)?.label ?? "All Files"}</span>
              <Icon name="chevron-down" />
            </DropdownToggle>
            <DropdownMenu>
              <ul className="link-list-opt no-bdr">
                {FOLDERS.map(({ label, icon, folder }) => (
                  <li key={label} className={activeFolder === folder ? "active" : ""}>
                    <DropdownItem onClick={() => { setActiveFolder(folder); setPage(1); }}>
                      <Icon name={icon} /><span>{label}</span>
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>

        {/* ── Content area ─────────────────────────────────────────────── */}
        <div className="nk-fmg-body-content">
          {/* Title + type-filter pills + view toggle */}
          <div className="nk-block-head nk-block-head-sm">
            <div className="nk-block-between position-relative">
              <div className="nk-block-head-content">
                <h5 className="nk-block-title page-title">
                  {FOLDERS.find((f) => f.folder === activeFolder)?.label ?? "All Files"}
                </h5>
                <ul className="nk-block-tools g-1 mt-1">
                  {[{ label: "All",    val: null    },
                    { label: "Images", val: "image" },
                    { label: "Videos", val: "video" }].map(({ label, val }) => (
                    <li key={label}>
                      <button
                        className={`btn btn-xs ${mediaTypeFilter === val ? "btn-primary" : "btn-outline-light"}`}
                        onClick={() => { setMediaTypeFilter(val); setPage(1); }}
                      >{label}</button>
                    </li>
                  ))}
                </ul>
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

              {/* Asset list */}
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
                      <div className="py-4 text-center text-muted">No media assets found</div>
                    )}
                    {assets.map((asset) => (
                      <div className="nk-file-item nk-file" key={asset.id}>
                        <div className="nk-file-info">
                          <div className="nk-file-title">
                            <div className="nk-file-icon" style={{ cursor: "pointer" }} onClick={() => openDetail(asset)}>
                              {asset.mediaType === "image" ? (
                                <img
                                  src={asset.url}
                                  alt={asset.altText ?? ""}
                                  style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }}
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              ) : (
                                <span className="nk-file-icon-type">
                                  <em className="icon ni ni-video" style={{ fontSize: 28, color: "#6576ff" }} />
                                </span>
                              )}
                            </div>
                            <div className="nk-file-name">
                              <div className="nk-file-name-text">
                                <span className="title" style={{ cursor: "pointer" }} onClick={() => openDetail(asset)}>
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
                              <div className="tb-lead">
                                <Badge color={asset.mediaType === "image" ? "info" : "warning"} className="badge-sm badge-dim">
                                  {asset.mediaType}
                                </Badge>
                              </div>
                            </div>
                            <div className="nk-file-meta">
                              <div className="tb-lead">
                                {asset.metadata?.fileSizeBytes ? formatSize(Number(asset.metadata.fileSizeBytes)) : "—"}
                              </div>
                            </div>
                            <div className="nk-file-meta">
                              <div className="tb-lead">{formatDate(asset.createdAt)}</div>
                            </div>
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
                                    onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(window.location.origin + asset.url); }}
                                  >
                                    <Icon name="copy" /><span>Copy URL</span>
                                  </a>
                                </li>
                                <li>
                                  <a href="#del" className="dropdown-item text-danger" onClick={(e) => { e.preventDefault(); setDeleteAsset(asset); }}>
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

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="mt-4">
                  <PaginationComponent
                    itemPerPage={20}
                    totalItems={meta.total}
                    paginate={(p) => setPage(p)}
                    currentPage={page}
                  />
                </div>
              )}
        </div>
      </ContentAlt>


      {/* ── Upload Modal ───────────────────────────────────────────────── */}
      <Modal isOpen={uploadModal} size="md" toggle={() => { setUploadModal(false); setUploadFiles([]); setUploadErrors([]); setUploadSuccess(""); }}>
        <ModalBody>
          <div className="nk-modal-head mb-3">
            <h5 className="nk-modal-title title">Upload Media</h5>
          </div>

          {/* Folder selector */}
          <div className="mb-3">
            <label className="form-label">Upload to folder</label>
            <select
              className="form-select form-select-sm"
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
            >
              {FOLDERS.filter((f) => f.folder !== null).map(({ label, folder }) => (
                <option key={folder} value={folder}>{label}</option>
              ))}
            </select>
          </div>

          <Dropzone
            onDrop={(accepted) => setUploadFiles((prev) => [...prev, ...accepted])}
            accept={{ "image/*": [], "video/*": [] }}
          >
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
                  <span className="text-truncate" style={{ maxWidth: 300 }}>{f.name}</span>
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
            <Button color="light" onClick={() => { setUploadModal(false); setUploadFiles([]); setUploadErrors([]); setUploadSuccess(""); }}>Cancel</Button>
            <Button color="primary" disabled={!uploadFiles.length || uploading} onClick={() => handleUpload(uploadFolder)}>
              {uploading ? <Spinner size="sm" /> : <><Icon name="upload-cloud" /> Upload</>}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* ── Detail / Edit Modal ─────────────────────────────────────────── */}
      <Modal isOpen={!!detailAsset} size="lg" toggle={() => setDetailAsset(null)}>
        <ModalBody>
          {detailAsset && (
            <>
              <div className="nk-modal-head mb-3 d-flex align-items-center justify-content-between">
                <h5 className="nk-modal-title title mb-0">Media Details</h5>
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
                  ) : (
                    <video src={detailAsset.url} controls style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 6 }} />
                  )}
                </div>
                <div className="col-12">
                  <table className="table table-sm">
                    <tbody>
                      <tr><th style={{ width: 140 }}>URL</th><td><a href={detailAsset.url} target="_blank" rel="noreferrer">{detailAsset.url}</a></td></tr>
                      <tr><th>Type</th><td><Badge color={detailAsset.mediaType === "image" ? "info" : "warning"} className="badge-sm badge-dim">{detailAsset.mediaType}</Badge></td></tr>
                      {detailAsset.metadata?.mimeType && <tr><th>MIME</th><td>{detailAsset.metadata.mimeType}</td></tr>}
                      {detailAsset.metadata?.fileSizeBytes && <tr><th>Size</th><td>{formatSize(Number(detailAsset.metadata.fileSizeBytes))}</td></tr>}
                      {detailAsset.metadata?.widthPx && <tr><th>Dimensions</th><td>{detailAsset.metadata.widthPx} × {detailAsset.metadata.heightPx} px</td></tr>}
                      <tr><th>Uploaded</th><td>{formatDate(detailAsset.createdAt)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-12">
                  <label className="form-label">Alt Text</label>
                  <input
                    type="text"
                    className="form-control"
                    value={detailForm.altText}
                    onChange={(e) => setDetailForm({ altText: e.target.value })}
                  />
                </div>
                {detailError && <div className="col-12"><div className="alert alert-danger">{detailError}</div></div>}
              </div>
              <div className="mt-3 d-flex justify-content-between">
                <Button color="danger" outline onClick={() => { setDeleteAsset(detailAsset); setDetailAsset(null); }}>
                  <Icon name="trash" /> Delete
                </Button>
                <div className="d-flex gap-2">
                  <Button color="light" onClick={() => setDetailAsset(null)}>Cancel</Button>
                  <Button color="primary" disabled={detailSaving} onClick={saveDetail}>
                    {detailSaving ? <Spinner size="sm" /> : "Save"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </ModalBody>
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
      <Modal isOpen={!!deleteAsset} size="sm" toggle={() => setDeleteAsset(null)}>
        <ModalBody className="text-center">
          <div className="nk-modal-head mb-2">
            <h5 className="nk-modal-title title">Delete Asset</h5>
          </div>
          <p className="text-muted">Are you sure you want to delete this asset? This cannot be undone.</p>
          <div className="d-flex justify-content-center gap-2 mt-3">
            <Button color="light" onClick={() => setDeleteAsset(null)}>Cancel</Button>
            <Button color="danger" onClick={confirmDelete}>Yes, Delete</Button>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default MediaManager;
