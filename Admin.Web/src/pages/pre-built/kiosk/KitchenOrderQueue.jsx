import React, { useState, useEffect, useCallback, useRef } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, BlockDes,
  Icon, Row, Col, Button,
} from "@/components/Component";
import { apiGet, apiPatch } from "@/utils/apiClient";
import { toast } from "react-toastify";

const POLL_MS = 5000;

const fmtPrice = (p) => `$${Number(p ?? 0).toFixed(2)}`;

const minutesAgo = (d) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
};

const isPaid = (order) =>
  (order.payments ?? []).some((p) => ["captured", "paid"].includes((p.status ?? "").toLowerCase()));

const statusName = (order) => (order.orderStatus?.status ?? "").toLowerCase();

const KitchenOrderQueue = () => {
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null); // orderId being updated
  const knownIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);

  const loadStatuses = useCallback(async () => {
    try {
      const res = await apiGet("/orders/statuses");
      setStatuses(res.data ?? res ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await apiGet("/orders/admin?orderType=kiosk&limit=100&orderBy=orderDate&order=desc");
      const list = res.data?.data ?? res.data ?? [];
      // New-order chime cue via toast (skip on first load)
      if (!firstLoadRef.current) {
        const fresh = list.filter(
          (o) => !knownIdsRef.current.has(o.id) && isPaid(o) && !["cancelled", "canceled"].includes(statusName(o)),
        );
        fresh.forEach((o) =>
          toast.info(`New kiosk order ${o.kioskOrderNumber ?? ""} — ${o.addresses?.[0]?.fullName ?? "Walk-up"}`),
        );
      }
      knownIdsRef.current = new Set(list.map((o) => o.id));
      firstLoadRef.current = false;
      setOrders(list);
      setError(null);
    } catch (e) {
      setError(e.message ?? "Failed to load kiosk orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses();
    loadOrders();
    const t = setInterval(loadOrders, POLL_MS);
    return () => clearInterval(t);
  }, [loadOrders, loadStatuses]);

  const findStatusId = (...names) => {
    for (const n of names) {
      const s = statuses.find((x) => (x.status ?? "").toLowerCase() === n);
      if (s) return s.id;
    }
    return null;
  };

  const setOrderStatus = async (order, statusId, label) => {
    if (!statusId) {
      toast.error(`No "${label}" status configured`);
      return;
    }
    setUpdating(order.id);
    try {
      await apiPatch(`/orders/admin/${order.id}/status`, { statusId });
      await loadOrders();
    } catch (e) {
      toast.error(e.message ?? "Failed to update order");
    } finally {
      setUpdating(null);
    }
  };

  // Board buckets — only paid orders enter the kitchen flow.
  // Kiosk lifecycle: pending → processing → ready_to_ship ("Ready") → delivered ("Picked up")
  const active = orders.filter((o) => isPaid(o) && ["pending", "confirmed", "processing"].includes(statusName(o)));
  const ready = orders.filter((o) => isPaid(o) && ["ready_to_ship", "ready", "ready for pickup"].includes(statusName(o)));
  const done = orders
    .filter((o) => isPaid(o) && ["delivered", "complete", "completed"].includes(statusName(o)))
    .slice(0, 8);
  const awaitingPayment = orders.filter(
    (o) => !isPaid(o) && !["cancelled", "canceled"].includes(statusName(o)),
  );

  const readyStatusId = findStatusId("ready_to_ship", "ready", "ready for pickup");
  const hasReadyStatus = Boolean(readyStatusId);

  const OrderCard = ({ order, actions }) => (
    <div className="card card-bordered mb-3">
      <div className="card-inner py-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-0">
              {order.kioskOrderNumber ?? `#${order.id.slice(-6).toUpperCase()}`}{" "}
              <small className="text-soft fw-normal">{minutesAgo(order.orderDate)}</small>
            </h5>
            <div className="text-soft">
              {order.addresses?.[0]?.fullName ?? "Walk-up"}
              {order.addresses?.[0]?.phone ? ` · ${order.addresses[0].phone}` : ""}
            </div>
          </div>
          <Badge color={statusName(order) === "processing" ? "info" : "warning"} className="badge-dim">
            {order.orderStatus?.status ?? "—"}
          </Badge>
        </div>
        <ul className="my-2" style={{ paddingLeft: 0, listStyle: "none" }}>
          {(order.lines ?? []).map((l) => (
            <li key={l.id} className="py-1 border-bottom">
              <strong>{l.qty}×</strong> {l.productItem?.product?.name ?? l.productItem?.sku ?? "Item"}
            </li>
          ))}
        </ul>
        {order.specialInstructions && (
          <div className="alert alert-warning py-1 px-2 mb-2" style={{ fontSize: "0.85rem" }}>
            <Icon name="info" /> {order.specialInstructions}
          </div>
        )}
        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">{fmtPrice(order.grandTotal)}</span>
          <div className="d-flex" style={{ gap: 8 }}>
            {actions}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head title="Kitchen Queue" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Kitchen Queue</BlockTitle>
              <BlockDes className="text-soft">
                Live kiosk orders — refreshes every {POLL_MS / 1000}s.
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="light" outline className="btn-white" onClick={loadOrders}>
                <Icon name="reload" />
                <span>Refresh</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {loading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <Row className="g-gs">
              <Col lg={hasReadyStatus ? 4 : 6}>
                <h6 className="overline-title mb-2">
                  In the kitchen <Badge color="warning" pill>{active.length}</Badge>
                </h6>
                {active.length === 0 && <p className="text-soft">No active orders.</p>}
                {active.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    actions={
                      <>
                        {["pending", "confirmed"].includes(statusName(o)) && (
                          <Button
                            size="sm"
                            color="info"
                            disabled={updating === o.id}
                            onClick={() => setOrderStatus(o, findStatusId("processing"), "processing")}
                          >
                            Start
                          </Button>
                        )}
                        <Button
                          size="sm"
                          color="success"
                          disabled={updating === o.id}
                          onClick={() =>
                            setOrderStatus(
                              o,
                              hasReadyStatus ? readyStatusId : findStatusId("delivered", "complete", "completed"),
                              hasReadyStatus ? "ready" : "done",
                            )
                          }
                        >
                          {hasReadyStatus ? "Ready" : "Done"}
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          outline
                          disabled={updating === o.id}
                          onClick={() => {
                            if (window.confirm(`Cancel order ${o.kioskOrderNumber ?? ""}?`)) {
                              setOrderStatus(o, findStatusId("cancelled", "canceled"), "cancelled");
                            }
                          }}
                        >
                          <Icon name="cross" />
                        </Button>
                      </>
                    }
                  />
                ))}
              </Col>

              {hasReadyStatus && (
                <Col lg="4">
                  <h6 className="overline-title mb-2">
                    Ready for pickup <Badge color="success" pill>{ready.length}</Badge>
                  </h6>
                  {ready.length === 0 && <p className="text-soft">Nothing waiting.</p>}
                  {ready.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      actions={
                        <Button
                          size="sm"
                          color="success"
                          disabled={updating === o.id}
                          onClick={() => setOrderStatus(o, findStatusId("delivered", "complete", "completed"), "picked up")}
                        >
                          Picked up
                        </Button>
                      }
                    />
                  ))}
                </Col>
              )}

              <Col lg={hasReadyStatus ? 4 : 6}>
                <h6 className="overline-title mb-2">Recently completed</h6>
                {done.length === 0 && <p className="text-soft">None yet today.</p>}
                {done.map((o) => (
                  <div key={o.id} className="card card-bordered mb-2">
                    <div className="card-inner py-2 d-flex justify-content-between align-items-center">
                      <span>
                        <strong>{o.kioskOrderNumber ?? `#${o.id.slice(-6).toUpperCase()}`}</strong>{" "}
                        <span className="text-soft">{o.addresses?.[0]?.fullName ?? "Walk-up"}</span>
                      </span>
                      <span className="text-soft">{fmtPrice(o.grandTotal)}</span>
                    </div>
                  </div>
                ))}

                {awaitingPayment.length > 0 && (
                  <>
                    <h6 className="overline-title mt-4 mb-2">
                      Awaiting payment <Badge color="light" pill>{awaitingPayment.length}</Badge>
                    </h6>
                    {awaitingPayment.map((o) => (
                      <div key={o.id} className="card card-bordered mb-2" style={{ opacity: 0.6 }}>
                        <div className="card-inner py-2 d-flex justify-content-between align-items-center">
                          <span>
                            <strong>{o.kioskOrderNumber ?? `#${o.id.slice(-6).toUpperCase()}`}</strong>{" "}
                            <span className="text-soft">at the card reader…</span>
                          </span>
                          <span className="text-soft">{fmtPrice(o.grandTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </Col>
            </Row>
          )}
        </Block>
      </Content>
    </>
  );
};

export default KitchenOrderQueue;
