import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { DropdownToggle, DropdownMenu, Card, UncontrolledDropdown, DropdownItem, Spinner, Badge } from "reactstrap";
import {
  Block,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Button,
  Row,
  Col,
  PreviewAltCard,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableItem,
} from "@/components/Component";
import { apiGet } from "@/utils/apiClient";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, ChartTooltip, Legend);

const RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
];

function formatCurrency(val) {
  return "$" + Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rangeToDays(range) {
  if (range === "today") return 1;
  if (range === "7d") return 7;
  return 30;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const HomePage = () => {
  const [sm, updateSm] = useState(false);
  const [range, setRange] = useState("today");
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const days = rangeToDays(range);
    const from = encodeURIComponent(daysAgo(days));
    const to = encodeURIComponent(daysAgo(0));
    try {
      const [summaryRes, timeseriesRes, openOrdersRes, topProductsRes] = await Promise.all([
        apiGet(`/admin/metrics/summary?range=${range}`),
        apiGet(`/admin/metrics/timeseries?metricKey=gross_sales&from=${from}&to=${to}`),
        apiGet(`/admin/metrics/open-orders`),
        apiGet(`/admin/metrics/top-products?from=${from}&to=${to}&limit=10`),
      ]);
      setSummary(summaryRes?.data || summaryRes);
      setTimeseries(timeseriesRes?.data || []);
      setOpenOrders((openOrdersRes?.data?.openOrdersByStatus) || []);
      setTopProducts(topProductsRes?.data || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label || "Today";

  const kpiCards = summary
    ? [
        { label: "Orders Today", value: summary.ordersToday ?? summary.ordersCount ?? 0, icon: "cart", color: "primary" },
        { label: "Revenue Today", value: formatCurrency(summary.revenueToday ?? summary.grossSales ?? 0), icon: "sign-dollar", color: "success" },
        { label: "Orders This Week", value: summary.ordersThisWeek ?? summary.ordersCount ?? 0, icon: "bag", color: "info" },
        { label: "Revenue This Week", value: formatCurrency(summary.revenueThisWeek ?? summary.grossSales ?? 0), icon: "coins", color: "warning" },
        { label: "Low Stock Items", value: summary.lowStockCount ?? 0, icon: "alert-circle", color: "danger" },
        { label: "Refunds (7d)", value: summary.refundsLast7dCount ?? summary.refundTotal ?? 0, icon: "undo", color: "gray" },
        { label: "New Customers (30d)", value: summary.newCustomersLast30d ?? summary.newCustomers ?? 0, icon: "users", color: "primary" },
      ]
    : [];

  const salesChartData = {
    labels: timeseries.map((p) => p.date),
    datasets: [
      {
        label: "Gross Sales ($)",
        data: timeseries.map((p) => p.value),
        borderColor: "#6576ff",
        backgroundColor: "rgba(101, 118, 255, 0.15)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatCurrency(ctx.parsed.y),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v) => "$" + v.toLocaleString(),
        },
      },
      x: {
        ticks: {
          maxTicksLimit: 10,
        },
      },
    },
  };

  const statusColors = ["#6576ff", "#1ee0ac", "#e85347", "#f4bd0e", "#09c2de", "#816bff", "#ff63a5"];
  const doughnutData = {
    labels: openOrders.map((o) => o.status),
    datasets: [
      {
        data: openOrders.map((o) => o.count),
        backgroundColor: openOrders.map((_, i) => statusColors[i % statusColors.length]),
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  return (
    <React.Fragment>
      <Head title="Store Overview" />
      <Content>
        <BlockHead size="sm">
          <div className="nk-block-between">
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Store Overview
              </BlockTitle>
              <BlockDes className="text-soft">
                <p>Welcome to your store dashboard.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                  onClick={() => updateSm(!sm)}
                >
                  <Icon name="more-v" />
                </Button>
                <div className="toggle-expand-content" style={{ display: sm ? "block" : "none" }}>
                  <ul className="nk-block-tools g-3">
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="dropdown-toggle btn btn-white btn-dim btn-outline-light">
                          <Icon className="d-none d-sm-inline" name="calender-date" />
                          <span>{rangeLabel}</span>
                          <Icon className="dd-indc" name="chevron-right" />
                        </DropdownToggle>
                        <DropdownMenu>
                          <ul className="link-list-opt no-bdr">
                            {RANGE_OPTIONS.map((opt) => (
                              <li key={opt.value}>
                                <DropdownItem
                                  href="#"
                                  onClick={(ev) => {
                                    ev.preventDefault();
                                    setRange(opt.value);
                                  }}
                                  className={range === opt.value ? "active" : ""}
                                >
                                  {opt.label}
                                </DropdownItem>
                              </li>
                            ))}
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </div>
        </BlockHead>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        {loading ? (
          <Block>
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          </Block>
        ) : (
          <>
            <Block>
              <Row className="g-gs">
                {kpiCards.map((card, idx) => (
                  <Col key={idx} sm="6" md="4" xxl="auto" className="flex-xxl-fill">
                    <PreviewAltCard className="card-bordered card-full">
                      <div className="card-title-group align-start mb-0">
                        <div className="card-title">
                          <h6 className="subtitle">{card.label}</h6>
                        </div>
                        <div className="card-tools">
                          <em className={`card-hint icon ni ni-${card.icon} text-${card.color}`}></em>
                        </div>
                      </div>
                      <div className="card-amount mt-1">
                        <span className="amount">{card.value}</span>
                      </div>
                    </PreviewAltCard>
                  </Col>
                ))}
              </Row>
            </Block>

            <Block>
              <Row className="g-gs">
                <Col lg="8">
                  <PreviewAltCard className="h-100 card-bordered">
                    <div className="card-title-group mb-3">
                      <div className="card-title">
                        <h6 className="title">Sales Trend ({rangeLabel})</h6>
                      </div>
                    </div>
                    <div style={{ height: "300px" }}>
                      {timeseries.length > 0 ? (
                        <Line data={salesChartData} options={salesChartOptions} />
                      ) : (
                        <div className="text-center text-soft py-5">No sales data available</div>
                      )}
                    </div>
                  </PreviewAltCard>
                </Col>
                <Col lg="4">
                  <PreviewAltCard className="h-100 card-bordered">
                    <div className="card-title-group mb-3">
                      <div className="card-title">
                        <h6 className="title">Open Orders</h6>
                      </div>
                    </div>
                    <div style={{ height: "300px" }}>
                      {openOrders.length > 0 ? (
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                      ) : (
                        <div className="text-center text-soft py-5">No open orders</div>
                      )}
                    </div>
                  </PreviewAltCard>
                </Col>
              </Row>
            </Block>

            <Block>
              <Card className="card-bordered">
                <div className="card-inner">
                  <div className="card-title-group mb-3">
                    <div className="card-title">
                      <h6 className="title">Top Products ({rangeLabel})</h6>
                    </div>
                  </div>
                  {topProducts.length > 0 ? (
                    <DataTable className="card-stretch">
                      <DataTableBody compact>
                        <DataTableHead>
                          <DataTableRow>
                            <span className="sub-text">Product</span>
                          </DataTableRow>
                          <DataTableRow size="md">
                            <span className="sub-text">SKU</span>
                          </DataTableRow>
                          <DataTableRow size="sm">
                            <span className="sub-text">Qty Sold</span>
                          </DataTableRow>
                          <DataTableRow>
                            <span className="sub-text">Revenue</span>
                          </DataTableRow>
                        </DataTableHead>
                        {topProducts.map((product, idx) => (
                          <DataTableItem key={idx}>
                            <DataTableRow>
                              <span className="tb-product">
                                <span className="title">{product.productName}</span>
                              </span>
                            </DataTableRow>
                            <DataTableRow size="md">
                              <span>{product.sku}</span>
                            </DataTableRow>
                            <DataTableRow size="sm">
                              <span>{product.totalQty}</span>
                            </DataTableRow>
                            <DataTableRow>
                              <span className="tb-amount">{formatCurrency(product.totalRevenue)}</span>
                            </DataTableRow>
                          </DataTableItem>
                        ))}
                      </DataTableBody>
                    </DataTable>
                  ) : (
                    <div className="text-center text-soft py-4">No product data available</div>
                  )}
                </div>
              </Card>
            </Block>
          </>
        )}
      </Content>
    </React.Fragment>
  );
};

export default HomePage;
