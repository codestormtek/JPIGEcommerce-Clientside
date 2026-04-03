import React, { useState, useEffect } from "react";
import { Button, Spinner, Progress } from "reactstrap";
import { Icon } from "@/components/Component";
import { useFileManager, useFileManagerUpdate } from "../components/Context";

// ── MIME helpers (same map as UploadZip) ────────────────────────────────────

const EXT_MIME_MAP = {
  eps:  "application/postscript",
  ai:   "application/illustrator",
  ps:   "application/postscript",
  pdf:  "application/pdf",
  doc:  "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls:  "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt:  "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv:  "text/csv",
  txt:  "text/plain",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  gif:  "image/gif",
  webp: "image/webp",
  svg:  "image/svg+xml",
  mp4:  "video/mp4",
  webm: "video/webm",
  zip:  "application/zip",
  rar:  "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
};

function mimeForFilename(name) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return EXT_MIME_MAP[ext] || "application/octet-stream";
}

function toSlug(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function makeSlug(folderPath, prefix) {
  return `${prefix}-${toSlug(folderPath.replace(/\//g, "-"))}`;
}

// ── FileSystem Entry traversal ───────────────────────────────────────────────

async function readAllEntries(dirEntry) {
  const reader = dirEntry.createReader();
  const all = [];
  for (;;) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
}

function entryToFile(fileEntry) {
  return new Promise((res, rej) => fileEntry.file(res, rej));
}

// Parse a File list that has webkitRelativePath set (from <input webkitdirectory>)
function parseFileListByPath(fileList) {
  const folderPathSet = new Set();
  const files = [];

  for (const file of fileList) {
    const rel = file.webkitRelativePath || file.name;
    const parts = rel.split("/");
    // Collect all ancestor folder paths
    for (let i = 1; i < parts.length; i++) {
      folderPathSet.add(parts.slice(0, i).join("/"));
    }
    const mime = mimeForFilename(file.name);
    const fixedFile = mime !== file.type ? new File([file], file.name, { type: mime }) : file;
    files.push({
      name: parts[parts.length - 1],
      folderPath: parts.length > 1 ? parts.slice(0, -1).join("/") : null,
      file: fixedFile,
    });
  }

  const folders = Array.from(folderPathSet)
    .sort((a, b) => a.split("/").length - b.split("/").length)
    .map((path) => {
      const parts = path.split("/");
      return { path, name: parts[parts.length - 1], parentPath: parts.length > 1 ? parts.slice(0, -1).join("/") : null };
    });

  return { folders, files };
}

// Recursively walk FileSystemEntry items into { folders, files }
async function traverseEntries(rootEntries) {
  // Handle virtual entries created from <input webkitdirectory>
  if (rootEntries.length === 1 && rootEntries[0]._isVirtual) {
    return parseFileListByPath(rootEntries[0]._fileList);
  }

  const folders = [];
  const files = [];

  async function walk(entry, parentPath) {
    // Skip hidden and macOS metadata
    if (entry.name.startsWith(".") || entry.name === "__MACOSX") return;

    if (entry.isFile) {
      const raw = await entryToFile(entry);
      const mime = mimeForFilename(entry.name);
      const file = mime !== raw.type
        ? new File([raw], raw.name, { type: mime })
        : raw;
      files.push({ name: entry.name, folderPath: parentPath, file });
    } else if (entry.isDirectory) {
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      folders.push({ path, name: entry.name, parentPath: parentPath ?? null });
      const children = await readAllEntries(entry);
      for (const child of children) {
        await walk(child, path);
      }
    }
  }

  for (const entry of rootEntries) {
    await walk(entry, null);
  }

  // Ensure parents come before children
  folders.sort((a, b) => a.path.split("/").length - b.path.split("/").length);
  return { folders, files };
}

// ── Tree preview (mirrors UploadZip) ────────────────────────────────────────

function TreeNode({ name, children, isFile }) {
  const [open, setOpen] = useState(true);
  const hasChildren = children && children.length > 0;
  return (
    <div style={{ marginLeft: 16 }}>
      <div
        className="d-flex align-items-center gap-1 py-1"
        style={{ cursor: hasChildren ? "pointer" : "default", userSelect: "none" }}
        onClick={() => hasChildren && setOpen((v) => !v)}
      >
        {isFile ? (
          <em className="icon ni ni-file text-muted" style={{ fontSize: 13 }} />
        ) : (
          <em
            className={`icon ni ni-folder${open ? "-open" : ""} text-warning`}
            style={{ fontSize: 13 }}
          />
        )}
        <span className="small">{name}</span>
        {hasChildren && (
          <em
            className={`icon ni ni-chevron-${open ? "up" : "down"} text-muted ms-auto`}
            style={{ fontSize: 10 }}
          />
        )}
      </div>
      {open && hasChildren && children}
    </div>
  );
}

function buildTree(folders, files) {
  const folderMap = {};
  folders.forEach((f) => { folderMap[f.path] = { name: f.name, children: [] }; });
  folders.forEach((f) => {
    if (f.parentPath && folderMap[f.parentPath]) {
      folderMap[f.parentPath].children.push({ type: "folder", path: f.path });
    }
  });
  files.forEach((f) => {
    if (f.folderPath && folderMap[f.folderPath]) {
      folderMap[f.folderPath].children.push({ type: "file", name: f.name });
    }
  });

  const roots   = folders.filter((f) => !f.parentPath);
  const rootFiles = files.filter((f) => !f.folderPath);

  function renderNode(item) {
    if (item.type === "file") return <TreeNode key={item.name} name={item.name} isFile />;
    const node = folderMap[item.path];
    return (
      <TreeNode key={item.path} name={node.name}>
        {node.children.map(renderNode)}
      </TreeNode>
    );
  }

  return (
    <>
      {roots.map((r) => renderNode({ type: "folder", path: r.path }))}
      {rootFiles.map((f) => <TreeNode key={f.path ?? f.name} name={f.name} isFile />)}
    </>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

/**
 * entries — array of FileSystemEntry objects collected during the dragdrop event
 */
const UploadFolder = ({ entries, toggle }) => {
  const { fileManager }      = useFileManager();
  const { fileManagerUpdate } = useFileManagerUpdate();

  const [parsed,     setParsed]     = useState(null);  // { folders, files }
  const [parsing,    setParsing]    = useState(false);
  const [parseError, setParseError] = useState("");

  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState({ done: 0, total: 0, current: "" });
  const [uploadError, setUploadError] = useState("");

  // Traverse entries as soon as they arrive
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    setParsed(null);
    setParseError("");
    setParsing(true);
    traverseEntries(entries)
      .then((result) => {
        if (result.folders.length === 0 && result.files.length === 0) {
          setParseError("The dragged folder appears to be empty.");
        } else {
          setParsed(result);
        }
      })
      .catch((e) => setParseError("Could not read folder: " + (e.message || "Unknown error")))
      .finally(() => setParsing(false));
  }, [entries]);

  const handleUpload = async () => {
    if (!parsed) return;
    setUploading(true);
    setUploadError("");

    const { folders, files } = parsed;
    const total = folders.length + files.length;
    let done = 0;

    // Unique slug prefix (timestamp-based to avoid collisions)
    const prefix = "fd-" + Date.now().toString(36).slice(-6);
    const slugMap = {};

    const parentContextSlug = fileManager.currentFolder?.slug ?? null;

    try {
      // 1. Create folders (parents first, guaranteed by sort)
      for (const folder of folders) {
        const slug = makeSlug(folder.path, prefix);
        slugMap[folder.path] = slug;

        const parentSlug = folder.parentPath
          ? slugMap[folder.parentPath]
          : parentContextSlug;

        setProgress({ done, total, current: `Creating folder: ${folder.name}` });
        await fileManagerUpdate.createFolder({ name: folder.name, slug, parentSlug });
        done++;
        setProgress({ done, total, current: `Created: ${folder.name}` });
      }

      // 2. Upload files
      for (const item of files) {
        const folderSlug = item.folderPath
          ? slugMap[item.folderPath]
          : parentContextSlug ?? undefined;

        setProgress({ done, total, current: `Uploading: ${item.name}` });
        await fileManagerUpdate.uploadFile(item.file, folderSlug);
        done++;
        setProgress({ done, total, current: `Uploaded: ${item.name}` });
      }

      await fileManagerUpdate.reload();
      toggle();
    } catch (e) {
      setUploadError(e.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const totalItems = parsed ? parsed.folders.length + parsed.files.length : 0;

  const droppedNames = entries
    ? [...new Set(entries.map((e) => e.name))].join(", ")
    : "";

  return (
    <React.Fragment>
      <a
        href="#close"
        onClick={(ev) => { ev.preventDefault(); toggle(); }}
        className="close"
      >
        <Icon name="cross-sm" />
      </a>
      <div className="modal-body modal-body-md">
        <h5 className="title mb-1">Upload Folder</h5>
        <p className="text-muted small mb-3">
          {droppedNames && <><strong>{droppedNames}</strong> — </>}
          uploading folder structure
          {fileManager.currentFolder && (
            <> into <strong>{fileManager.currentFolder.name}</strong></>
          )}.
        </p>

        {/* Parsing */}
        {parsing && (
          <div className="text-center py-3">
            <Spinner size="sm" color="primary" className="me-2" />
            <span className="text-muted small">Reading folder structure…</span>
          </div>
        )}

        {parseError && (
          <div className="alert alert-danger py-2 px-3 small mt-2">{parseError}</div>
        )}

        {/* Tree preview */}
        {parsed && !uploading && (
          <>
            <div className="d-flex align-items-center justify-content-between mb-2 mt-1">
              <span className="fw-medium small text-muted">
                {parsed.folders.length} folder{parsed.folders.length !== 1 ? "s" : ""},{" "}
                {parsed.files.length} file{parsed.files.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div
              className="rounded border px-2 py-1 mb-3"
              style={{ maxHeight: 280, overflowY: "auto", background: "#f8f9fa" }}
            >
              {buildTree(parsed.folders, parsed.files)}
            </div>
          </>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mt-2 mb-3">
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span className="text-truncate me-2" style={{ maxWidth: "80%" }}>
                {progress.current}
              </span>
              <span className="flex-shrink-0">
                {progress.done} / {progress.total}
              </span>
            </div>
            <Progress
              value={progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}
              color="primary"
              style={{ height: 6 }}
            />
          </div>
        )}

        {uploadError && (
          <div className="alert alert-danger py-2 px-3 small mt-2">{uploadError}</div>
        )}

        <div className="nk-modal-action justify-end">
          <ul className="btn-toolbar g-4 align-center">
            <li>
              <a
                href="#cancel"
                onClick={(ev) => { ev.preventDefault(); toggle(); }}
                className="link link-primary"
              >
                Cancel
              </a>
            </li>
            <li>
              <Button
                color="primary"
                onClick={handleUpload}
                disabled={!parsed || uploading}
              >
                {uploading ? (
                  <><Spinner size="sm" className="me-1" />Uploading…</>
                ) : (
                  <><Icon name="upload-cloud" className="me-1" />
                  Upload {totalItems > 0 ? `(${totalItems} items)` : ""}</>
                )}
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </React.Fragment>
  );
};

export default UploadFolder;
