import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, BlockDes,
  Icon, Button,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";
import { toast } from "react-toastify";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "never";

const KioskDeviceManager = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState(null); // { name, token }

  // Pairing
  const [pairModal, setPairModal] = useState(false);
  const [pairDevice, setPairDevice] = useState(null);
  const [pairInfo, setPairInfo] = useState(null); // { deviceCodeId, code }
  const [pairError, setPairError] = useState(null);
  const [pairStarting, setPairStarting] = useState(false);
  const pairPollRef = useRef(null);

  const [busyId, setBusyId] = useState(null);

  const loadDevices = useCallback(async () => {
    try {
      const res = await apiGet("/kiosk/devices");
      setDevices(res.data ?? []);
    } catch (e) {
      toast.error(e.message ?? "Failed to load kiosk devices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    const t = setInterval(loadDevices, 30000);
    return () => clearInterval(t);
  }, [loadDevices]);

  // Stop pairing poll on unmount / modal close
  useEffect(() => {
    return () => clearInterval(pairPollRef.current);
  }, []);

  const doCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiPost("/kiosk/devices", { name: newName.trim() });
      setNewToken(res.data);
      setNewName("");
      loadDevices();
    } catch (e) {
      toast.error(e.message ?? "Failed to create device");
    } finally {
      setCreating(false);
    }
  };

  const doToggleActive = async (d) => {
    setBusyId(d.id);
    try {
      await apiPatch(`/kiosk/devices/${d.id}`, { isActive: !d.isActive });
      loadDevices();
    } catch (e) {
      toast.error(e.message ?? "Failed to update device");
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async (d) => {
    if (!window.confirm(`Remove kiosk "${d.name}"? Its token stops working immediately.`)) return;
    setBusyId(d.id);
    try {
      const res = await apiDelete(`/kiosk/devices/${d.id}`);
      toast.success(res.data?.deleted ? "Device deleted" : "Device revoked (kept for order history)");
      loadDevices();
    } catch (e) {
      toast.error(e.message ?? "Failed to remove device");
    } finally {
      setBusyId(null);
    }
  };

  const doUnlinkTerminal = async (d) => {
    if (!window.confirm(`Unlink the Square Terminal from "${d.name}"?`)) return;
    setBusyId(d.id);
    try {
      await apiPatch(`/kiosk/devices/${d.id}`, { squareTerminalDeviceId: null });
      toast.success("Card reader unlinked");
      loadDevices();
    } catch (e) {
      toast.error(e.message ?? "Failed to unlink");
    } finally {
      setBusyId(null);
    }
  };

  const pairSessionRef = useRef(0);

  const openPairModal = async (d) => {
    if (pairStarting) return;
    clearInterval(pairPollRef.current);
    const session = ++pairSessionRef.current;
    setPairDevice(d);
    setPairInfo(null);
    setPairError(null);
    setPairModal(true);
    setPairStarting(true);
    try {
      const res = await apiPost(`/kiosk/devices/${d.id}/pair-terminal`);
      // Modal was closed (or re-opened) while the request was in flight — discard
      if (pairSessionRef.current !== session) return;
      setPairInfo(res.data);
      // Poll pairing status every 3s
      pairPollRef.current = setInterval(async () => {
        try {
          const st = await apiGet(`/kiosk/devices/${d.id}/pair-terminal/${res.data.deviceCodeId}`);
          if (pairSessionRef.current !== session) return;
          if (st.data?.paired) {
            toast.success("Square Terminal paired!");
            closePairModal();
            loadDevices();
          }
        } catch {
          /* keep polling */
        }
      }, 3000);
    } catch (e) {
      if (pairSessionRef.current === session) {
        setPairError(e.message ?? "Could not start pairing — check your Square credentials.");
      }
    } finally {
      if (pairSessionRef.current === session) setPairStarting(false);
    }
  };

  const closePairModal = () => {
    pairSessionRef.current++; // invalidate any in-flight pairing requests
    clearInterval(pairPollRef.current);
    setPairModal(false);
    setPairDevice(null);
    setPairInfo(null);
    setPairError(null);
    setPairStarting(false);
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Copy failed — select and copy manually"),
    );
  };

  // Storefront origin: configurable for prod (Admin and the storefront live on
  // different domains); falls back to the local Next.js dev port.
  const storefrontOrigin =
    import.meta.env.VITE_STOREFRONT_URL?.replace(/\/$/, "") ||
    `${window.location.protocol}//${window.location.hostname}:3000`;
  const kioskBaseUrl = `${storefrontOrigin}/kiosk`;

  return (
    <>
      <Head title="Kiosk Devices" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Kiosk Devices</BlockTitle>
              <BlockDes className="text-soft">
                Register iPads running the self-order kiosk and pair each one with a Square Terminal card reader.
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={() => { setNewToken(null); setCreateModal(true); }}>
                <Icon name="plus" />
                <span>Add Kiosk</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {loading ? (
            <div className="text-center py-5"><Spinner color="primary" /></div>
          ) : (
            <DataTable className="card-stretch">
              <DataTableBody>
                <DataTableHead className="nk-tb-item nk-tb-head">
                  <DataTableRow><span className="sub-text">Name</span></DataTableRow>
                  <DataTableRow><span className="sub-text">Status</span></DataTableRow>
                  <DataTableRow><span className="sub-text">Last seen</span></DataTableRow>
                  <DataTableRow><span className="sub-text">Card reader</span></DataTableRow>
                  <DataTableRow className="nk-tb-col-tools text-end"><span className="sub-text">Actions</span></DataTableRow>
                </DataTableHead>
                {devices.length === 0 && (
                  <DataTableItem>
                    <DataTableRow><span className="text-soft">No kiosks yet — add one to get a setup token.</span></DataTableRow>
                  </DataTableItem>
                )}
                {devices.map((d) => (
                  <DataTableItem key={d.id}>
                    <DataTableRow>
                      <span className="fw-medium">{d.name}</span>
                    </DataTableRow>
                    <DataTableRow>
                      {!d.isActive ? (
                        <Badge color="secondary" className="badge-dim">Revoked</Badge>
                      ) : d.online ? (
                        <Badge color="success" className="badge-dim">Online</Badge>
                      ) : (
                        <Badge color="light" className="badge-dim">Offline</Badge>
                      )}
                    </DataTableRow>
                    <DataTableRow>
                      <span className="text-soft">{fmtDate(d.lastSeenAt)}</span>
                    </DataTableRow>
                    <DataTableRow>
                      {d.squareTerminalDeviceId ? (
                        <Badge color="info" className="badge-dim">
                          <Icon name="link" /> Paired
                        </Badge>
                      ) : (
                        <span className="text-soft">Not paired</span>
                      )}
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools text-end">
                      <div className="d-inline-flex" style={{ gap: 6 }}>
                        {d.isActive && !d.squareTerminalDeviceId && (
                          <Button size="sm" color="info" outline disabled={busyId === d.id} onClick={() => openPairModal(d)}>
                            Pair reader
                          </Button>
                        )}
                        {d.isActive && d.squareTerminalDeviceId && (
                          <Button size="sm" color="light" outline disabled={busyId === d.id} onClick={() => doUnlinkTerminal(d)}>
                            Unlink reader
                          </Button>
                        )}
                        <Button size="sm" color="light" outline disabled={busyId === d.id} onClick={() => doToggleActive(d)}>
                          {d.isActive ? "Revoke" : "Re-activate"}
                        </Button>
                        <Button size="sm" color="danger" outline disabled={busyId === d.id} onClick={() => doDelete(d)}>
                          <Icon name="trash" />
                        </Button>
                      </div>
                    </DataTableRow>
                  </DataTableItem>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </Block>
      </Content>

      {/* Create device modal */}
      <Modal isOpen={createModal} toggle={() => setCreateModal(false)}>
        <ModalHeader toggle={() => setCreateModal(false)}>
          {newToken ? "Kiosk created" : "Add kiosk device"}
        </ModalHeader>
        <ModalBody>
          {newToken ? (
            <>
              <p>
                <strong>{newToken.name}</strong> is ready. This setup token is shown <strong>only once</strong> — open
                the link below on the iPad, or paste the token into the kiosk setup screen.
              </p>
              <div className="form-group">
                <label className="form-label">Setup token</label>
                <div className="form-control-wrap d-flex" style={{ gap: 6 }}>
                  <input className="form-control" readOnly value={newToken.token} onFocus={(e) => e.target.select()} />
                  <Button color="light" onClick={() => copyText(newToken.token, "Token")}><Icon name="copy" /></Button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">One-tap setup link (open on the iPad)</label>
                <div className="form-control-wrap d-flex" style={{ gap: 6 }}>
                  <input className="form-control" readOnly value={`${kioskBaseUrl}?token=${newToken.token}`} onFocus={(e) => e.target.select()} />
                  <Button color="light" onClick={() => copyText(`${kioskBaseUrl}?token=${newToken.token}`, "Link")}><Icon name="copy" /></Button>
                </div>
              </div>
              <div className="text-end">
                <Button color="primary" onClick={() => setCreateModal(false)}>Done</Button>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Device name</label>
                <input
                  className="form-control"
                  placeholder="e.g. Front Counter iPad"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doCreate()}
                />
              </div>
              <div className="text-end">
                <Button color="primary" disabled={creating || !newName.trim()} onClick={doCreate}>
                  {creating ? <Spinner size="sm" /> : "Create"}
                </Button>
              </div>
            </>
          )}
        </ModalBody>
      </Modal>

      {/* Pair terminal modal */}
      <Modal isOpen={pairModal} toggle={closePairModal}>
        <ModalHeader toggle={closePairModal}>Pair Square Terminal — {pairDevice?.name}</ModalHeader>
        <ModalBody>
          {pairStarting && (
            <div className="text-center py-3"><Spinner color="primary" /> <span className="ms-2">Generating device code…</span></div>
          )}
          {pairError && <div className="alert alert-danger">{pairError}</div>}
          {pairInfo && (
            <>
              <p>On the Square Terminal, go to <strong>Sign in → Use a device code</strong> and enter:</p>
              <div className="text-center my-3">
                <span
                  style={{ fontSize: "2.2rem", letterSpacing: "0.35rem", fontWeight: 700, fontFamily: "monospace" }}
                >
                  {pairInfo.code}
                </span>
              </div>
              <div className="d-flex align-items-center justify-content-center text-soft" style={{ gap: 8 }}>
                <Spinner size="sm" /> Waiting for the Terminal to pair…
              </div>
            </>
          )}
        </ModalBody>
      </Modal>
    </>
  );
};

export default KioskDeviceManager;
