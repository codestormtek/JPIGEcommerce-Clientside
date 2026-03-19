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
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    ext: 'zip',
    icon: folder.isSystem ? 'folderSecure' : 'folder',
    size: 0,
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
  const [assets, setAssets] = useState([]);
  const [deletedAssets, setDeletedAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filesView, setFilesView] = useState('grid');
  const [asideVisibility, setAsideVisibility] = useState(false);
  const [recoveryFilter, setRecoveryFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [contentHeight, setContentHeight] = useState(0);
  const [starredIds, setStarredIds] = useState(new Set());

  const allFilesRef = useRef([]);
  const deletedRef = useRef([]);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    try {
      const res = await apiGet('/media/folders');
      setFolders(Array.isArray(res) ? res : (res.data || []));
    } catch (e) {
      console.error('Failed to load folders', e);
    }
  }, []);

  const loadAssets = useCallback(async () => {
    try {
      const res = await apiGet('/media?limit=100&order=desc');
      setAssets((res.data || []).map(assetToFile));
    } catch (e) {
      console.error('Failed to load assets', e);
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
    Promise.all([loadFolders(), loadAssets(), loadDeleted()]).finally(() => setLoading(false));
  }, [loadFolders, loadAssets, loadDeleted]);

  // ── Combined file lists ──────────────────────────────────────────────────────

  const folderFiles = folders.map(folderToFile);

  const filesWithStarred = [...folderFiles, ...assets].map(f => ({
    ...f,
    starred: starredIds.has(f.id),
  }));

  const deletedFiles = deletedAssets.map(f => ({
    ...f,
    deleted: true,
    starred: starredIds.has(f.id),
  }));

  allFilesRef.current = filesWithStarred;
  deletedRef.current = deletedFiles;

  const fileManager = {
    search,
    data,
    files: filesWithStarred,
    deletedFiles,
    folders,
    loading,
    filesView,
    asideVisibility,
    recoveryFilter,
    currentPlan: 'planid01',
    contentHeight,
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const fileManagerUpdate = {

    reload: async () => {
      await Promise.all([loadFolders(), loadAssets(), loadDeleted()]);
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
          await Promise.all([loadAssets(), loadDeleted()]);
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
      await loadAssets();
    },

    updateAlt: async (id, altText) => {
      await apiPatch(`/media/${id}`, { altText });
      await loadAssets();
    },

    moveToFolder: async (id, folderSlug) => {
      await apiPatch(`/media/${id}`, { folder: folderSlug || null });
      await loadAssets();
    },

    deleteFolder: async (slug) => {
      await apiDelete(`/media/folders/${slug}`);
      await loadFolders();
    },
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
