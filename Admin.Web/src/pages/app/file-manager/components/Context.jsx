import React, { useState, createContext, useContext, useEffect, useCallback, useRef } from "react";
import { apiGet, apiPost, apiDelete, apiPatch, apiUpload } from "@/utils/apiClient";
import data from "../Data";

const FileManager = createContext();
const FileManagerUpdate = createContext();

export function useFileManager() { return useContext(FileManager); }
export function useFileManagerUpdate() { return useContext(FileManagerUpdate); }

// ─── Shape helpers ────────────────────────────────────────────────────────────

function getExt(url = '') {
  return url.split('/').pop()?.split('?')[0]?.split('.').pop()?.toLowerCase() || '';
}

function getFileIcon(mediaType, ext) {
  if (mediaType === 'image') return 'fileMedia';
  if (mediaType === 'video') return 'fileMovie';
  if (ext === 'pdf') return 'filePDF';
  if (['doc', 'docx'].includes(ext)) return 'fileDoc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'fileSheet';
  if (['ppt', 'pptx'].includes(ext)) return 'filePPT';
  if (ext === 'txt') return 'fileText';
  if (['zip', 'rar', '7z'].includes(ext)) return 'fileZip';
  if (['html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'fileCode';
  return 'fileDoc';
}

function fmtDate(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

function fmtTime(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function assetToFile(asset) {
  const ext = getExt(asset.url);
  const rawName = decodeURIComponent(asset.url.split('/').pop()?.split('?')[0] || 'File');
  const name = asset.altText || rawName;
  return {
    id: asset.id,
    name,
    url: asset.url,
    ext,
    icon: getFileIcon(asset.mediaType, ext),
    size: asset.metadata?.fileSizeBytes
      ? parseFloat((asset.metadata.fileSizeBytes / 1024 / 1024).toFixed(2))
      : 0,
    type: 'file',
    mediaType: asset.mediaType,
    mimeType: asset.metadata?.mimeType,
    date: fmtDate(asset.createdAt),
    time: fmtTime(asset.createdAt),
    starred: false,
    folder: asset.folder,
    deleted: asset.isDeleted || false,
    createdAt: asset.createdAt,
  };
}

function folderToFile(folder) {
  const bytes = folder.totalSizeBytes ?? 0;
  const sizeMB = parseFloat((bytes / 1024 / 1024).toFixed(2));
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    ext: 'zip',
    icon: folder.isSystem ? 'folderSecure' : 'folder',
    size: sizeMB,
    sizeBytes: bytes,
    fileCount: folder.fileCount ?? 0,
    type: 'folder',
    starred: false,
    date: '--',
    time: '--',
    parentSlug: folder.parentSlug,
    isSystem: folder.isSystem,
    deleted: false,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const FileManagerProvider = ({ ...props }) => {
  const [folders, setFolders] = useState([]);

  // rootAssets: assets with no folder (shown at root level)
  const [rootAssets, setRootAssets] = useState([]);
  // folderAssets: assets fetched from API for the currently open folder
  const [folderAssets, setFolderAssets] = useState([]);

  const [deletedAssets, setDeletedAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folderLoading, setFolderLoading] = useState(false);
  const [filesView, setFilesView] = useState('grid');
  const [asideVisibility, setAsideVisibility] = useState(false);
  const [recoveryFilter, setRecoveryFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [contentHeight, setContentHeight] = useState(0);
  const [starredIds, setStarredIds] = useState(new Set());

  // currentFolder: null = root, or { slug, name, parentSlug }
  const [currentFolder, setCurrentFolder] = useState(null);

  const allFilesRef = useRef([]);
  const deletedRef = useRef([]);
  // Ref to always have the latest currentFolder in async callbacks
  const currentFolderRef = useRef(null);
  useEffect(() => { currentFolderRef.current = currentFolder; }, [currentFolder]);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    try {
      const res = await apiGet('/media/folders');
      setFolders(Array.isArray(res) ? res : (res.data || []));
    } catch (e) {
      console.error('Failed to load folders', e);
    }
  }, []);

  // Load assets that belong to no folder (root level) — fetch all and filter client-side
  const loadRootAssets = useCallback(async () => {
    try {
      const res = await apiGet('/media?limit=100&order=desc');
      setRootAssets((res.data || []).filter(a => !a.folder).map(assetToFile));
    } catch (e) {
      console.error('Failed to load root assets', e);
    }
  }, []);

  // Load assets for a specific folder — uses server-side OR logic for system folders
  const loadFolderAssets = useCallback(async (slug) => {
    setFolderLoading(true);
    try {
      const res = await apiGet(`/media?folder=${encodeURIComponent(slug)}&limit=100&order=desc`);
      setFolderAssets((res.data || []).map(assetToFile));
    } catch (e) {
      console.error('Failed to load folder assets', e);
      setFolderAssets([]);
    } finally {
      setFolderLoading(false);
    }
  }, []);

  const loadDeleted = useCallback(async () => {
    try {
      const res = await apiGet('/media?limit=100&includeDeleted=true&order=desc');
      setDeletedAssets((res.data || []).map(assetToFile));
    } catch (e) {
      console.error('Failed to load deleted assets', e);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadFolders(), loadRootAssets(), loadDeleted()]).finally(() => setLoading(false));
  }, [loadFolders, loadRootAssets, loadDeleted]);

  // ── Computed file lists ──────────────────────────────────────────────────────

  const allFolderFiles = folders.map(folderToFile);
  const currentSlug = currentFolder?.slug || null;

  // Folders visible at the current navigation level
  const visibleFolders = currentSlug === null
    ? allFolderFiles.filter(f => !f.parentSlug)
    : allFolderFiles.filter(f => f.parentSlug === currentSlug);

  // Assets visible at the current navigation level
  // At root: use rootAssets (assets with no folder)
  // In a folder: use folderAssets (fetched from API with ?folder=slug)
  const visibleAssets = currentSlug === null ? rootAssets : folderAssets;

  const filesWithStarred = [...visibleFolders, ...visibleAssets].map(f => ({
    ...f,
    starred: starredIds.has(f.id),
  }));

  // Flat list of all folders + root assets for Starred view and lookup
  const allFilesFlat = [...allFolderFiles, ...rootAssets, ...folderAssets].map(f => ({
    ...f,
    starred: starredIds.has(f.id),
  }));

  const deletedFiles = deletedAssets.map(f => ({
    ...f,
    deleted: true,
    starred: starredIds.has(f.id),
  }));

  allFilesRef.current = allFilesFlat;
  deletedRef.current = deletedFiles;

  // ── Actions ──────────────────────────────────────────────────────────────────

  const fileManagerUpdate = {

    reload: async () => {
      await Promise.all([loadFolders(), loadRootAssets(), loadDeleted()]);
      if (currentFolderRef.current) {
        await loadFolderAssets(currentFolderRef.current.slug);
      }
    },

    // Navigate into a folder — fetches folder's assets from the API
    navigateFolder: async (folderObj) => {
      if (!folderObj) {
        setCurrentFolder(null);
        setFolderAssets([]);
        setSearch('');
        return;
      }
      setCurrentFolder({ slug: folderObj.slug, name: folderObj.name, parentSlug: folderObj.parentSlug });
      setSearch('');
      await loadFolderAssets(folderObj.slug);
    },

    // Navigate back to parent or root
    navigateUp: async () => {
      if (!currentFolderRef.current) return;
      if (currentFolderRef.current.parentSlug) {
        const parent = folders.find(f => f.slug === currentFolderRef.current.parentSlug);
        if (parent) {
          setCurrentFolder({ slug: parent.slug, name: parent.name, parentSlug: parent.parentSlug });
          setSearch('');
          await loadFolderAssets(parent.slug);
          return;
        }
      }
      setCurrentFolder(null);
      setFolderAssets([]);
      setSearch('');
    },

    // Reset to root (called on sidebar route change)
    resetNavigation: () => {
      setCurrentFolder(null);
      setFolderAssets([]);
      setSearch('');
    },

    toggleStarred: (id) => {
      setStarredIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    },

    toTrash: async (id, newDeletedState) => {
      const item = allFilesRef.current.find(f => f.id === id)
        || deletedRef.current.find(f => f.id === id);

      try {
        if (item?.type === 'folder') {
          if (newDeletedState) {
            await apiDelete(`/media/folders/${item.slug}`);
            await loadFolders();
          }
        } else {
          if (newDeletedState) {
            await apiDelete(`/media/${id}`);
          } else {
            await apiPatch(`/media/${id}`, { isDeleted: false });
          }
          await loadDeleted();
          if (currentFolderRef.current) {
            await loadFolderAssets(currentFolderRef.current.slug);
          } else {
            await loadRootAssets();
          }
        }
      } catch (err) {
        console.error('Trash/Restore failed', err);
      }
    },

    asideVisibility: () => setAsideVisibility(v => !v),
    asideHide: () => setAsideVisibility(false),
    filesView: (v) => setFilesView(v),
    recoveryFilter: () => setRecoveryFilter(v => !v),
    currentPlan: () => {},
    search: (v) => setSearch(v),
    contentHeight: (v) => setContentHeight(v),

    createFolder: async ({ name, slug, parentSlug }) => {
      await apiPost('/media/folders', {
        name,
        slug,
        ...(parentSlug ? { parentSlug } : {}),
      });
      await loadFolders();
    },

    uploadFile: async (file, folderSlug, altText) => {
      const fd = new FormData();
      fd.append('file', file);
      if (folderSlug) fd.append('folder', folderSlug);
      if (altText) fd.append('altText', altText);
      await apiUpload('/media/upload', fd);
      // Reload the correct asset list based on where the file was uploaded
      if (folderSlug) {
        await loadFolderAssets(folderSlug);
        // If we're in a different folder than where we uploaded, also update current view
        if (currentFolderRef.current && currentFolderRef.current.slug !== folderSlug) {
          await loadFolderAssets(currentFolderRef.current.slug);
        }
      } else {
        await loadRootAssets();
      }
    },

    updateAlt: async (id, altText) => {
      await apiPatch(`/media/${id}`, { altText });
      if (currentFolderRef.current) {
        await loadFolderAssets(currentFolderRef.current.slug);
      } else {
        await loadRootAssets();
      }
    },

    moveToFolder: async (id, folderSlug) => {
      await apiPatch(`/media/${id}`, { folder: folderSlug || null });
      // Refresh current view since the asset may have moved out
      if (currentFolderRef.current) {
        await loadFolderAssets(currentFolderRef.current.slug);
      } else {
        await loadRootAssets();
      }
    },

    deleteFolder: async (slug) => {
      await apiDelete(`/media/folders/${slug}`);
      await loadFolders();
    },
  };

  const fileManager = {
    search,
    data,
    files: filesWithStarred,
    allFiles: allFilesFlat,
    deletedFiles,
    folders,
    loading: loading || folderLoading,
    filesView,
    asideVisibility,
    recoveryFilter,
    currentFolder,
    currentPlan: 'planid01',
    contentHeight,
  };

  return (
    <FileManager.Provider value={{ fileManager }}>
      <FileManagerUpdate.Provider value={{ fileManagerUpdate }}>
        {props.children}
      </FileManagerUpdate.Provider>
    </FileManager.Provider>
  );
};

export default FileManagerProvider;
