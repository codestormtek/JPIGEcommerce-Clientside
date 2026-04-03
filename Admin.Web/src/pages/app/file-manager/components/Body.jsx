import React, {useState, useLayoutEffect, useEffect, useCallback, useRef} from 'react'
import { useLocation } from 'react-router-dom';

import ViewFilter, {options as viewOptions} from './ViewFilter';
import Files from './Files';

import Upload from "../modals/Upload";
import UploadZip from "../modals/UploadZip";
import UploadFolder from "../modals/UploadFolder";
import CreateFolder from "../modals/CreateFolder";
import CreateDocument from "../modals/CreateDocument";

import { useFileManager, useFileManagerUpdate } from "./Context";

import { BlockTitle, BlockBetween, BlockHead, BlockHeadContent, Icon } from "@/components/Component";
import { Button, DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown, Modal } from "reactstrap";
const FilesBody = ({searchBar, title, viewFilter, recoveryFilter, ...props}) => {

    const {fileManager} = useFileManager();
    const {fileManagerUpdate} = useFileManagerUpdate();

    const [createModal, setCreateModal] = useState(false);
    const [uploadModal, setUploadModal] = useState(false);
    const [zipModal, setZipModal] = useState(false);
    const [docModal, setDocModal] = useState(false);
    const [folderModal, setFolderModal] = useState(false);
    const [droppedEntries, setDroppedEntries] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const dragCounter = useRef(0);

    const [search, setSearch] = useState(false);
    const location = useLocation();

    const toggleSearch = () => {
        setSearch(!search);
    };
  
    const toggleCreateModal = () => {
      setCreateModal(!createModal);
    };
    const toggleUploadModal = () => {
      setUploadModal(!uploadModal);
    };

    // Drag-and-drop folder upload handlers
    const onDragEnter = useCallback((e) => {
        e.preventDefault();
        dragCounter.current += 1;
        if (dragCounter.current === 1) setIsDragOver(true);
    }, []);

    const onDragLeave = useCallback((e) => {
        e.preventDefault();
        dragCounter.current -= 1;
        if (dragCounter.current === 0) setIsDragOver(false);
    }, []);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsDragOver(false);

        // Collect FileSystemEntry objects synchronously (they expire after the event)
        const entries = [];
        if (e.dataTransfer.items) {
            for (let i = 0; i < e.dataTransfer.items.length; i++) {
                const entry = e.dataTransfer.items[i].webkitGetAsEntry?.();
                if (entry) entries.push(entry);
            }
        }
        if (entries.length > 0) {
            setDroppedEntries(entries);
            setFolderModal(true);
        }
    }, []);

    useLayoutEffect(() => {
        fileManagerUpdate.search('')
    }, []);

    // Reset folder navigation whenever the sidebar route changes
    useEffect(() => {
        fileManagerUpdate.resetNavigation();
    }, [location.pathname]);

    const searchResult = [ ...fileManager.files.filter(item => !item.deleted && item.name.toLowerCase().includes(fileManager.search.toLowerCase())) ]
    
  return (
    <>
        {searchBar && <div className="nk-fmg-body-head d-none d-lg-flex">
            <div className="nk-fmg-search">
                <Icon name="search"></Icon>
                <input
                    type="text"
                    className="form-control border-transparent form-focus-none"
                    placeholder="Search files, folders"
                    value={fileManager.search}
                    onChange={(ev) => fileManagerUpdate.search(ev.target.value)}
                />
            </div>
            <div className="nk-fmg-actions">
            <ul className="nk-block-tools g-3">
                <li>
                    <UncontrolledDropdown>
                    <DropdownToggle
                        tag="a"
                        href="#toggle"
                        onClick={(ev) => ev.preventDefault()}
                        className="btn btn-light"
                    >
                        <Icon name="plus"></Icon> <span>Create</span>
                    </DropdownToggle>
                    <DropdownMenu end>
                        <ul className="link-list-opt no-bdr">
                        <li>
                            <DropdownItem
                            tag="a"
                            href="#upload"
                            onClick={(ev) => {
                                ev.preventDefault();
                                toggleUploadModal();
                            }}
                            >
                            <Icon name="upload-cloud"></Icon>
                            <span>Upload File</span>
                            </DropdownItem>
                        </li>
                        <li>
                            <DropdownItem
                            tag="a"
                            href="#upload-zip"
                            onClick={(ev) => {
                                ev.preventDefault();
                                setZipModal(true);
                            }}
                            >
                            <Icon name="file-zip"></Icon>
                            <span>Import ZIP</span>
                            </DropdownItem>
                        </li>
                        <li>
                            <DropdownItem
                            tag="a"
                            href="#upload-folder"
                            onClick={(ev) => {
                                ev.preventDefault();
                                const input = document.createElement("input");
                                input.type = "file";
                                input.webkitdirectory = true;
                                input.multiple = true;
                                input.onchange = () => {
                                    const fileList = Array.from(input.files || []);
                                    if (!fileList.length) return;
                                    // Convert File list to synthetic entries via DataTransfer
                                    // Build folder/file lists directly from webkitRelativePath
                                    const syntheticEntries = [{ _fileList: fileList, _isVirtual: true }];
                                    setDroppedEntries(syntheticEntries);
                                    setFolderModal(true);
                                };
                                input.click();
                            }}
                            >
                            <Icon name="folder-plus"></Icon>
                            <span>Upload Folder</span>
                            </DropdownItem>
                        </li>
                        <li>
                            <DropdownItem
                            tag="a"
                            href="#upload"
                            onClick={(ev) => {
                                ev.preventDefault();
                                toggleCreateModal();
                            }}
                            >
                            <Icon name="folder-plus"></Icon>
                            <span>Create Folder</span>
                            </DropdownItem>
                        </li>
                        </ul>
                    </DropdownMenu>
                    </UncontrolledDropdown>
                </li>
                <li>
                    <Button color="light" onClick={() => setDocModal(true)}>
                    <Icon name="file-text"></Icon> <span>Create Document</span>
                    </Button>
                </li>
                <li>
                    <Button color="primary" onClick={() => toggleUploadModal()}>
                    <Icon name="upload-cloud"></Icon> <span>Upload</span>
                    </Button>
                </li>
            </ul>
        </div>
        </div>}
        <div
            className="nk-fmg-body-content"
            style={{ position: "relative" }}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {/* Drag-over overlay */}
            {isDragOver && (
                <div
                    style={{
                        position: "absolute", inset: 0, zIndex: 50,
                        background: "rgba(255,255,255,0.88)",
                        border: "2px dashed #6576ff",
                        borderRadius: 8,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        pointerEvents: "none",
                    }}
                >
                    <em className="icon ni ni-folder-plus" style={{ fontSize: 48, color: "#6576ff" }} />
                    <p className="mt-2 fw-medium text-primary mb-0">
                        Drop folder{fileManager.currentFolder ? ` into "${fileManager.currentFolder.name}"` : " here"}
                    </p>
                    <p className="small text-muted">Sub-folders and files will be uploaded automatically</p>
                </div>
            )}
            <BlockHead size="sm">
                <BlockBetween className="position-relative">
                    <BlockHeadContent>
                        {fileManager.search !== '' ? (
                            <BlockTitle page>Search for : <span className="fw-normal ms-2 text-muted">{fileManager.search}</span></BlockTitle>
                        ) : fileManager.currentFolder ? (
                            <div className="d-flex align-items-center gap-2">
                                <a
                                    href="#back"
                                    onClick={(ev) => { ev.preventDefault(); fileManagerUpdate.navigateUp(); }}
                                    className="btn btn-sm btn-icon btn-trigger"
                                    title="Go back"
                                >
                                    <Icon name="arrow-left" />
                                </a>
                                <BlockTitle page>{fileManager.currentFolder.name}</BlockTitle>
                            </div>
                        ) : (
                            title && title
                        )}
                    </BlockHeadContent>
                    <BlockHeadContent>
                        <ul className="nk-block-tools g-1">
                            {searchBar && <li className="d-lg-none">
                                <a
                                href="#folder"
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    toggleSearch();
                                }}
                                className="btn btn-trigger btn-icon search-toggle toggle-search"
                                >
                                    <Icon name="search"></Icon>
                                </a>
                            </li>}

                            {(viewFilter || fileManager.search !== '') && <li className="d-lg-none">
                                <UncontrolledDropdown>
                                    <DropdownToggle
                                        tag="a"
                                        href="#toggle"
                                        onClick={(ev) => ev.preventDefault()}
                                        className="btn btn-trigger btn-icon"
                                    >
                                        <Icon name={viewOptions.filter((item) => item.value === fileManager.filesView)[0].icon}></Icon>
                                    </DropdownToggle>
                                    <DropdownMenu end>
                                        <ViewFilter listOpt/>
                                    </DropdownMenu>
                                </UncontrolledDropdown>
                            </li>}

                            {recoveryFilter &&<li className="d-lg-none">
                                <a
                                href="#folder"
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    fileManagerUpdate.recoveryFilter();
                                }}
                                className="btn btn-trigger btn-icon toggle-expand"
                                >
                                    <Icon name="opt"></Icon>
                                </a>
                            </li>}

                            <li className="d-lg-none">
                                <UncontrolledDropdown>
                                <DropdownToggle
                                    tag="a"
                                    href="#toggle"
                                    onClick={(ev) => ev.preventDefault()}
                                    className="btn btn-trigger btn-icon"
                                >
                                    <Icon name="plus"></Icon>
                                </DropdownToggle>
                                <DropdownMenu end>
                                    <ul className="link-list-opt no-bdr">
                                    <li>
                                        <DropdownItem
                                        tag="a"
                                        href="#upload"
                                        onClick={(ev) => {
                                            ev.preventDefault();
                                            toggleUploadModal();
                                        }}
                                        >
                                        <Icon name="upload-cloud"></Icon>
                                        <span>Upload File</span>
                                        </DropdownItem>
                                    </li>
                                    <li>
                                        <DropdownItem
                                        tag="a"
                                        href="#upload-zip"
                                        onClick={(ev) => {
                                            ev.preventDefault();
                                            setZipModal(true);
                                        }}
                                        >
                                        <Icon name="file-zip"></Icon>
                                        <span>Import ZIP</span>
                                        </DropdownItem>
                                    </li>
                                    <li>
                                        <DropdownItem
                                        tag="a"
                                        href="#upload-folder"
                                        onClick={(ev) => {
                                            ev.preventDefault();
                                            const input = document.createElement("input");
                                            input.type = "file";
                                            input.webkitdirectory = true;
                                            input.multiple = true;
                                            input.onchange = () => {
                                                const fileList = Array.from(input.files || []);
                                                if (!fileList.length) return;
                                                setDroppedEntries([{ _fileList: fileList, _isVirtual: true }]);
                                                setFolderModal(true);
                                            };
                                            input.click();
                                        }}
                                        >
                                        <Icon name="folder-plus"></Icon>
                                        <span>Upload Folder</span>
                                        </DropdownItem>
                                    </li>
                                    <li>
                                        <DropdownItem
                                        tag="a"
                                        href="#upload"
                                        onClick={(ev) => {
                                            ev.preventDefault();
                                            toggleCreateModal();
                                        }}
                                        >
                                        <Icon name="folder-plus"></Icon>
                                        <span>Create Folder</span>
                                        </DropdownItem>
                                    </li>
                                    </ul>
                                </DropdownMenu>
                                </UncontrolledDropdown>
                            </li>
                            <li className="d-lg-none me-n1">
                                <a
                                href="#folder"
                                onClick={(ev) => {
                                    ev.preventDefault();
                                    fileManagerUpdate.asideVisibility();
                                }}
                                className="btn btn-trigger btn-icon toggle"
                                >
                                    <Icon name="menu-alt-r"></Icon>
                                </a>
                            </li>
                        </ul>
                    </BlockHeadContent>
                    {searchBar && <div className={`search-wrap px-2 d-lg-none ${search ? "active" : ""}`}>
                        <div className="search-content">
                        <a
                            href="#toggle"
                            onClick={(ev) => {
                            ev.preventDefault();
                            toggleSearch();
                            }}
                            className="search-back btn btn-icon toggle-search"
                        >
                            <Icon name="arrow-left"></Icon>
                        </a>
                        <input
                            type="text"
                            className="form-control border-transparent form-focus-none"
                            placeholder="Search files, folders"
                            value={fileManager.search}
                            onChange={(ev) => fileManagerUpdate.search(ev.target.value)}
                        />
                        <button className="search-submit btn btn-icon">
                            <Icon name="search"></Icon>
                        </button>
                        </div>
                    </div>}

                    {(viewFilter || fileManager.search !== '') && <BlockHeadContent className="d-none d-lg-block"><ViewFilter/></BlockHeadContent>}
                    {recoveryFilter && <BlockHeadContent className="d-none d-lg-flex d-xl-none">
                        <a
                        href="#folder"
                        onClick={(ev) => {
                            ev.preventDefault();
                            fileManagerUpdate.recoveryFilter();
                        }}
                        className="btn btn-trigger btn-icon toggle-expand"
                        >
                            <Icon name="opt"></Icon>
                        </a>  
                    </BlockHeadContent>}
                </BlockBetween>
            </BlockHead>
            {fileManager.search === '' ? props.children : <Files files={searchResult} />}
        </div>
        <Modal isOpen={createModal} size="md" toggle={toggleCreateModal}>
            <CreateFolder toggle={toggleCreateModal} />
        </Modal>
        <Modal isOpen={uploadModal} size="md" toggle={toggleUploadModal}>
            <Upload toggle={toggleUploadModal} />
        </Modal>
        <Modal isOpen={zipModal} size="md" toggle={() => setZipModal(false)}>
            <UploadZip toggle={() => setZipModal(false)} />
        </Modal>
        <Modal isOpen={docModal} size="xl" toggle={() => setDocModal(false)}>
            <CreateDocument toggle={() => setDocModal(false)} />
        </Modal>
        <Modal isOpen={folderModal} size="md" toggle={() => setFolderModal(false)}>
            <UploadFolder
                entries={droppedEntries}
                toggle={() => setFolderModal(false)}
            />
        </Modal>
    </>
  )
}

export default FilesBody