import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, UserAvatar, PaginationComponent,
  DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableItem,
  Button,
} from "@/components/Component";
import { apiGet } from "@/utils/apiClient";

const avatarThemes = ["primary", "success", "info", "warning", "danger", "pink", "purple"];
const getTheme = (id) => avatarThemes[(id || "").charCodeAt(0) % avatarThemes.length];
const getInitials = (u) => {
  if (!u) return "??";
  const f = (u.firstName || "")[0] || "";
  const l = (u.lastName || "")[0] || "";
  if (f || l) return (f + l).toUpperCase();
  return (u.emailAddress || "??").slice(0, 2).toUpperCase();
};
const getDisplayName = (u) =>
  u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.emailAddress : "—";

const AdminAddressList = () => {
  const [sm, updateSm] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(15);

  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemPerPage),
        orderBy: "user",
        order: "asc",
      });
      if (search) params.set("search", search);
      if (filterCity) params.set("city", filterCity);
      if (filterRegion) params.set("region", filterRegion);

      const res = await apiGet(`/users/admin/addresses?${params.toString()}`);
      setAddresses(res?.data ?? []);
      setTotalItems(res?.meta?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemPerPage, search, filterCity, filterRegion]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const resetFilters = () => {
    setSearch("");
    setFilterCity("");
    setFilterRegion("");
    setCurrentPage(1);
  };

  const fmtAddress = (a) => {
    if (!a) return "—";
    const parts = [a.addressLine1];
    if (a.addressLine2) parts.push(a.addressLine2);
    return parts.join(", ");
  };

  const fmtCityRegion = (a) => {
    if (!a) return "—";
    return [a.city, a.region].filter(Boolean).join(", ");
  };

  const totalPages = Math.ceil(totalItems / itemPerPage);

  return (
    <React.Fragment>
      <Head title="Addresses" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Customer Addresses
              </BlockTitle>
              <div className="text-muted fs-13px mt-1">
                {totalItems} address{totalItems !== 1 ? "es" : ""} on file
              </div>
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
                      <Button
                        color={showFilters ? "primary" : "light"}
                        outline={!showFilters}
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Icon name="filter" className="me-1" />
                        Filters
                      </Button>
                    </li>
                    <li>
                      <Button color="light" outline size="sm" onClick={loadAddresses}>
                        <Icon name="reload" className="me-1" />
                        Refresh
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {showFilters && (
          <Block>
            <div className="card card-bordered">
              <div className="card-inner py-3">
                <Row className="g-3 align-items-end">
                  <Col md={4}>
                    <div className="form-group mb-0">
                      <label className="form-label form-label-sm">Search</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Name, email, address…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                      />
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="form-group mb-0">
                      <label className="form-label form-label-sm">City</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter by city"
                        value={filterCity}
                        onChange={(e) => { setFilterCity(e.target.value); setCurrentPage(1); }}
                      />
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="form-group mb-0">
                      <label className="form-label form-label-sm">State / Region</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Filter by state"
                        value={filterRegion}
                        onChange={(e) => { setFilterRegion(e.target.value); setCurrentPage(1); }}
                      />
                    </div>
                  </Col>
                  <Col md={2}>
                    <Button color="light" size="sm" className="w-100" onClick={resetFilters}>
                      <Icon name="undo" className="me-1" />
                      Reset
                    </Button>
                  </Col>
                </Row>
              </div>
            </div>
          </Block>
        )}

        {error && (
          <div className="alert alert-danger">
            <Icon name="alert-circle" className="me-1" />
            {error}
          </div>
        )}

        <Block>
          <div className="card card-bordered card-stretch">
            <DataTable className="card-inner">
              <DataTableBody compact>
                <DataTableHead>
                  <DataTableRow>
                    <span className="sub-text">Customer</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">Label</span>
                  </DataTableRow>
                  <DataTableRow>
                    <span className="sub-text">Street Address</span>
                  </DataTableRow>
                  <DataTableRow size="md">
                    <span className="sub-text">City / State</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="sub-text">Postal Code</span>
                  </DataTableRow>
                  <DataTableRow size="lg">
                    <span className="sub-text">Country</span>
                  </DataTableRow>
                  <DataTableRow size="sm">
                    <span className="sub-text">Default</span>
                  </DataTableRow>
                </DataTableHead>

                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <Spinner size="sm" color="primary" />
                    </td>
                  </tr>
                ) : addresses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      No addresses found.
                    </td>
                  </tr>
                ) : (
                  addresses.map((ua) => (
                    <DataTableItem key={ua.id}>
                      <DataTableRow>
                        <Link
                          to={`/customers/${ua.user?.id}`}
                          className="d-flex align-items-center text-reset"
                        >
                          <UserAvatar
                            theme={getTheme(ua.user?.id)}
                            className="sm"
                            text={getInitials(ua.user)}
                          />
                          <div className="ms-2">
                            <span className="fw-semibold">{getDisplayName(ua.user)}</span>
                            {ua.user?.emailAddress && (
                              <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                                {ua.user.emailAddress}
                              </div>
                            )}
                          </div>
                        </Link>
                      </DataTableRow>
                      <DataTableRow size="md">
                        <Badge color="outline-secondary" className="badge-sm">
                          {ua.label || "—"}
                        </Badge>
                      </DataTableRow>
                      <DataTableRow>
                        <span>{fmtAddress(ua.address)}</span>
                      </DataTableRow>
                      <DataTableRow size="md">
                        <span>{fmtCityRegion(ua.address)}</span>
                      </DataTableRow>
                      <DataTableRow size="lg">
                        <span>{ua.address?.postalCode || "—"}</span>
                      </DataTableRow>
                      <DataTableRow size="lg">
                        <span>{ua.address?.country?.countryName || "—"}</span>
                      </DataTableRow>
                      <DataTableRow size="sm">
                        {ua.isDefault ? (
                          <Icon name="check-circle-fill" className="text-success" />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </DataTableRow>
                    </DataTableItem>
                  ))
                )}
              </DataTableBody>
            </DataTable>
            {totalPages > 1 && (
              <div className="card-inner pt-0">
                <PaginationComponent
                  itemPerPage={itemPerPage}
                  totalItems={totalItems}
                  paginate={(p) => setCurrentPage(p)}
                  currentPage={currentPage}
                />
              </div>
            )}
          </div>
        </Block>
      </Content>
    </React.Fragment>
  );
};

export default AdminAddressList;
