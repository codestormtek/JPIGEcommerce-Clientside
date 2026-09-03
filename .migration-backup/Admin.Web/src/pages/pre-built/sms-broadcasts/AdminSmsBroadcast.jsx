import React, { useState, useEffect, useCallback } from "react";
import {
  Spinner, Alert, Badge, Input, Collapse, Modal, ModalBody, ModalHeader, ModalFooter,
} from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost } from "@/utils/apiClient";

const STATUS_COLORS = { sent: "success", delivered: "success", queued: "warning", failed: "danger" };

const TOPIC_LABELS = {
  sales: "Sales & Promotions",
  truck_schedule: "Truck Schedule",
  menu_updates: "Menu Updates",
  news: "News",
};

const formatDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

// GSM-7 single segment = 160 chars; concatenated = 153/segment. Rough estimate for admins.
const segmentInfo = (text) => {
  const len = text.length;
  if (len === 0) return { len, segments: 0 };
  const segments = len <= 160 ? 1 : Math.ceil(len / 153);
  return { len, segments };
};

const broadcastStatusBadge = (status) => {
  if (status === "sent") return <Badge color="success">Sent</Badge>;
  if (status === "partial") return <Badge color="warning">Partial</Badge>;
  if (status === "failed") return <Badge color="danger">Failed</Badge>;
  return <Badge color="light">{status}</Badge>;
};

const AdminSmsBroadcast = () => {
  // ── Composer state ──────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [audienceType, setAudienceType] = useState("all");
  const [audienceTopic, setAudienceTopic] = useState("");
  const [topics, setTopics] = useState([]);
  const [recipientCount, setRecipientCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [composerError, setComposerError] = useState(null);
  const [composerSuccess, setComposerSuccess] = useState(null);

  // ── History state ───────────────────────────────────────────────
  const [broadcasts, setBroadcasts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [detailCache, setDetailCache] = useState({});

  const { len, segments } = segmentInfo(messageBody);

  const loadTopics = useCallback(async () => {
    try {
      const res = await apiGet("/admin/sms-broadcasts/topics");
      setTopics(res?.data ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("audienceType", audienceType);
      if (audienceType === "topic" && audienceTopic) params.set("audienceTopic", audienceTopic);
      const res = await apiGet(`/admin/sms-broadcasts/audience/preview?${params.toString()}`);
      setRecipientCount(res?.data?.recipientCount ?? 0);
    } catch {
      setRecipientCount(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [audienceType, audienceTopic]);

  const loadHistory = useCallback(async (p = 1) => {
    setLoading(true);
    setHistoryError(null);
    try {
      const res = await apiGet(`/admin/sms-broadcasts?page=${p}&limit=20`);
      setBroadcasts(res?.data ?? []);
      setTotal(res?.meta?.total ?? res?.total ?? 0);
      setPage(res?.meta?.page ?? res?.page ?? p);
      setTotalPages(res?.meta?.totalPages ?? res?.totalPages ?? 1);
    } catch (e) {
      setHistoryError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
    loadHistory(1);
  }, [loadTopics, loadHistory]);

  useEffect(() => {
    if (audienceType === "topic" && !audienceTopic) {
      setRecipientCount(null);
      return;
    }
    loadPreview();
  }, [audienceType, audienceTopic, loadPreview]);

  const canSend =
    messageBody.trim().length > 0 &&
    (audienceType !== "topic" || !!audienceTopic) &&
    (recipientCount ?? 0) > 0 &&
    !sending;

  const openConfirm = () => {
    setComposerError(null);
    setComposerSuccess(null);
    if (!messageBody.trim()) {
      setComposerError("Enter a message before sending.");
      return;
    }
    if (audienceType === "topic" && !audienceTopic) {
      setComposerError("Choose a topic for the topic audience.");
      return;
    }
    if (!recipientCount) {
      setComposerError("No subscribers match this audience.");
      return;
    }
    setConfirmOpen(true);
  };

  const doSend = async () => {
    setSending(true);
    setComposerError(null);
    try {
      const res = await apiPost("/admin/sms-broadcasts", {
        title: title.trim() || undefined,
        messageBody: messageBody.trim(),
        audienceType,
        audienceTopic: audienceType === "topic" ? audienceTopic : undefined,
      });
      const d = res?.data ?? {};
      setComposerSuccess(
        `Broadcast sent to ${d.totalSent ?? 0} of ${d.totalRecipients ?? 0} recipients` +
          (d.totalFailed ? `, ${d.totalFailed} failed.` : "."),
      );
      setTitle("");
      setMessageBody("");
      setConfirmOpen(false);
      loadHistory(1);
    } catch (e) {
      setComposerError(e.message);
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  };

  const toggleRow = async (id) => {
    const willOpen = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: willOpen }));
    if (willOpen && !detailCache[id]) {
      try {
        const res = await apiGet(`/admin/sms-broadcasts/${id}`);
        setDetailCache((prev) => ({ ...prev, [id]: res?.data ?? null }));
      } catch {
        setDetailCache((prev) => ({ ...prev, [id]: { recipients: [] } }));
      }
    }
  };

  return (
    <>
      <Head title="SMS Broadcast" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>SMS Broadcast</BlockTitle>
              <BlockDes className="text-soft">
                <p>Compose a text message and send it to your opted-in subscribers.</p>
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {/* ── Composer ───────────────────────────────────────────── */}
        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <h6 className="title mb-3">New Broadcast</h6>

              {composerError && (
                <Alert color="danger" className="mb-3" toggle={() => setComposerError(null)}>
                  {composerError}
                </Alert>
              )}
              {composerSuccess && (
                <Alert color="success" className="mb-3" toggle={() => setComposerSuccess(null)}>
                  {composerSuccess}
                </Alert>
              )}

              <Row className="g-3">
                <Col md="6">
                  <label className="form-label">Campaign Title <span className="text-soft">(optional, internal)</span></label>
                  <Input type="text" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekend Special" />
                </Col>
                <Col md="3">
                  <label className="form-label">Audience</label>
                  <Input type="select" value={audienceType} onChange={(e) => { setAudienceType(e.target.value); }}>
                    <option value="all">All SMS subscribers</option>
                    <option value="topic">By topic</option>
                  </Input>
                </Col>
                <Col md="3">
                  <label className="form-label">Topic</label>
                  <Input
                    type="select"
                    value={audienceTopic}
                    disabled={audienceType !== "topic"}
                    onChange={(e) => setAudienceTopic(e.target.value)}
                  >
                    <option value="">Select topic…</option>
                    {topics.map((t) => (
                      <option key={t.value} value={t.value}>{TOPIC_LABELS[t.value] || t.value}</option>
                    ))}
                  </Input>
                </Col>

                <Col md="12">
                  <label className="form-label">Message</label>
                  <Input
                    type="textarea"
                    rows="4"
                    value={messageBody}
                    maxLength={1600}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your text message…"
                  />
                  <div className="d-flex justify-content-between mt-1">
                    <small className="text-soft">
                      {len} characters · ~{segments} segment{segments === 1 ? "" : "s"}
                    </small>
                    <small className="text-soft">
                      {previewLoading ? (
                        <Spinner size="sm" />
                      ) : recipientCount === null ? (
                        audienceType === "topic" && !audienceTopic ? "Select a topic to see reach" : "—"
                      ) : (
                        <><strong>{recipientCount}</strong> recipient{recipientCount === 1 ? "" : "s"}</>
                      )}
                    </small>
                  </div>
                </Col>

                <Col md="12">
                  <div className="d-flex justify-content-end">
                    <Button color="primary" disabled={!canSend} onClick={openConfirm}>
                      {sending ? <Spinner size="sm" /> : <Icon name="send" />}
                      <span className="ms-1">Send Broadcast</span>
                    </Button>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Block>

        {/* ── History ────────────────────────────────────────────── */}
        <Block>
          <BlockHead size="sm">
            <BlockHeadContent>
              <BlockTitle tag="h5">Broadcast History</BlockTitle>
            </BlockHeadContent>
          </BlockHead>

          {historyError && (
            <Alert color="danger" className="mb-3" toggle={() => setHistoryError(null)}>{historyError}</Alert>
          )}

          <div className="card card-bordered">
            <div className="card-inner">
              {loading ? (
                <div className="text-center py-4"><Spinner /></div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center text-soft py-4">No broadcasts sent yet.</div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}></th>
                          <th>Date / Time</th>
                          <th>Title</th>
                          <th>Audience</th>
                          <th>Message</th>
                          <th>Recipients</th>
                          <th>Sent</th>
                          <th>Failed</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {broadcasts.map((b) => {
                          const isOpen = !!expanded[b.id];
                          const detail = detailCache[b.id];
                          const audienceLabel =
                            b.audienceType === "topic"
                              ? `Topic: ${TOPIC_LABELS[b.audienceTopic] || b.audienceTopic}`
                              : "All subscribers";
                          return (
                            <React.Fragment key={b.id}>
                              <tr style={{ cursor: "pointer" }} onClick={() => toggleRow(b.id)}>
                                <td><Icon name={isOpen ? "chevron-down" : "chevron-right"} /></td>
                                <td>{formatDateTime(b.sentAt || b.createdAt)}</td>
                                <td className="fw-bold">{b.title || "—"}</td>
                                <td>{audienceLabel}</td>
                                <td>
                                  <span className="text-truncate d-inline-block" style={{ maxWidth: 220 }} title={b.messageBody}>
                                    {b.messageBody}
                                  </span>
                                </td>
                                <td>{b.totalRecipients}</td>
                                <td><span className="text-success fw-bold">{b.totalSent}</span></td>
                                <td>
                                  {b.totalFailed > 0 ? (
                                    <span className="text-danger fw-bold">{b.totalFailed}</span>
                                  ) : (
                                    <span className="text-soft">0</span>
                                  )}
                                </td>
                                <td>{broadcastStatusBadge(b.status)}</td>
                              </tr>
                              {isOpen && (
                                <tr>
                                  <td colSpan={9} className="bg-lighter p-0">
                                    <Collapse isOpen={isOpen}>
                                      <div className="p-3">
                                        <div className="mb-2 d-flex gap-3 flex-wrap">
                                          <small className="text-soft">
                                            <strong>Sent by:</strong>{" "}
                                            {b.createdByUser
                                              ? `${b.createdByUser.firstName || ""} ${b.createdByUser.lastName || ""}`.trim() || "—"
                                              : "—"}
                                          </small>
                                          <small className="text-soft"><strong>Full message:</strong> {b.messageBody}</small>
                                        </div>
                                        {!detail ? (
                                          <div className="text-center py-2"><Spinner size="sm" /></div>
                                        ) : (detail.recipients || []).length === 0 ? (
                                          <div className="text-soft text-center py-2">No recipient records.</div>
                                        ) : (
                                          <div className="table-responsive">
                                            <table className="table table-sm table-bordered mb-0">
                                              <thead>
                                                <tr>
                                                  <th>Phone Number</th>
                                                  <th>Status</th>
                                                  <th>Sent At</th>
                                                  <th>Error</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {(detail.recipients || []).map((r) => (
                                                  <tr key={r.id}>
                                                    <td>{r.phoneNumber}</td>
                                                    <td>
                                                      <Badge color={STATUS_COLORS[r.sendStatus] || "light"} className="text-uppercase" style={{ fontSize: 10 }}>
                                                        {r.sendStatus}
                                                      </Badge>
                                                    </td>
                                                    <td>{formatDateTime(r.sentAt)}</td>
                                                    <td>{r.errorMessage || "—"}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </Collapse>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="text-soft fs-12px">Showing page {page} of {totalPages} ({total} broadcasts)</span>
                      <div className="d-flex gap-2">
                        <Button size="sm" color="light" disabled={page <= 1} onClick={() => loadHistory(page - 1)}>
                          <Icon name="chevron-left" /> Prev
                        </Button>
                        <Button size="sm" color="light" disabled={page >= totalPages} onClick={() => loadHistory(page + 1)}>
                          Next <Icon name="chevron-right" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Block>

        {/* ── Confirm modal ──────────────────────────────────────── */}
        <Modal isOpen={confirmOpen} toggle={() => !sending && setConfirmOpen(false)}>
          <ModalHeader toggle={() => !sending && setConfirmOpen(false)}>Confirm Broadcast</ModalHeader>
          <ModalBody>
            <p>
              You are about to text <strong>{recipientCount}</strong> subscriber{recipientCount === 1 ? "" : "s"}
              {audienceType === "topic" ? ` in "${TOPIC_LABELS[audienceTopic] || audienceTopic}"` : ""}.
            </p>
            <div className="bg-lighter p-2 rounded">
              <small className="text-soft">Message preview ({len} chars · ~{segments} segment{segments === 1 ? "" : "s"}):</small>
              <div className="mt-1">{messageBody}</div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="light" disabled={sending} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button color="primary" disabled={sending} onClick={doSend}>
              {sending ? <Spinner size="sm" /> : <Icon name="send" />}
              <span className="ms-1">Send Now</span>
            </Button>
          </ModalFooter>
        </Modal>
      </Content>
    </>
  );
};

export default AdminSmsBroadcast;
