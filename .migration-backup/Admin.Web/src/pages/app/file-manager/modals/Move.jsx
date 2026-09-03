import React, { useState } from "react";
import { Icon } from "@/components/Component";
import { Button, Spinner } from "reactstrap";
import { useFileManager, useFileManagerUpdate } from "../components/Context";
import icons from "../components/Icons";

const Move = ({ file, toggle, toggleCreate }) => {
  const { fileManager } = useFileManager();
  const { fileManagerUpdate } = useFileManagerUpdate();

  const [selected, setSelected] = useState(file.folder || '');
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');

  const folderList = fileManager.files.filter(f => f.type === 'folder' && !f.deleted);

  const handleMove = async () => {
    if (file.type === 'folder') { toggle(); return; }
    setMoving(true);
    setError('');
    try {
      await fileManagerUpdate.moveToFolder(file.id, selected || null);
      toggle();
    } catch (err) {
      setError(err.message || 'Move failed.');
    } finally {
      setMoving(false);
    }
  };

  return (
    <React.Fragment>
      <div className="modal-header align-center border-bottom-0">
        <h5 className="modal-title">Move item to…</h5>
        <a href="#close" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="close">
          <Icon name="cross-sm"></Icon>
        </a>
      </div>
      <div className="modal-body pt-0 mt-n2">
        <ul className="breadcrumb breadcrumb-alt breadcrumb-xs breadcrumb-arrow mb-1">
          <li className="breadcrumb-item">Files</li>
          <li className="breadcrumb-item">{file.name}</li>
        </ul>

        {file.type === 'folder' ? (
          <p className="text-muted small">Folders cannot be moved.</p>
        ) : (
          <div className="nk-fmg-listing is-scrollable">
            <div className="nk-files nk-files-view-list is-compact">
              <div className="nk-files-list">
                <div
                  className={`nk-file-item nk-file ${selected === '' ? 'selected' : ''}`}
                  onClick={() => setSelected('')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="nk-file-info">
                    <div className="nk-file-title">
                      <div className="nk-file-icon">
                        <div className="nk-file-icon-type">{icons['folder']}</div>
                      </div>
                      <div className="nk-file-name">
                        <div className="nk-file-name-text"><span className="title">Root (no folder)</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                {folderList.map(item => (
                  <div
                    className={`nk-file-item nk-file ${item.slug === selected ? 'selected' : ''}`}
                    key={item.id}
                    onClick={() => setSelected(item.slug)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="nk-file-info">
                      <a className="nk-file-link" href="#link" onClick={(ev) => ev.preventDefault()}>
                        <div className="nk-file-title">
                          <div className="nk-file-icon">
                            <div className="nk-file-icon-type">{icons[item.icon]}</div>
                          </div>
                          <div className="nk-file-name">
                            <div className="nk-file-name-text"><span className="title">{item.name}</span></div>
                          </div>
                        </div>
                      </a>
                    </div>
                    <div className="nk-file-actions">
                      <a href="#link" onClick={(ev) => ev.preventDefault()} className="btn btn-sm btn-icon btn-trigger">
                        <Icon name="chevron-right"></Icon>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <div className="text-danger small mt-2">{error}</div>}
      </div>

      <div className="modal-footer bg-light">
        <div className="modal-footer-between">
          <div className="g">
            <a
              href="link"
              onClick={(ev) => { ev.preventDefault(); toggle(); toggleCreate(); }}
              className="link link-primary"
            >
              Create New Folder
            </a>
          </div>
          <div className="g">
            <ul className="btn-toolbar g-3">
              <li>
                <a href="#cancel" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="btn btn-outline-light btn-white">
                  Cancel
                </a>
              </li>
              <li>
                <Button color="primary" onClick={handleMove} disabled={moving || file.type === 'folder'}>
                  {moving ? <Spinner size="sm" /> : 'Move'}
                </Button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Move;
