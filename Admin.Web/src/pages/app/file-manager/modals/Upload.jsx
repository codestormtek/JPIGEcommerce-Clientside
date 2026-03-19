import React, { useState } from "react";
import Dropzone from "react-dropzone";
import { Button, Spinner } from "reactstrap";
import { Icon } from "@/components/Component";
import { bytesToMegaBytes } from "@/utils/Utils";
import { iconsType } from '../components/Icons';
import { useFileManagerUpdate, useFileManager } from "../components/Context";

const Upload = ({ toggle }) => {
  const { fileManagerUpdate } = useFileManagerUpdate();
  const { fileManager } = useFileManager();

  const [files, setFiles] = useState([]);
  const [folderSlug, setFolderSlug] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleDropChange = (acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  };

  const removeFromList = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const handleUpload = async () => {
    if (files.length === 0) { setError('Please add at least one file.'); return; }
    setUploading(true);
    setError('');
    try {
      await Promise.all(files.map(file => fileManagerUpdate.uploadFile(file, folderSlug || undefined)));
      toggle();
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const topFolders = fileManager.folders.filter(f => !f.parentSlug);
  const childFolders = (slug) => fileManager.folders.filter(f => f.parentSlug === slug);

  return (
    <React.Fragment>
      <a href="#close" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="close">
        <Icon name="cross-sm"></Icon>
      </a>
      <div className="modal-body modal-body-md">
        <div className="nk-upload-form">
          <h5 className="title mb-3">Upload Files</h5>

          <div className="form-group mb-3">
            <label className="form-label">Upload to Folder <span className="text-muted small">(optional)</span></label>
            <select
              className="form-select form-select-sm"
              value={folderSlug}
              onChange={(e) => setFolderSlug(e.target.value)}
            >
              <option value="">No folder (root)</option>
              {topFolders.map(f => (
                <React.Fragment key={f.slug}>
                  <option value={f.slug}>{f.name}</option>
                  {childFolders(f.slug).map(child => (
                    <option key={child.slug} value={child.slug}>
                      {"\u00a0\u00a0\u00a0\u00a0↳ "}{child.name}
                    </option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </div>

          <Dropzone onDrop={handleDropChange}>
            {({ getRootProps, getInputProps }) => (
              <section>
                <div {...getRootProps()} className="dropzone upload-zone small bg-lighter my-2 dz-clickable">
                  <input {...getInputProps()} />
                  <div className="dz-message">
                    <span className="dz-message-text">
                      <span>Drag and drop</span> files here or <span>browse</span>
                    </span>
                  </div>
                </div>
              </section>
            )}
          </Dropzone>
        </div>

        <div className="nk-upload-list">
          <h6 className="title">Selected Files</h6>
          {files.length > 0 ? (
            files.map((file, index) => (
              <div className="nk-upload-item" key={index}>
                <div className="nk-upload-icon">
                  {iconsType[file.type] ? iconsType[file.type] : iconsType["others"]}
                </div>
                <div className="nk-upload-info">
                  <div className="nk-upload-title">
                    <span className="title">{file.name}</span>
                  </div>
                  <div className="nk-upload-size">{bytesToMegaBytes(file.size)} MB</div>
                </div>
                <div className="nk-upload-action">
                  <a
                    href="#delete"
                    onClick={(ev) => { ev.preventDefault(); removeFromList(file.name); }}
                    className="btn btn-icon btn-trigger"
                  >
                    <Icon name="trash"></Icon>
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="d-flex justify-center">
              <span className="text-muted">No files added yet</span>
            </div>
          )}
        </div>

        {error && <div className="text-danger small mt-2">{error}</div>}

        <div className="nk-modal-action justify-end">
          <ul className="btn-toolbar g-4 align-center">
            <li>
              <a href="#toggle" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="link link-primary">
                Cancel
              </a>
            </li>
            <li>
              <Button color="primary" onClick={handleUpload} disabled={uploading || files.length === 0}>
                {uploading ? <><Spinner size="sm" className="me-1" />Uploading…</> : 'Upload Files'}
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Upload;
