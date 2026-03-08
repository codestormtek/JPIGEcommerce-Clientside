import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import {
  Card,
  Spinner,
  Badge,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Row,
  Col,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableItem,
} from "@/components/Component";
import { apiGet } from "@/utils/apiClient";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

const fmt = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const CHART_RANGE_MAP = { Day: 7, Week: 28, Month: 90 };

const STATUS_BADGE = {
  pending: "warning",
  processing: "info",
  confirmed: "primary",
  shipped: "primary",
  complete: "success",
  completed: "success",
  cancelled: "danger",
  refunded: "secondary",
};

const STAT_CARDS = [
  { key: "totalOrders", label: "Orders", icon: "ni-cart", bg: "#1ab394", link: "/orders" },
  { key: "pendingReturns", label: "Pending return requests", icon: "ni-undo", bg: "#f8ac59", link: null },
  { key: "registeredCustomers", label: "Registered customers", icon: "ni-users", bg: "#23c6c8", link: "/customers" },
  { key: "lowStockProducts", label: "Low stock products", icon: "ni-alert-circle", bg: "#ed5565", link: "/products" },
];

const HomePage = () => {
  const [commonStats, setCommonStats] = useState(null);
  const [orderTotals, setOrderTotals] = useState([]);
  const [incompleteOrders, setIncompleteOrders] = useState(null);
  const [ordersTs, setOrdersTs] = useState([]);
  const [customersTs, setCustomersTs] = useState([]);
  const [ordersRange, setOrdersRange] = useState("Day");
  const [custRange, setCustRange] = useState("Day");
  const [latestOrders, setLatestOrders] = useState([]);
  const [bestByQty, setBestByQty] = useState([]);
  const [bestByAmt, setBestByAmt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const now = encodeURIComponent(daysAgo(0));
    const from30 = encodeURIComponent(daysAgo(30));
    try {
      const [statsRes, totalsRes, incRes, latestRes, bestQtyRes, bestAmtRes] = await Promise.all([
        apiGet("/admin/metrics/common-stats"),
        apiGet("/admin/metrics/order-totals"),
        apiGet("/admin/metrics/incomplete-orders"),
        apiGet("/orders/admin?page=1&limit=5&orderBy=orderDate&order=desc"),
        apiGet(`/admin/metrics/top-products?from=${from30}&to=${now}&limit=5&sortBy=quantity`),
        apiGet(`/admin/metrics/top-products?from=${from30}&to=${now}&limit=5&sortBy=amount`),
      ]);
      setCommonStats(statsRes?.data ?? statsRes);
      setOrderTotals(totalsRes?.data ?? []);
      setIncompleteOrders(incRes?.data ?? incRes);
      setLatestOrders(latestRes?.data ?? []);
      setBestByQty(bestQtyRes?.data ?? []);
      setBestByAmt(bestAmtRes?.data ?? []);
    } catch (e) {
      setError("Failed to load dashboard. " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadChart = useCallback(async (metricKey, rangeName, setter) => {
    const days = CHART_RANGE_MAP[rangeName] || 7;
    const from = encodeURIComponent(daysAgo(days));
    const to = encodeURIComponent(daysAgo(0));
    try {
      const res = await apiGet(`/admin/metrics/timeseries?metricKey=${metricKey}&from=${from}&to=${to}`);
      setter(res?.data ?? []);
    } catch (_) {}
  }, []);

  useEffect(() => { loadChart("orders_count", ordersRange, setOrdersTs); }, [ordersRange, loadChart]);
  useEffect(() => { loadChart("new_customers", custRange, setCustomersTs); }, [custRange, loadChart]);

  function buildChartData(ts, label, color) {
    return {
      labels: ts.map((p) => p.date),
      datasets: [{
        label,
        data: ts.map((p) => p.value),
        borderColor: color,
        backgroundColor: color + "22",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      }],
    };
  }

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      y: { beginAtZero: true, grid: { color: "#f0f0f0" } },
    },
  };

  if (loading) {
    return (
      <React.Fragment>
        <Head title="Dashboard" />
        <Content>
          <div className="text-center py-5"><Spinner color="primary" /></div>
        </Content>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <Head title="Dashboard" />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page tag="h3">Dashboard</BlockTitle>
          </BlockHeadContent>
        </BlockHead>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <Block>
          <Row className="g-gs">
            {STAT_CARDS.map((card) => (
              <Col sm="6" xl="3" key={card.key}>
                <Card className="card-bordered" style={{ overflow: "hidden" }}>
                  <div className="card-inner text-center py-4">
                    <div
                      className="rounded-circle d-inline-flex align-items-center justify-content-center mb-2"
                      style={{ width: 80, height: 80, backgroundColor: card.bg }}
                    >
                      <em className={`icon ni ${card.icon}`} style={{ fontSize: 36, color: "#fff" }}></em>
                    </div>
                    <h2 className="mb-1" style={{ fontSize: 28, fontWeight: 700 }}>
                      {commonStats?.[card.key] ?? 0}
                    </h2>
                    <p className="text-soft mb-1">{card.label}</p>
                    {card.link && (
                      <Link to={card.link} className="link link-primary small">
                        More info <em className="icon ni ni-arrow-right"></em>
                      </Link>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Block>

        <Block>
          <Row className="g-gs">
            <Col lg="6">
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-3">
                    <div className="card-title"><h6 className="title">Orders</h6></div>
                    <div className="card-tools">
                      {Object.keys(CHART_RANGE_MAP).map((r) => (
                        <button
                          key={r}
                          className={`btn btn-sm ${ordersRange === r ? "btn-primary" : "btn-outline-light"} ms-1`}
                          onClick={() => setOrdersRange(r)}
                        >{r}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: 250 }}>
                    {ordersTs.length > 0
                      ? <Line data={buildChartData(ordersTs, "Orders", "#6576ff")} options={chartOpts} />
                      : <div className="text-center text-soft py-5">No data</div>}
                  </div>
                </div>
              </Card>
            </Col>
            <Col lg="6">
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-3">
                    <div className="card-title"><h6 className="title">New customers</h6></div>
                    <div className="card-tools">
                      {Object.keys(CHART_RANGE_MAP).map((r) => (
                        <button
                          key={r}
                          className={`btn btn-sm ${custRange === r ? "btn-primary" : "btn-outline-light"} ms-1`}
                          onClick={() => setCustRange(r)}
                        >{r}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: 250 }}>
                    {customersTs.length > 0
                      ? <Line data={buildChartData(customersTs, "New Customers", "#1ee0ac")} options={chartOpts} />
                      : <div className="text-center text-soft py-5">No data</div>}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Block>

        <Block>
          <Row className="g-gs">
            <Col lg="6">
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-2">
                    <div className="card-title"><h6 className="title">Order totals</h6></div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-bordered table-sm mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Order Status</th>
                          <th className="text-end">Today</th>
                          <th className="text-end">This Week</th>
                          <th className="text-end">This Month</th>
                          <th className="text-end">This Year</th>
                          <th className="text-end">All Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderTotals.length > 0 ? orderTotals.map((row) => (
                          <tr key={row.status}>
                            <td className="text-capitalize">{row.status}</td>
                            <td className="text-end">{fmt(row.today)}</td>
                            <td className="text-end">{fmt(row.thisWeek)}</td>
                            <td className="text-end">{fmt(row.thisMonth)}</td>
                            <td className="text-end">{fmt(row.thisYear)}</td>
                            <td className="text-end">{fmt(row.allTime)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="text-center text-soft py-3">No data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </Col>
            <Col lg="6">
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-2">
                    <div className="card-title"><h6 className="title">Incomplete orders</h6></div>
                  </div>
                  {incompleteOrders ? (
                    <div className="table-responsive">
                      <table className="table table-bordered table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Item</th>
                            <th className="text-end">Total</th>
                            <th className="text-end">Count</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Total unpaid orders (pending payment status)</td>
                            <td className="text-end">{fmt(incompleteOrders.unpaidOrders?.amount)}</td>
                            <td className="text-end">{incompleteOrders.unpaidOrders?.count ?? 0}</td>
                            <td className="text-center">
                              <Link to="/orders" className="btn btn-xs btn-outline-primary">view all</Link>
                            </td>
                          </tr>
                          <tr>
                            <td>Total not yet shipped orders</td>
                            <td className="text-end">{fmt(incompleteOrders.notShippedOrders?.amount)}</td>
                            <td className="text-end">{incompleteOrders.notShippedOrders?.count ?? 0}</td>
                            <td className="text-center">
                              <Link to="/orders" className="btn btn-xs btn-outline-primary">view all</Link>
                            </td>
                          </tr>
                          <tr>
                            <td>Total incomplete orders (pending order status)</td>
                            <td className="text-end">{fmt(incompleteOrders.incompleteOrders?.amount)}</td>
                            <td className="text-end">{incompleteOrders.incompleteOrders?.count ?? 0}</td>
                            <td className="text-center">
                              <Link to="/orders" className="btn btn-xs btn-outline-primary">view all</Link>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-soft py-3">No data</div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Block>

        <Block>
          <Row className="g-gs">
            <Col lg="6">
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-2">
                    <div className="card-title"><h6 className="title">Latest orders</h6></div>
                    <div className="card-tools">
                      <Link to="/orders" className="link link-primary">view all orders</Link>
                    </div>
                  </div>
                  {latestOrders.length > 0 ? (
                    <DataTable className="card-stretch">
                      <DataTableBody compact>
                        <DataTableHead>
                          <DataTableRow><span className="sub-text">Order #</span></DataTableRow>
                          <DataTableRow><span className="sub-text">Order status</span></DataTableRow>
                          <DataTableRow size="md"><span className="sub-text">Customer</span></DataTableRow>
                          <DataTableRow size="sm"><span className="sub-text">Created on</span></DataTableRow>
                          <DataTableRow><span className="sub-text">View</span></DataTableRow>
                        </DataTableHead>
                        {latestOrders.map((o) => (
                          <DataTableItem key={o.id}>
                            <DataTableRow>
                              <span className="fw-bold">{o.id.slice(0, 8).toUpperCase()}</span>
                            </DataTableRow>
                            <DataTableRow>
                              <Badge color={STATUS_BADGE[o.orderStatus?.status] || "secondary"} className="text-capitalize">
                                {o.orderStatus?.status || "unknown"}
                              </Badge>
                            </DataTableRow>
                            <DataTableRow size="md">
                              <span>{o.user?.firstName} {o.user?.lastName}</span>
                            </DataTableRow>
                            <DataTableRow size="sm">
                              <span>{fmtDate(o.orderDate)}</span>
                            </DataTableRow>
                            <DataTableRow>
                              <Link to={`/orders/${o.id}`} className="btn btn-xs btn-outline-primary">
                                <Icon name="eye" />
                              </Link>
                            </DataTableRow>
                          </DataTableItem>
                        ))}
                      </DataTableBody>
                    </DataTable>
                  ) : (
                    <div className="text-center text-soft py-4">No data available in table</div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Block>

        <Block>
          <Row className="g-gs">
            <Col lg="6">
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-2">
                    <div className="card-title"><h6 className="title">Bestsellers by quantity</h6></div>
                  </div>
                  {bestByQty.length > 0 ? (
                    <DataTable className="card-stretch">
                      <DataTableBody compact>
                        <DataTableHead>
                          <DataTableRow><span className="sub-text">Name</span></DataTableRow>
                          <DataTableRow><span className="sub-text text-end d-block">Total quantity</span></DataTableRow>
                          <DataTableRow><span className="sub-text text-end d-block">Total amount (exc tax)</span></DataTableRow>
                          <DataTableRow><span className="sub-text">View</span></DataTableRow>
                        </DataTableHead>
                        {bestByQty.map((p, i) => (
                          <DataTableItem key={i}>
                            <DataTableRow><span className="fw-bold">{p.productName}</span></DataTableRow>
                            <DataTableRow><span className="text-end d-block">{p.totalQty}</span></DataTableRow>
                            <DataTableRow><span className="text-end d-block">{fmt(p.totalRevenue)}</span></DataTableRow>
                            <DataTableRow>
                              <Link to={`/products/${p.productId}`} className="btn btn-xs btn-outline-primary">
                                <Icon name="eye" />
                              </Link>
                            </DataTableRow>
                          </DataTableItem>
                        ))}
                      </DataTableBody>
                    </DataTable>
                  ) : (
                    <div className="text-center text-soft py-4">No data available in table</div>
                  )}
                </div>
              </Card>
            </Col>
            <Col lg="6">
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-2">
                    <div className="card-title"><h6 className="title">Bestsellers by amount</h6></div>
                  </div>
                  {bestByAmt.length > 0 ? (
                    <DataTable className="card-stretch">
                      <DataTableBody compact>
                        <DataTableHead>
                          <DataTableRow><span className="sub-text">Name</span></DataTableRow>
                          <DataTableRow><span className="sub-text text-end d-block">Total quantity</span></DataTableRow>
                          <DataTableRow><span className="sub-text text-end d-block">Total amount (exc tax)</span></DataTableRow>
                          <DataTableRow><span className="sub-text">View</span></DataTableRow>
                        </DataTableHead>
                        {bestByAmt.map((p, i) => (
                          <DataTableItem key={i}>
                            <DataTableRow><span className="fw-bold">{p.productName}</span></DataTableRow>
                            <DataTableRow><span className="text-end d-block">{p.totalQty}</span></DataTableRow>
                            <DataTableRow><span className="text-end d-block">{fmt(p.totalRevenue)}</span></DataTableRow>
                            <DataTableRow>
                              <Link to={`/products/${p.productId}`} className="btn btn-xs btn-outline-primary">
                                <Icon name="eye" />
                              </Link>
                            </DataTableRow>
                          </DataTableItem>
                        ))}
                      </DataTableBody>
                    </DataTable>
                  ) : (
                    <div className="text-center text-soft py-4">No data available in table</div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Block>
      </Content>
    </React.Fragment>
  );
};

export default HomePage;
