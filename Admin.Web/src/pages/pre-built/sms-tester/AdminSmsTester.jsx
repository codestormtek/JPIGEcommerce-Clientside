import React, { useState } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import { Card, CardBody, Alert, Spinner } from "reactstrap";
import { apiPost } from "@/utils/apiClient";

const DEFAULT_MESSAGE = "Hi! This is a test message from The Jiggling Pig 🐷. Your SMS notifications are working great!";
const FROM_NUMBER = "(800) 513-1710";

const fmtPhone = (raw) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const toE164 = (raw) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
};

const AdminSmsTester = () => {
  const [toPhone, setToPhone]       = useState("");
  const [message, setMessage]       = useState(DEFAULT_MESSAGE);
  const [sending, setSending]       = useState(false);
  const [result, setResult]         = useState(null);
  const [history, setHistory]       = useState([]);

  const handlePhoneChange = (e) => {
    setToPhone(fmtPhone(e.target.value));
  };

  const handleSend = async () => {
    const digits = toPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      setResult({ success: false, error: "Please enter a valid 10-digit US phone number." });
      return;
    }
    if (!message.trim()) {
      setResult({ success: false, error: "Message cannot be empty." });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const data = await apiPost("/live-sessions/sms/test", {
        to: toE164(toPhone),
        body: message.trim(),
      });

      const success = data?.data?.success ?? false;
      const messageId = data?.data?.messageId ?? null;
      const error = data?.data?.error ?? null;

      const entry = {
        id: Date.now(),
        to: toPhone,
        body: message.trim(),
        success,
        messageId,
        error,
        sentAt: new Date(),
      };

      setResult({ success, messageId, error });
      setHistory((prev) => [entry, ...prev].slice(0, 10));
    } catch (err) {
      const errorMsg = err?.message ?? "Failed to send — check API connection.";
      setResult({ success: false, error: errorMsg });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setToPhone("");
    setMessage(DEFAULT_MESSAGE);
    setResult(null);
  };

  return (
    <React.Fragment>
      <Head title="SMS Tester" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>SMS Tester</BlockTitle>
              <BlockDes className="text-soft">
                Send a test text message from your Telnyx number to verify the SMS integration is working.
              </BlockDes>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <Row className="g-gs">
            <Col lg="7">
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="overline-title text-primary mb-3">Send a Test Message</h6>

                  {/* From number — read-only */}
                  <div className="form-group mb-3">
                    <label className="form-label">From Number</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <Icon name="call" />
                      </span>
                      <input
                        type="text"
                        className="form-control bg-lighter"
                        value={FROM_NUMBER}
                        readOnly
                        style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
                      />
                    </div>
                    <div className="form-note mt-1">Your ported Telnyx number — all outbound messages send from here.</div>
                  </div>

                  {/* To number */}
                  <div className="form-group mb-3">
                    <label className="form-label">
                      To Number <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <Icon name="mobile" />
                      </span>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="(555) 555-5555"
                        value={toPhone}
                        onChange={handlePhoneChange}
                        maxLength={14}
                      />
                    </div>
                    <div className="form-note mt-1">Enter any US phone number to receive the test message.</div>
                  </div>

                  {/* Message body */}
                  <div className="form-group mb-4">
                    <label className="form-label">
                      Message <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={320}
                      placeholder="Type your test message here..."
                    />
                    <div className="form-note mt-1 d-flex justify-content-between">
                      <span>Standard SMS segments apply (160 chars/segment).</span>
                      <span className={message.length > 280 ? "text-danger" : "text-soft"}>
                        {message.length}/320
                      </span>
                    </div>
                  </div>

                  {/* Result alert */}
                  {result && (
                    <Alert color={result.success ? "success" : "danger"} className="mb-3">
                      <div className="d-flex align-items-start gap-2">
                        <Icon name={result.success ? "check-circle" : "cross-circle"} className="fs-4 mt-1 flex-shrink-0" />
                        <div>
                          {result.success ? (
                            <>
                              <strong>Message sent successfully!</strong>
                              {result.messageId && (
                                <div className="text-muted small mt-1">
                                  Telnyx Message ID: <code>{result.messageId}</code>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <strong>Failed to send message.</strong>
                              <div className="mt-1">{result.error}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    <Button
                      color="primary"
                      onClick={handleSend}
                      disabled={sending || !toPhone || !message.trim()}
                    >
                      {sending ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Icon name="send" className="me-2" />
                          Send Test SMS
                        </>
                      )}
                    </Button>
                    <Button color="light" outline onClick={handleReset} disabled={sending}>
                      Reset
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>

            <Col lg="5">
              {/* Info card */}
              <Card className="card-bordered mb-3">
                <CardBody>
                  <h6 className="overline-title text-primary mb-3">Integration Details</h6>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span className="text-soft">Provider</span>
                      <span className="fw-medium">Telnyx</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span className="text-soft">Number Type</span>
                      <span className="fw-medium">Ported</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span className="text-soft">Number</span>
                      <span className="fw-medium font-monospace">{FROM_NUMBER}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span className="text-soft">API Status</span>
                      <span className="badge bg-success text-white">Configured</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-2">
                      <span className="text-soft">Supported Region</span>
                      <span className="fw-medium">US & Canada</span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Where SMS is used */}
              <Card className="card-bordered">
                <CardBody>
                  <h6 className="overline-title text-primary mb-3">Where SMS Is Used</h6>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item px-0 py-2 d-flex align-items-center gap-2">
                      <Icon name="truck" className="text-primary" />
                      <div>
                        <div className="fw-medium">Order Shipped Notifications</div>
                        <div className="text-soft small">Customer gets a tracking SMS when their order ships.</div>
                      </div>
                    </li>
                    <li className="list-group-item px-0 py-2 d-flex align-items-center gap-2">
                      <Icon name="map-pin" className="text-warning" />
                      <div>
                        <div className="fw-medium">Live Session Alerts</div>
                        <div className="text-soft small">Broadcast location & status updates to SMS subscribers.</div>
                      </div>
                    </li>
                    <li className="list-group-item px-0 py-2 d-flex align-items-center gap-2">
                      <Icon name="bell" className="text-info" />
                      <div>
                        <div className="fw-medium">Subscriber Campaigns</div>
                        <div className="text-soft small">Send promotional or schedule messages from the Live Sessions page.</div>
                      </div>
                    </li>
                  </ul>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Send history */}
          {history.length > 0 && (
            <Row className="g-gs mt-1">
              <Col lg="12">
                <Card className="card-bordered">
                  <CardBody>
                    <h6 className="overline-title text-primary mb-3">Send History (this session)</h6>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>To</th>
                            <th>Message</th>
                            <th>Status</th>
                            <th>Message ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h) => (
                            <tr key={h.id}>
                              <td className="text-nowrap text-soft small">
                                {h.sentAt.toLocaleTimeString()}
                              </td>
                              <td className="font-monospace">{h.to}</td>
                              <td className="text-soft small" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {h.body}
                              </td>
                              <td>
                                {h.success ? (
                                  <span className="badge bg-success text-white">Sent</span>
                                ) : (
                                  <span className="badge bg-danger text-white" title={h.error}>Failed</span>
                                )}
                              </td>
                              <td className="font-monospace small text-soft">
                                {h.messageId ? h.messageId.slice(0, 16) + "…" : h.error ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}
        </Block>
      </Content>
    </React.Fragment>
  );
};

export default AdminSmsTester;
