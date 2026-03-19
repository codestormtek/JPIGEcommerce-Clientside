import React, { useState } from "react";
import { Icon } from "@/components/Component";
import { Button, Spinner } from "reactstrap";
import { useFileManagerUpdate, useFileManager } from "../components/Context";

function slugify(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9_\-]/g, '');
}

const CreateFolder = ({ toggle }) => {
  const { fileManagerUpdate } = useFileManagerUpdate();
  const { fileManager } = useFileManager();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentSlug, setParentSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setSlug(slugify(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Folder name is required.'); return; }
    if (!slug.trim()) { setError('Slug is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await fileManagerUpdate.createFolder({ name: name.trim(), slug: slug.trim(), parentSlug: parentSlug || undefined });
      toggle();
    } catch (err) {
      setError(err.message || 'Failed to create folder.');
    } finally {
      setSaving(false);
    }
  };

  const topFolders = fileManager.folders.filter(f => !f.parentSlug);
  const childFolders = (parentSlug) => fileManager.folders.filter(f => f.parentSlug === parentSlug);

  return (
    <React.Fragment>
      <a href="#close" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="close">
        <Icon name="cross-sm"></Icon>
      </a>
      <div className="modal-body modal-body-md">
        <div className="nk-upload-form mb-0">
          <h5 className="title mb-3">Create Folder</h5>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Folder Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Product Images"
                value={name}
                onChange={handleNameChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. product-images"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
              <small className="text-muted">Lowercase letters, numbers, hyphens.</small>
            </div>
            <div className="form-group">
              <label className="form-label">Parent Folder <span className="text-muted small">(optional)</span></label>
              <select
                className="form-select"
                value={parentSlug}
                onChange={(e) => setParentSlug(e.target.value)}
              >
                <option value="">None (top-level)</option>
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
            {error && <div className="text-danger small mb-2">{error}</div>}
            <ul className="btn-toolbar g-4 align-center justify-end">
              <li>
                <a href="#" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="link link-primary">
                  Cancel
                </a>
              </li>
              <li>
                <Button color="primary" type="submit" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : 'Create'}
                </Button>
              </li>
            </ul>
          </form>
        </div>
      </div>
    </React.Fragment>
  );
};

export default CreateFolder;
