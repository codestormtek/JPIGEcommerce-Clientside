import React, { useState, useEffect } from "react";
import { Spinner, Badge, Alert } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Row, Col, Icon,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet } from "@/utils/apiClient";

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div className="d-flex py-2 border-bottom">
      <span className="text-soft" style={{ minWidth: 160, fontSize: "0.85rem" }}>{label}</span>
      <span className="fw-medium" style={{ fontSize: "0.9rem" }}>{value || <em className="text-soft">Not set</em>}</span>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ icon, title, badge, badgeColor, children }) {
  return (
    <div className="card card-bordered h-100">
      <div className="card-inner">
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded"
            style={{ width: 36, height: 36, background: "#f5f6fa" }}
          >
            <Icon name={icon} style={{ fontSize: "1.1rem", color: "#6576ff" }} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <h6 className="mb-0">{title}</h6>
            {badge && <Badge color={badgeColor ?? "primary"} className="badge-sm">{badge}</Badge>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminShippingMethods = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/shipping/config")
      .then((res) => setConfig(res?.data ?? null))
      .catch((e) => setError(e.message ?? "Failed to load shipping configuration."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Head title="Shipping Methods" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Shipping Methods</BlockTitle>
              <p className="text-soft">
                Live carrier rates are powered by <strong>Shippo</strong>. Rates are fetched in real time at checkout
                based on the customer's address and the order's calculated package size.
              </p>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {loading && (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          )}

          {!loading && error && (
            <Alert color="danger" className="mb-4">
              <Icon name="alert-circle" className="me-2" />
              {error}
            </Alert>
          )}

          {!loading && !error && config && (
            <>
              {/* ── Row 1: Status + Origin Address ─────────────────────── */}
              <Row className="g-4 mb-4">

                {/* Shippo Connection Status */}
                <Col md="6">
                  <SectionCard
                    icon="truck"
                    title="Shippo Integration"
                    badge={config.shippo.enabled ? "Connected" : "Not Configured"}
                    badgeColor={config.shippo.enabled ? "success" : "danger"}
                  >
                    <p className="text-soft mb-3" style={{ fontSize: "0.85rem" }}>
                      Shippo is used to fetch live shipping rates from USPS, UPS, FedEx and other carriers,
                      and to purchase and print postage labels directly from the admin Shipments page.
                    </p>

                    <div className="d-flex align-items-center gap-3 p-3 rounded" style={{ background: config.shippo.enabled ? "#e5f8ee" : "#fff0f0" }}>
                      <Icon
                        name={config.shippo.enabled ? "check-circle" : "cross-circle"}
                        style={{ fontSize: "1.5rem", color: config.shippo.enabled ? "#1ee0ac" : "#e85347" }}
                      />
                      <div>
                        <div className="fw-bold" style={{ fontSize: "0.9rem" }}>
                          {config.shippo.enabled ? "API key is configured and active" : "API key is not configured"}
                        </div>
                        <div className="text-soft" style={{ fontSize: "0.8rem" }}>
                          {config.shippo.enabled
                            ? "Live rates and label purchasing are available."
                            : "Set the SHIPPO_API_KEY environment variable to enable Shippo."}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <a
                        href="https://goshippo.com/user/apikeys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        <Icon name="external-link" className="me-1" />
                        Shippo Dashboard
                      </a>
                    </div>
                  </SectionCard>
                </Col>

                {/* Origin Address */}
                <Col md="6">
                  <SectionCard icon="map-pin" title="Store Origin Address">
                    <p className="text-soft mb-3" style={{ fontSize: "0.85rem" }}>
                      This address is sent to Shippo as the <em>ship from</em> address for every rate quote and label.
                      Update via the <code>STORE_SHIP_*</code> environment variables on the API server.
                    </p>
                    <InfoRow label="Name"    value={config.originAddress.name} />
                    <InfoRow label="Street"  value={config.originAddress.street1} />
                    <InfoRow label="City"    value={config.originAddress.city} />
                    <InfoRow label="State"   value={config.originAddress.state} />
                    <InfoRow label="ZIP"     value={config.originAddress.zip} />
                    <InfoRow label="Country" value={config.originAddress.country} />
                    <InfoRow label="Phone"   value={config.originAddress.phone} />
                    <InfoRow label="Email"   value={config.originAddress.email} />
                  </SectionCard>
                </Col>
              </Row>

              {/* ── Row 2: Boxes + Class Defaults ──────────────────────── */}
              <Row className="g-4">

                {/* Box / Packaging Sizes */}
                <Col md="6">
                  <SectionCard icon="package" title="Packaging Sizes">
                    <p className="text-soft mb-3" style={{ fontSize: "0.85rem" }}>
                      When calculating rates, Shippo picks the smallest box below that fits the order's total weight
                      and item dimensions. If no box fits, the XLarge box is used.
                    </p>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Box</th>
                            <th>Max Weight</th>
                            <th>Dimensions (in)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {config.boxes.map((b) => (
                            <tr key={b.name}>
                              <td className="fw-medium">{b.name}</td>
                              <td>{b.maxWeightLb} lb</td>
                              <td>{b.length} × {b.width} × {b.height}"</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                </Col>

                {/* Shipping Class Defaults */}
                <Col md="6">
                  <SectionCard icon="layers" title="Shipping Class Defaults">
                    <p className="text-soft mb-3" style={{ fontSize: "0.85rem" }}>
                      When a product item doesn't have its own weight or dimensions set, the system falls back
                      to these defaults based on the product's <strong>Shipping Class</strong>. Set the class on
                      each product variant in the Products page.
                    </p>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Class</th>
                            <th>Default Weight</th>
                            <th>Default Dims (in)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {config.shippingClassDefaults.map((c) => (
                            <tr key={c.key}>
                              <td>
                                <div className="fw-medium">{c.name}</div>
                                <code className="text-soft" style={{ fontSize: "0.75rem" }}>{c.key}</code>
                              </td>
                              <td>{c.weightLb} lb</td>
                              <td>{c.length} × {c.width} × {c.height}"</td>
                            </tr>
                          ))}
                          <tr>
                            <td>
                              <div className="fw-medium text-soft">Fallback</div>
                              <code className="text-soft" style={{ fontSize: "0.75rem" }}>no class set</code>
                            </td>
                            <td className="text-soft">1.0 lb</td>
                            <td className="text-soft">6 × 4 × 4"</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                </Col>
              </Row>

              {/* ── How It Works note ──────────────────────────────────── */}
              <div className="card card-bordered mt-4">
                <div className="card-inner">
                  <h6 className="mb-3 d-flex align-items-center gap-2">
                    <Icon name="info" style={{ color: "#6576ff" }} />
                    How Live Rates Work at Checkout
                  </h6>
                  <Row className="g-3">
                    {[
                      { step: "1", icon: "cart", title: "Customer checks out", desc: "They enter their shipping address on the storefront." },
                      { step: "2", icon: "server", title: "API calculates parcel", desc: "Each item's weight and dimensions are summed. The smallest fitting box is selected." },
                      { step: "3", icon: "send", title: "Shippo fetches rates", desc: "A live request is sent to Shippo with the parcel and addresses. Rates from all enabled carriers are returned." },
                      { step: "4", icon: "tag", title: "Customer selects a rate", desc: "Available options (USPS Ground, Priority, UPS, etc.) are shown with prices. The chosen rate is saved to the order." },
                      { step: "5", icon: "printer", title: "Admin purchases label", desc: "From the Shipments page, click Purchase Label to buy postage through Shippo and download the PDF label." },
                    ].map(({ step, icon, title, desc }) => (
                      <Col xs="12" sm="6" lg="4" key={step}>
                        <div className="d-flex gap-3">
                          <div
                            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 fw-bold"
                            style={{ width: 32, height: 32, background: "#6576ff", color: "#fff", fontSize: "0.8rem" }}
                          >
                            {step}
                          </div>
                          <div>
                            <div className="fw-medium" style={{ fontSize: "0.875rem" }}>{title}</div>
                            <div className="text-soft" style={{ fontSize: "0.8rem" }}>{desc}</div>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              </div>
            </>
          )}
        </Block>
      </Content>
    </>
  );
};

export default AdminShippingMethods;
