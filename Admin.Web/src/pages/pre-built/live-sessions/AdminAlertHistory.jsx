import React, { useState, useEffect, useCallback } from "react";
import { Spinner, Alert, Badge, Input, Collapse } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet } from "@/utils/apiClient";

const STATUS_COLORS = {
  sent: "success",
  delivered: "success",
  queued: "warning",
  failed: "danger",
};

const formatDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const AdminAlertHistory = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSessionId, setFilterSessionId] = useState("");

  const [sessions, setSessions] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});

  const loadSessions = useCallback(async () => {
    try {
      const res = await apiGet("/live-sessions?limit=100&orderBy=createdAt&order=desc");
      setSessions(res?.data ?? []);
    } catch {}
  }, []);

  const loadHistory = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "20");
      if (filterSessionId) params.set("sessionId", filterSessionId);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const res = await apiGet(`/live-sessions/alerts/history?${params.toString()}`);
      setCampaigns(res?.data ?? []);
      setTotal(res?.meta?.total ?? res?.total ?? 0);
      setPage(res?.meta?.page ?? res?.page ?? p);
      setTotalPages(res?.meta?.totalPages ?? res?.totalPages ?? 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterSessionId, filterDateFrom, filterDateTo]);

  useEffect(() => {
    loadSessions();
    loadHistory(1);
  }, [loadSessions, loadHistory]);

  const applyFilters = () => {
    loadHistory(1);
  };

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterSessionId("");
    setTimeout(() => loadHistory(1), 0);
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <Head title="Alert History" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>SMS Alert History</BlockTitle>
              <BlockDes className="text-soft">
                <p>Full audit trail of all SMS alerts sent to subscribers.</p>
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <Alert color="danger" className="mb-3" toggle={() => setError(null)}>{error}</Alert>}

        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <Row className="g-3 mb-3">
                <Col md="3">
                  <Input type="select" value={filterSessionId} onChange={(e) => setFilterSessionId(e.target.value)}>
                    <option value="">All Sessions</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </Input>
                </Col>
                <Col md="2">
                  <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} placeholder="From date" />
                </Col>
                <Col md="2">
                  <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} placeholder="To date" />
                </Col>
                <Col md="3">
                  <div className="d-flex gap-2">
                    <Button color="primary" size="sm" onClick={applyFilters}>
                      <Icon name="search" /> Filter
                    </Button>
                    <Button color="light" size="sm" onClick={clearFilters}>
                      Clear
                    </Button>
                  </div>
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-4"><Spinner /></div>
              ) : campaigns.length === 0 ? (
                <div className="text-center text-soft py-4">No alert campaigns found.</div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}></th>
                          <th>Date / Time</th>
                          <th>Session</th>
                          <th>Location</th>
                          <th>Message</th>
                          <th>Recipients</th>
                          <th>Sent</th>
                          <th>Failed</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => {
                          const isExpanded = !!expandedRows[c.id];
                          const sentCount = c.totalSent ?? (c.messages || []).filter((m) => m.sendStatus === "sent" || m.sendStatus === "delivered").length;
                          const failedCount = c.totalFailed ?? (c.messages || []).filter((m) => m.sendStatus === "failed").length;
                          const recipientCount = c.totalRecipients ?? (c.messages || []).length;
                          const allSent = failedCount === 0 && recipientCount > 0;
                          const campaignStatus = recipientCount === 0 ? "empty" : failedCount > 0 ? "partial" : "complete";
                          return (
                            <React.Fragment key={c.id}>
                              <tr style={{ cursor: "pointer" }} onClick={() => toggleRow(c.id)}>
                                <td>
                                  <Icon name={isExpanded ? "chevron-down" : "chevron-right"} />
                                </td>
                                <td>{formatDateTime(c.sentAt || c.createdAt)}</td>
                                <td className="fw-bold">{c.liveSession?.title || "—"}</td>
                                <td>{c.liveSession?.locationName || c.liveSession?.address || "—"}</td>
                                <td>
                                  <span className="text-truncate d-inline-block" style={{ maxWidth: 200 }} title={c.messageBody}>
                                    {c.messageBody}
                                  </span>
                                </td>
                                <td>{recipientCount}</td>
                                <td>
                                  <span className="text-success fw-bold">{sentCount}</span>
                                </td>
                                <td>
                                  {failedCount > 0 ? (
                                    <span className="text-danger fw-bold">{failedCount}</span>
                                  ) : (
                                    <span className="text-soft">0</span>
                                  )}
                                </td>
                                <td>
                                  <Badge color={campaignStatus === "complete" ? "success" : campaignStatus === "partial" ? "warning" : "light"}>
                                    {campaignStatus === "complete" ? "Complete" : campaignStatus === "partial" ? "Partial" : "Empty"}
                                  </Badge>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={9} className="bg-lighter p-0">
                                    <Collapse isOpen={isExpanded}>
                                      <div className="p-3">
                                        <div className="mb-2 d-flex gap-3 flex-wrap">
                                          <small className="text-soft">
                                            <strong>Sent by:</strong>{" "}
                                            {c.createdByUser ? `${c.createdByUser.firstName || ""} ${c.createdByUser.lastName || ""}`.trim() || "—" : "—"}
                                          </small>
                                          <small className="text-soft">
                                            <strong>Audience:</strong> {c.audienceType || "all"}
                                          </small>
                                        </div>
                                        {(c.messages || []).length === 0 ? (
                                          <div className="text-soft text-center py-2">No individual message records.</div>
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
                                                {(c.messages || []).map((m) => (
                                                  <tr key={m.id}>
                                                    <td>{m.phoneNumber}</td>
                                                    <td>
                                                      <Badge color={STATUS_COLORS[m.sendStatus] || "light"} className="text-uppercase" style={{ fontSize: 10 }}>
                                                        {m.sendStatus}
                                                      </Badge>
                                                    </td>
                                                    <td>{formatDateTime(m.sentAt)}</td>
                                                    <td>{m.errorMessage || "—"}</td>
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
                      <span className="text-soft fs-12px">
                        Showing page {page} of {totalPages} ({total} campaigns)
                      </span>
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
      </Content>
    </>
  );
};

export default AdminAlertHistory;
