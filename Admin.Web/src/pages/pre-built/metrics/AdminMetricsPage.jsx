import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Card, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, BlockDes,
  Icon, Row, Col,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  RSelect,
} from "@/components/Component";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { apiGet } from "@/utils/apiClient";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

const METRIC_KEY_OPTIONS = [
  { value: "gross_sales", label: "Gross Sales" },
  { value: "net_sales", label: "Net Sales" },
  { value: "orders_count", label: "Orders Count" },
  { value: "discount_total", label: "Discount Total" },
  { value: "tax_total", label: "Tax Total" },
  { value: "shipping_total", label: "Shipping Total" },
  { value: "refund_total", label: "Refund Total" },
  { value: "new_customers", label: "New Customers" },
];

const LIMIT_OPTIONS = [
  { value: 5, label: "Top 5" },
  { value: 10, label: "Top 10" },
  { value: 25, label: "Top 25" },
  { value: 50, label: "Top 50" },
];

const STATUS_COLORS = {
  pending: "#f4bd0e",
  processing: "#09c2de",
  confirmed: "#1ee0ac",
  shipped: "#6576ff",
  delivered: "#1ee0ac",
  on_hold: "#e85347",
  awaiting_payment: "#ff9b23",
};

const fmt = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (v) => Number(v || 0).toLocaleString("en-US");

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function rangeToDates(range) {
  const now = new Date().toISOString();
  if (range === "7d") return { from: daysAgo(7), to: now };
  return { from: daysAgo(30), to: now };
}

const AdminMetricsPage = () => {
  const [range, setRange] = useState(RANGE_OPTIONS[0]);
  const [metricKey, setMetricKey] = useState(METRIC_KEY_OPTIONS[0]);
  const [topLimit, setTopLimit] = useState(LIMIT_OPTIONS[1]);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [timeseries, setTimeseries] = useState([]);
  const [tsLoading, setTsLoading] = useState(false);

  const [topProducts, setTopProducts] = useState([]);
  const [tpLoading, setTpLoading] = useState(false);

  const [openOrders, setOpenOrders] = useState([]);
  const [ooLoading, setOoLoading] = useState(false);

  const [error, setError] = useState(null);

  const loadSummary = useCallback(async (r) => {
    setSummaryLoading(true);
    try {
      const res = await apiGet(`/admin/metrics/summary?range=${r}`);
      setSummary(res?.data ?? res);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setSummaryLoading(false); }
  }, []);

  const loadTimeseries = useCallback(async (key, r) => {
    setTsLoading(true);
    try {
      const { from, to } = rangeToDates(r);
      const res = await apiGet(`/admin/metrics/timeseries?metricKey=${key}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      setTimeseries(res?.data ?? []);
    } catch (e) { setError(e.message); }
    finally { setTsLoading(false); }
  }, []);

  const loadTopProducts = useCallback(async (r, limit) => {
    setTpLoading(true);
    try {
      const { from, to } = rangeToDates(r);
      const res = await apiGet(`/admin/metrics/top-products?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${limit}`);
      setTopProducts(res?.data ?? []);
    } catch (e) { setError(e.message); }
    finally { setTpLoading(false); }
  }, []);

  const loadOpenOrders = useCallback(async () => {
    setOoLoading(true);
    try {
      const res = await apiGet("/admin/metrics/open-orders");
      setOpenOrders((res?.data ?? res)?.openOrdersByStatus ?? []);
    } catch (e) { setError(e.message); }
    finally { setOoLoading(false); }
  }, []);

  useEffect(() => {
    loadSummary(range.value);
    loadTimeseries(metricKey.value, range.value);
    loadTopProducts(range.value, topLimit.value);
    loadOpenOrders();
  }, [range.value]);

  useEffect(() => {
    loadTimeseries(metricKey.value, range.value);
  }, [metricKey.value]);

  useEffect(() => {
    loadTopProducts(range.value, topLimit.value);
  }, [topLimit.value]);

  const summaryCards = summary ? [
    { label: "Gross Sales", value: fmt(summary.grossSales), icon: "coins", color: "primary" },
    { label: "Net Sales", value: fmt(summary.netSales), icon: "coin-alt", color: "success" },
    { label: "Orders", value: fmtNum(summary.ordersCount), icon: "cart", color: "info" },
    { label: "Discounts", value: fmt(summary.discountTotal), icon: "offer", color: "warning" },
    { label: "Tax", value: fmt(summary.taxTotal), icon: "file-text", color: "secondary" },
    { label: "Shipping", value: fmt(summary.shippingTotal), icon: "truck", color: "primary" },
    { label: "Refunds", value: fmt(summary.refundTotal), icon: "undo", color: "danger" },
    { label: "New Customers", value: fmtNum(summary.newCustomers), icon: "users", color: "success" },
  ] : [];

  const tsChartData = {
    labels: timeseries.map((p) => p.date),
    datasets: [
      {
        label: metricKey.label,
        data: timeseries.map((p) => p.value),
        borderColor: "#6576ff",
        backgroundColor: "rgba(101,118,255,0.12)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const tsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  const totalOpen = openOrders.reduce((s, o) => s + o.count, 0);
  const doughnutData = {
    labels: openOrders.map((o) => o.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())),
    datasets: [
      {
        data: openOrders.map((o) => o.count),
        backgroundColor: openOrders.map((o) => STATUS_COLORS[o.status] || "#8094ae"),
        borderWidth: 2,
      },
    ],
  };

  return (
    <React.Fragment>
      <Head title="Metrics & KPIs" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Metrics & KPIs</BlockTitle>
              <BlockDes className="text-soft"><p>Detailed store performance metrics</p></BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="d-flex align-items-center g-2" style={{ minWidth: 180 }}>
                <RSelect
                  options={RANGE_OPTIONS}
                  value={range}
                  onChange={(opt) => setRange(opt)}
                />
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <Block>
          <Row className="g-gs">
            {summaryLoading && !summary ? (
              <Col xs={12} className="text-center py-4"><Spinner color="primary" /></Col>
            ) : (
              summaryCards.map((c, i) => (
                <Col xxl={3} sm={6} key={i}>
                  <Card className="card-bordered">
                    <div className="card-inner">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div className="card-title-group mb-1">
                            <div className="card-title">
                              <h6 className="title">{c.label}</h6>
                            </div>
                          </div>
                          <div className="card-amount">
                            <span className="amount">{c.value}</span>
                          </div>
                        </div>
                        <div className={`icon-circle icon-circle-lg bg-${c.color}-dim`}>
                          <Icon name={c.icon} className={`text-${c.color}`} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))
            )}
          </Row>
        </Block>

        <Block>
          <Row className="g-gs">
            <Col xxl={8} lg={8}>
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-3">
                    <div className="card-title">
                      <h6 className="title">Timeseries — {metricKey.label}</h6>
                    </div>
                    <div style={{ minWidth: 200 }}>
                      <RSelect
                        options={METRIC_KEY_OPTIONS}
                        value={metricKey}
                        onChange={(opt) => setMetricKey(opt)}
                      />
                    </div>
                  </div>
                  {tsLoading ? (
                    <div className="text-center py-5"><Spinner color="primary" /></div>
                  ) : timeseries.length === 0 ? (
                    <div className="text-center text-muted py-5">No data available for this period</div>
                  ) : (
                    <div style={{ height: 320 }}>
                      <Line data={tsChartData} options={tsChartOptions} />
                    </div>
                  )}
                </div>
              </Card>
            </Col>
            <Col xxl={4} lg={4}>
              <Card className="card-bordered card-full">
                <div className="card-inner">
                  <div className="card-title-group mb-3">
                    <div className="card-title">
                      <h6 className="title">Open Orders</h6>
                    </div>
                    <div className="card-tools">
                      <span className="badge bg-outline-primary">{totalOpen} total</span>
                    </div>
                  </div>
                  {ooLoading ? (
                    <div className="text-center py-5"><Spinner color="primary" /></div>
                  ) : openOrders.length === 0 ? (
                    <div className="text-center text-muted py-4">No open orders</div>
                  ) : (
                    <>
                      <div style={{ maxWidth: 240, margin: "0 auto" }}>
                        <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: "bottom", labels: { padding: 12 } } } }} />
                      </div>
                      <ul className="nk-store-statistics mt-3">
                        {openOrders.map((o, i) => (
                          <li key={i} className="d-flex justify-content-between py-1">
                            <span className="text-capitalize">{o.status.replace(/_/g, " ")}</span>
                            <span className="fw-bold">{o.count}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Block>

        <Block>
          <Card className="card-bordered">
            <div className="card-inner">
              <div className="card-title-group mb-3">
                <div className="card-title">
                  <h6 className="title">Top Products</h6>
                </div>
                <div style={{ minWidth: 140 }}>
                  <RSelect
                    options={LIMIT_OPTIONS}
                    value={topLimit}
                    onChange={(opt) => setTopLimit(opt)}
                  />
                </div>
              </div>
              {tpLoading ? (
                <div className="text-center py-4"><Spinner color="primary" /></div>
              ) : topProducts.length === 0 ? (
                <div className="text-center text-muted py-4">No product data for this period</div>
              ) : (
                <DataTable className="card-stretch">
                  <DataTableBody compact>
                    <DataTableHead>
                      <DataTableRow><span className="sub-text">Product</span></DataTableRow>
                      <DataTableRow size="md"><span className="sub-text">SKU</span></DataTableRow>
                      <DataTableRow><span className="sub-text text-end d-block">Qty Sold</span></DataTableRow>
                      <DataTableRow><span className="sub-text text-end d-block">Revenue</span></DataTableRow>
                    </DataTableHead>
                    {topProducts.map((p, i) => (
                      <DataTableItem key={p.productId + "-" + i}>
                        <DataTableRow>
                          <span className="fw-bold">{p.productName}</span>
                        </DataTableRow>
                        <DataTableRow size="md">
                          <span className="text-muted">{p.sku}</span>
                        </DataTableRow>
                        <DataTableRow>
                          <span className="text-end d-block">{fmtNum(p.totalQty)}</span>
                        </DataTableRow>
                        <DataTableRow>
                          <span className="text-end d-block">{fmt(p.totalRevenue)}</span>
                        </DataTableRow>
                      </DataTableItem>
                    ))}
                  </DataTableBody>
                </DataTable>
              )}
            </div>
          </Card>
        </Block>
      </Content>
    </React.Fragment>
  );
};

export default AdminMetricsPage;
