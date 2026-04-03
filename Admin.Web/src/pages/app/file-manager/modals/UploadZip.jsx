import React, { useState, useCallback } from "react";
import JSZip from "jszip";
import Dropzone from "react-dropzone";
import { Button, Spinner, Progress } from "reactstrap";
import { Icon } from "@/components/Component";
import { useFileManager, useFileManagerUpdate } from "../components/Context";

// ── helpers ──────────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Given a ZIP, return:
//   folders: [{ path, name, parentPath }]  (sorted root-first)
//   files:   [{ path, name, folderPath, zipEntry }]
async function parseZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);
  const folderPathSet = new Set();
  const files = [];

  zip.forEach((relativePath, entry) => {
    // Ignore macOS metadata and hidden files
    if (
      relativePath.startsWith("__MACOSX") ||
      relativePath.split("/").some((p) => p.startsWith("."))
    )
      return;

    const parts = relativePath.split("/").filter(Boolean);

    if (entry.dir) {
      // Add this folder and all ancestors
      for (let i = 1; i <= parts.length; i++) {
        folderPathSet.add(parts.slice(0, i).join("/"));
      }
    } else {
      // Add all ancestor folders
      for (let i = 1; i < parts.length; i++) {
        folderPathSet.add(parts.slice(0, i).join("/"));
      }
      files.push({
        path: relativePath,
        name: parts[parts.length - 1],
        folderPath: parts.length > 1 ? parts.slice(0, -1).join("/") : null,
        zipEntry: entry,
      });
    }
  });

  // Sort folders by depth so parents are created before children
  const folders = Array.from(folderPathSet)
    .sort((a, b) => a.split("/").length - b.split("/").length)
    .map((fp) => {
      const parts = fp.split("/");
      return {
        path: fp,
        name: parts[parts.length - 1],
        parentPath: parts.length > 1 ? parts.slice(0, -1).join("/") : null,
      };
    });

  return { folders, files };
}

// Build a slug for a folder path, unique-ified with a prefix
function makeSlug(folderPath, slugPrefix) {
  return `${slugPrefix}-${toSlug(folderPath.replace(/\//g, "-"))}`;
}

// ── Tree preview component ────────────────────────────────────────────────────

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
  // Build a tree structure for display
  const folderMap = {}; // path → { name, children: [] }
  folders.forEach((f) => {
    folderMap[f.path] = { name: f.name, children: [] };
  });

  // Attach child folders to parents
  folders.forEach((f) => {
    if (f.parentPath && folderMap[f.parentPath]) {
      folderMap[f.parentPath].children.push({ type: "folder", path: f.path });
    }
  });

  // Attach files to their folder or root
  files.forEach((f) => {
    if (f.folderPath && folderMap[f.folderPath]) {
      folderMap[f.folderPath].children.push({ type: "file", name: f.name });
    }
  });

  // Root folders (no parent)
  const roots = folders.filter((f) => !f.parentPath);
  const rootFiles = files.filter((f) => !f.folderPath);

  function renderNode(item) {
    if (item.type === "file") {
      return <TreeNode key={item.name} name={item.name} isFile />;
    }
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
      {rootFiles.map((f) => (
        <TreeNode key={f.name} name={f.name} isFile />
      ))}
    </>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

const UploadZip = ({ toggle }) => {
  const { fileManager } = useFileManager();
  const { fileManagerUpdate } = useFileManagerUpdate();

  const [zipFile, setZipFile] = useState(null);
  const [parsed, setParsed] = useState(null); // { folders, files }
  const [parseError, setParseError] = useState("");
  const [parsing, setParsing] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [uploadError, setUploadError] = useState("");

  const handleDrop = useCallback(async (accepted) => {
    const file = accepted[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setParseError("Only .zip files are supported.");
      return;
    }
    setZipFile(file);
    setParsed(null);
    setParseError("");
    setParsing(true);
    try {
      const result = await parseZip(file);
      if (result.files.length === 0 && result.folders.length === 0) {
        setParseError("The ZIP file appears to be empty.");
        return;
      }
      setParsed(result);
    } catch (e) {
      setParseError("Failed to read ZIP: " + (e.message || "Unknown error"));
    } finally {
      setParsing(false);
    }
  }, []);

  const handleImport = async () => {
    if (!parsed) return;
    setUploading(true);
    setUploadError("");

    const { folders, files } = parsed;
    const total = folders.length + files.length;
    let done = 0;

    // Unique prefix so slugs don't collide with existing folders
    const prefix = toSlug(zipFile.name.replace(/\.zip$/i, "")).slice(0, 20) +
      "-" + Date.now().toString(36).slice(-4);

    // Slug lookup: folderPath → created slug
    const slugMap = {};

    // Determine parent context (if we're inside a folder, nest under it)
    const parentContextSlug = fileManager.currentFolder?.slug || null;

    try {
      // 1. Create all folders
      for (const folder of folders) {
        const slug = makeSlug(folder.path, prefix);
        slugMap[folder.path] = slug;

        let parentSlug = null;
        if (folder.parentPath) {
          parentSlug = slugMap[folder.parentPath];
        } else if (parentContextSlug) {
          parentSlug = parentContextSlug;
        }

        setProgress({ done, total, current: `Creating folder: ${folder.name}` });
        await fileManagerUpdate.createFolder({ name: folder.name, slug, parentSlug });
        done++;
        setProgress({ done, total, current: `Created folder: ${folder.name}` });
      }

      // 2. Upload all files
      for (const file of files) {
        const folderSlug = file.folderPath
          ? slugMap[file.folderPath]
          : parentContextSlug || undefined;

        setProgress({ done, total, current: `Uploading: ${file.name}` });

        const buffer = await file.zipEntry.async("arraybuffer");
        const blob = new Blob([buffer]);
        const fileObj = new File([blob], file.name);
        await fileManagerUpdate.uploadFile(fileObj, folderSlug);
        done++;
        setProgress({ done, total, current: `Uploaded: ${file.name}` });
      }

      await fileManagerUpdate.reload();
      toggle();
    } catch (e) {
      setUploadError(e.message || "An error occurred during import.");
    } finally {
      setUploading(false);
    }
  };

  const totalItems = parsed ? parsed.folders.length + parsed.files.length : 0;

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
        <h5 className="title mb-1">Import ZIP Archive</h5>
        <p className="text-muted small mb-3">
          Drop a <code>.zip</code> file to automatically create the folder
          structure and upload all files inside it.
          {fileManager.currentFolder && (
            <> Files will be placed inside <strong>{fileManager.currentFolder.name}</strong>.</>
          )}
        </p>

        {/* Drop zone — only shown until a file is picked */}
        {!zipFile && (
          <Dropzone onDrop={handleDrop} accept={{ "application/zip": [".zip"] }} multiple={false}>
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div
                {...getRootProps()}
                className="dropzone upload-zone small bg-lighter my-2 dz-clickable"
                style={{ borderStyle: isDragActive ? "solid" : "dashed" }}
              >
                <input {...getInputProps()} />
                <div className="dz-message">
                  <em className="icon ni ni-file-zip" style={{ fontSize: 32, color: "#f4a62a" }} />
                  <div className="mt-2">
                    <span className="dz-message-text">
                      <span>Drag and drop</span> a .zip file here or <span>browse</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Dropzone>
        )}

        {/* Parsing spinner */}
        {parsing && (
          <div className="text-center py-3">
            <Spinner size="sm" color="primary" className="me-2" />
            <span className="text-muted small">Reading archive…</span>
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="alert alert-danger py-2 px-3 small mt-2">{parseError}</div>
        )}

        {/* Tree preview */}
        {parsed && !uploading && (
          <>
            <div className="d-flex align-items-center justify-content-between mb-2 mt-1">
              <span className="fw-medium small">
                {zipFile.name} &mdash;{" "}
                <span className="text-muted">
                  {parsed.folders.length} folder{parsed.folders.length !== 1 ? "s" : ""},{" "}
                  {parsed.files.length} file{parsed.files.length !== 1 ? "s" : ""}
                </span>
              </span>
              <button
                className="btn btn-xs btn-outline-light"
                onClick={() => { setZipFile(null); setParsed(null); }}
              >
                Change
              </button>
            </div>
            <div
              className="rounded border px-2 py-1 mb-3"
              style={{ maxHeight: 260, overflowY: "auto", background: "#f8f9fa" }}
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
                onClick={handleImport}
                disabled={!parsed || uploading}
              >
                {uploading ? (
                  <><Spinner size="sm" className="me-1" />Importing…</>
                ) : (
                  <><Icon name="upload-cloud" className="me-1" />
                  Import {totalItems > 0 ? `(${totalItems} items)` : ""}</>
                )}
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </React.Fragment>
  );
};

export default UploadZip;
