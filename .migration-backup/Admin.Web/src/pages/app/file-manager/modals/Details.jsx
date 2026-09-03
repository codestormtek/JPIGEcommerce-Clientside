import React, { useState } from "react";
import { Icon } from "@/components/Component";
import { Button, Spinner } from "reactstrap";
import icons from "../components/Icons";
import { useFileManagerUpdate } from "../components/Context";

const Details = ({ file, toggle, toggleShare, triggerDownload }) => {
  const { fileManagerUpdate } = useFileManagerUpdate();

  const [editing, setEditing] = useState(false);
  const [altText, setAltText] = useState(file.name || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const isImage = file.mediaType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.ext);
  const isVideo = file.mediaType === 'video' || ['mp4', 'webm'].includes(file.ext);

  const handleSaveAlt = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await fileManagerUpdate.updateAlt(file.id, altText.trim());
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.target = '_blank';
      a.download = file.name;
      a.click();
    } else {
      triggerDownload(file);
    }
  };

  const handleCopyUrl = () => {
    if (file.url) {
      navigator.clipboard.writeText(file.url).catch(() => {});
    }
  };

  return (
    <React.Fragment>
      <div className="modal-header align-center">
        <div className="nk-file-title">
          <div className="nk-file-icon">
            <div className="nk-file-icon-type">{icons[file.icon]}</div>
          </div>
          <div className="nk-file-name">
            <div className="nk-file-name-text">
              <span className="title">{file.name}</span>
            </div>
            <div className="nk-file-name-sub">{file.type}</div>
          </div>
        </div>
        <a href="#close" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="close">
          <Icon name="cross-sm"></Icon>
        </a>
      </div>

      <div className="modal-body">
        {isImage && file.url && (
          <div className="mb-3 text-center">
            <img
              src={file.url}
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: 4 }}
            />
          </div>
        )}
        {isVideo && file.url && (
          <div className="mb-3">
            <video src={file.url} controls style={{ width: '100%', maxHeight: '200px', borderRadius: 4 }} />
          </div>
        )}

        <div className="nk-file-details">
          <div className="nk-file-details-row">
            <div className="nk-file-details-col">Alt / Name</div>
            <div className="nk-file-details-col">
              {editing ? (
                <div className="d-flex gap-1 align-items-center">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                  />
                  <Button size="sm" color="primary" onClick={handleSaveAlt} disabled={saving}>
                    {saving ? <Spinner size="sm" /> : 'Save'}
                  </Button>
                  <Button size="sm" color="light" onClick={() => { setEditing(false); setAltText(file.name); }}>
                    ✕
                  </Button>
                </div>
              ) : (
                <span>
                  {file.name}{' '}
                  <a href="#edit" onClick={(ev) => { ev.preventDefault(); setEditing(true); }} className="link link-primary link-sm ms-1">
                    <Icon name="edit" />
                  </a>
                </span>
              )}
              {saveError && <div className="text-danger small">{saveError}</div>}
            </div>
          </div>

          {file.size > 0 && (
            <div className="nk-file-details-row">
              <div className="nk-file-details-col">Size</div>
              <div className="nk-file-details-col">{file.size} MB</div>
            </div>
          )}

          <div className="nk-file-details-row">
            <div className="nk-file-details-col">Type</div>
            <div className="nk-file-details-col">{file.mimeType || file.ext || file.mediaType || '—'}</div>
          </div>

          {file.folder && (
            <div className="nk-file-details-row">
              <div className="nk-file-details-col">Folder</div>
              <div className="nk-file-details-col">{file.folder}</div>
            </div>
          )}

          <div className="nk-file-details-row">
            <div className="nk-file-details-col">Starred</div>
            <div className="nk-file-details-col">{file.starred ? 'Yes' : 'No'}</div>
          </div>

          <div className="nk-file-details-row">
            <div className="nk-file-details-col">Created</div>
            <div className="nk-file-details-col">{file.time}, {file.date}</div>
          </div>

          {file.url && (
            <div className="nk-file-details-row">
              <div className="nk-file-details-col">URL</div>
              <div className="nk-file-details-col" style={{ wordBreak: 'break-all', fontSize: '0.78rem' }}>
                <a href={file.url} target="_blank" rel="noreferrer" className="link link-primary">{file.url}</a>
                {' '}
                <a href="#copy" onClick={(ev) => { ev.preventDefault(); handleCopyUrl(); }} className="link link-sm ms-1" title="Copy URL">
                  <Icon name="copy" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="modal-footer modal-footer-stretch bg-light">
        <div className="modal-footer-between">
          <div className="g">
            <a href="#copy" onClick={(ev) => { ev.preventDefault(); handleCopyUrl(); }} className="link link-primary">
              Copy URL
            </a>
          </div>
          <div className="g">
            <ul className="btn-toolbar g-3">
              {file.type === 'file' && (
                <li>
                  <a
                    href="#file-share"
                    onClick={(ev) => { ev.preventDefault(); toggle(); toggleShare(); }}
                    className="btn btn-outline-light btn-white"
                  >
                    Share
                  </a>
                </li>
              )}
              <li>
                <a href="#download" onClick={(ev) => { ev.preventDefault(); handleDownload(); }} className="btn btn-primary">
                  Download
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Details;
