import React, { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalHeader, Spinner, Alert, Badge, Input } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

const blankPackageForm = () => ({
  name: "",
  slug: "",
  description: "",
  includedMeatCount: 1,
  includedSideCount: 2,
  includedSauceCount: 1,
  includesRolls: true,
  includesTea: false,
  isActive: true,
  displayOrder: 0,
});

const blankTierForm = () => ({
  tierLabel: "",
  minGuests: "",
  maxGuests: "",
  pricePerPerson: "",
  flatPrice: "",
  displayOrder: 0,
});

const AdminCateringPackages = () => {
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [expandedPkg, setExpandedPkg] = useState(null);

  const [packageModal, setPackageModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [pkgForm, setPkgForm] = useState(blankPackageForm());
  const [savingPkg, setSavingPkg] = useState(false);
  const [pkgFormError, setPkgFormError] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [tierModal, setTierModal] = useState(false);
  const [tierPkgId, setTierPkgId] = useState(null);
  const [editTier, setEditTier] = useState(null);
  const [tierForm, setTierForm] = useState(blankTierForm());
  const [savingTier, setSavingTier] = useState(false);
  const [tierFormError, setTierFormError] = useState(null);

  const [itemsModal, setItemsModal] = useState(false);
  const [itemsPkgId, setItemsPkgId] = useState(null);
  const [itemsPkg, setItemsPkg] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [savingItems, setSavingItems] = useState(false);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/catering/packages?limit=50");
      setPackages(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMenuItems = useCallback(async () => {
    try {
      const res = await apiGet("/catering/menu-items?limit=100&isActive=true");
      setMenuItems(res?.data ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    loadPackages();
    loadMenuItems();
  }, [loadPackages, loadMenuItems]);

  const refreshPackage = useCallback(async (pkgId) => {
    try {
      const res = await apiGet(`/catering/packages/${pkgId}`);
      const fresh = res?.data ?? res;
      if (fresh) {
        setPackages((prev) => prev.map((p) => (p.id === pkgId ? fresh : p)));
      }
    } catch {}
  }, []);

  const slugify = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const openCreatePkg = () => {
    setEditPkg(null);
    setPkgForm(blankPackageForm());
    setPkgFormError(null);
    setPackageModal(true);
  };

  const openEditPkg = (pkg) => {
    setEditPkg(pkg);
    setPkgForm({
      name: pkg.name || "",
      slug: pkg.slug || "",
      description: pkg.description || "",
      includedMeatCount: pkg.includedMeatCount ?? 1,
      includedSideCount: pkg.includedSideCount ?? 2,
      includedSauceCount: pkg.includedSauceCount ?? 1,
      includesRolls: pkg.includesRolls ?? true,
      includesTea: pkg.includesTea ?? false,
      isActive: pkg.isActive ?? true,
      displayOrder: pkg.displayOrder ?? 0,
    });
    setPkgFormError(null);
    setPackageModal(true);
  };

  const savePkg = async () => {
    setSavingPkg(true);
    setPkgFormError(null);
    try {
      const body = {
        name: pkgForm.name,
        slug: pkgForm.slug || slugify(pkgForm.name),
        description: pkgForm.description || undefined,
        includedMeatCount: Number(pkgForm.includedMeatCount),
        includedSideCount: Number(pkgForm.includedSideCount),
        includedSauceCount: Number(pkgForm.includedSauceCount),
        includesRolls: pkgForm.includesRolls,
        includesTea: pkgForm.includesTea,
        isActive: pkgForm.isActive,
        displayOrder: Number(pkgForm.displayOrder),
      };
      if (editPkg) {
        await apiPatch(`/catering/packages/${editPkg.id}`, body);
      } else {
        await apiPost("/catering/packages", body);
      }
      setPackageModal(false);
      setSuccess(editPkg ? "Package updated." : "Package created.");
      loadPackages();
    } catch (e) {
      setPkgFormError(e.message);
    } finally {
      setSavingPkg(false);
    }
  };

  const openDeletePkg = (pkg) => {
    setDeleteTarget(pkg);
    setDeleteModal(true);
  };

  const confirmDeletePkg = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/catering/packages/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      setSuccess("Package deleted.");
      loadPackages();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const openCreateTier = (pkgId) => {
    setEditTier(null);
    setTierPkgId(pkgId);
    setTierForm(blankTierForm());
    setTierFormError(null);
    setTierModal(true);
  };

  const openEditTier = (pkgId, tier) => {
    setEditTier(tier);
    setTierPkgId(pkgId);
    setTierForm({
      tierLabel: tier.tierLabel || "",
      minGuests: tier.minGuests ?? "",
      maxGuests: tier.maxGuests ?? "",
      pricePerPerson: tier.pricePerPerson ?? "",
      flatPrice: tier.flatPrice ?? "",
      displayOrder: tier.displayOrder ?? 0,
    });
    setTierFormError(null);
    setTierModal(true);
  };

  const saveTier = async () => {
    setSavingTier(true);
    setTierFormError(null);
    try {
      const pkg = packages.find((p) => p.id === tierPkgId);
      if (!pkg) throw new Error("Package not found");

      const existingTiers = (pkg.tiers || []).map((t) => ({
        id: t.id,
        tierLabel: t.tierLabel || undefined,
        minGuests: Number(t.minGuests),
        maxGuests: Number(t.maxGuests),
        pricePerPerson: Number(t.pricePerPerson),
        flatPrice: t.flatPrice ? Number(t.flatPrice) : undefined,
        displayOrder: t.displayOrder ?? 0,
      }));

      const newTier = {
        tierLabel: tierForm.tierLabel || undefined,
        minGuests: Number(tierForm.minGuests),
        maxGuests: Number(tierForm.maxGuests),
        pricePerPerson: Number(tierForm.pricePerPerson),
        flatPrice: tierForm.flatPrice ? Number(tierForm.flatPrice) : undefined,
        displayOrder: Number(tierForm.displayOrder),
      };

      let tiers;
      if (editTier) {
        tiers = existingTiers.map((t) =>
          t.id === editTier.id ? { ...newTier, id: editTier.id } : t
        );
      } else {
        tiers = [...existingTiers, newTier];
      }

      await apiPatch(`/catering/packages/${tierPkgId}`, { tiers });
      setTierModal(false);
      setSuccess(editTier ? "Tier updated." : "Tier added.");
      refreshPackage(tierPkgId);
    } catch (e) {
      setTierFormError(e.message);
    } finally {
      setSavingTier(false);
    }
  };

  const removeTier = async (pkgId, tierId) => {
    try {
      const pkg = packages.find((p) => p.id === pkgId);
      if (!pkg) return;
      const tiers = (pkg.tiers || [])
        .filter((t) => t.id !== tierId)
        .map((t) => ({
          id: t.id,
          tierLabel: t.tierLabel || undefined,
          minGuests: Number(t.minGuests),
          maxGuests: Number(t.maxGuests),
          pricePerPerson: Number(t.pricePerPerson),
          flatPrice: t.flatPrice ? Number(t.flatPrice) : undefined,
          displayOrder: t.displayOrder ?? 0,
        }));
      await apiPatch(`/catering/packages/${pkgId}`, { tiers });
      setSuccess("Tier removed.");
      refreshPackage(pkgId);
    } catch (e) {
      setError(e.message);
    }
  };

  const openManageItems = (pkg) => {
    setItemsPkgId(pkg.id);
    setItemsPkg(pkg);
    const existing = (pkg.items || []).map((pi) => ({
      menuItemId: pi.menuItemId,
      isRequired: pi.isRequired ?? false,
      isDefault: pi.isDefault ?? false,
      displayOrder: pi.displayOrder ?? 0,
      id: pi.id,
    }));
    setSelectedItems(existing);
    setItemsModal(true);
  };

  const toggleItem = (menuItemId) => {
    setSelectedItems((prev) => {
      const exists = prev.find((si) => si.menuItemId === menuItemId);
      if (exists) {
        return prev.filter((si) => si.menuItemId !== menuItemId);
      }
      return [...prev, { menuItemId, isRequired: false, isDefault: true, displayOrder: prev.length }];
    });
  };

  const toggleItemFlag = (menuItemId, flag) => {
    setSelectedItems((prev) =>
      prev.map((si) =>
        si.menuItemId === menuItemId ? { ...si, [flag]: !si[flag] } : si
      )
    );
  };

  const saveItems = async () => {
    setSavingItems(true);
    try {
      const items = selectedItems.map((si, idx) => ({
        ...(si.id ? { id: si.id } : {}),
        menuItemId: si.menuItemId,
        isRequired: si.isRequired,
        isDefault: si.isDefault,
        displayOrder: idx,
      }));
      await apiPatch(`/catering/packages/${itemsPkgId}`, { items });
      setItemsModal(false);
      setSuccess("Package items updated.");
      refreshPackage(itemsPkgId);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingItems(false);
    }
  };

  const setPField = (k, v) => setPkgForm((f) => ({ ...f, [k]: v }));
  const setTField = (k, v) => setTierForm((f) => ({ ...f, [k]: v }));

  const menuItemName = (id) => {
    const mi = menuItems.find((m) => m.id === id);
    return mi ? mi.name : id;
  };

  const menuItemCategory = (id) => {
    const mi = menuItems.find((m) => m.id === id);
    return mi ? mi.category : "";
  };

  return (
    <>
      <Head title="Catering Packages" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>Catering Packages</BlockTitle>
              <BlockDes className="text-soft">
                <p>Manage catering packages with serving tiers and included menu items.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openCreatePkg}>
                <Icon name="plus" /> <span>Create Package</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && (
          <Alert color="danger" className="mb-3" toggle={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner />
          </div>
        ) : packages.length === 0 ? (
          <Block>
            <div className="text-center text-soft py-5">
              No packages yet. Click "Create Package" to get started.
            </div>
          </Block>
        ) : (
          packages.map((pkg) => (
            <Block key={pkg.id}>
              <div className="card card-bordered">
                <div className="card-inner">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                      <h5 className="mb-1">{pkg.name}</h5>
                      <div className="d-flex gap-2 align-items-center flex-wrap">
                        <Badge color={pkg.isActive ? "success" : "light"} pill>
                          {pkg.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-soft fs-12px">
                          {pkg.includedMeatCount} meat{pkg.includedMeatCount !== 1 ? "s" : ""},
                          {" "}{pkg.includedSideCount} side{pkg.includedSideCount !== 1 ? "s" : ""},
                          {" "}{pkg.includedSauceCount} sauce{pkg.includedSauceCount !== 1 ? "s" : ""}
                        </span>
                        {pkg.includesRolls && (
                          <Badge color="outline-secondary" className="fs-11px">Rolls</Badge>
                        )}
                        {pkg.includesTea && (
                          <Badge color="outline-secondary" className="fs-11px">Tea</Badge>
                        )}
                        <span className="text-soft fs-12px">
                          {pkg.tiers?.length || 0} tier{(pkg.tiers?.length || 0) !== 1 ? "s" : ""}
                        </span>
                        <span className="text-soft fs-12px">
                          {pkg.items?.length || 0} item{(pkg.items?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <ul className="nk-block-tools g-2 flex-shrink-0">
                      <li>
                        <Button
                          size="sm"
                          outline
                          color="primary"
                          onClick={() => setExpandedPkg(expandedPkg === pkg.id ? null : pkg.id)}
                        >
                          <Icon name={expandedPkg === pkg.id ? "chevron-up" : "chevron-down"} />
                          <span className="ms-1">{expandedPkg === pkg.id ? "Collapse" : "Details"}</span>
                        </Button>
                      </li>
                      <li>
                        <Button size="sm" outline color="primary" onClick={() => openEditPkg(pkg)} title="Edit package">
                          <Icon name="edit" />
                        </Button>
                      </li>
                      <li>
                        <Button size="sm" outline color="danger" onClick={() => openDeletePkg(pkg)} title="Delete package">
                          <Icon name="trash" />
                        </Button>
                      </li>
                    </ul>
                  </div>
                </div>

                {expandedPkg === pkg.id && (
                  <div className="card-inner border-top pt-4">
                    {pkg.description && (
                      <p className="text-soft fs-13px mb-4">{pkg.description}</p>
                    )}

                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Serving Tiers</h6>
                      <Button size="sm" color="primary" onClick={() => openCreateTier(pkg.id)}>
                        <Icon name="plus" /> Add Tier
                      </Button>
                    </div>

                    {(!pkg.tiers || pkg.tiers.length === 0) ? (
                      <p className="text-soft fs-13px mb-4">No serving tiers defined. Click "Add Tier" to create one.</p>
                    ) : (
                      <div className="table-responsive mb-4">
                        <table className="table table-bordered table-sm">
                          <thead className="table-light">
                            <tr>
                              <th>Label</th>
                              <th>Guests (Min–Max)</th>
                              <th>Price/Person</th>
                              <th>Flat Price</th>
                              <th style={{ width: 100 }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(pkg.tiers || [])
                              .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                              .map((tier) => (
                                <tr key={tier.id}>
                                  <td>{tier.tierLabel || "—"}</td>
                                  <td>{tier.minGuests}–{tier.maxGuests}</td>
                                  <td>${Number(tier.pricePerPerson).toFixed(2)}</td>
                                  <td>{tier.flatPrice ? `$${Number(tier.flatPrice).toFixed(2)}` : "—"}</td>
                                  <td>
                                    <Button size="xs" outline color="primary" className="me-1" onClick={() => openEditTier(pkg.id, tier)}>
                                      <Icon name="edit" />
                                    </Button>
                                    <Button size="xs" outline color="danger" onClick={() => removeTier(pkg.id, tier.id)}>
                                      <Icon name="trash" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Included Items</h6>
                      <Button size="sm" color="primary" onClick={() => openManageItems(pkg)}>
                        <Icon name="setting" /> Manage Items
                      </Button>
                    </div>

                    {(!pkg.items || pkg.items.length === 0) ? (
                      <p className="text-soft fs-13px">No items assigned. Click "Manage Items" to select menu items.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-bordered table-sm">
                          <thead className="table-light">
                            <tr>
                              <th>Menu Item</th>
                              <th>Category</th>
                              <th>Required</th>
                              <th>Default</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(pkg.items || [])
                              .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                              .map((pi) => (
                                <tr key={pi.id}>
                                  <td>{pi.menuItem?.name || menuItemName(pi.menuItemId)}</td>
                                  <td>
                                    <Badge color="outline-primary" className="text-uppercase fs-11px">
                                      {pi.menuItem?.category || menuItemCategory(pi.menuItemId)}
                                    </Badge>
                                  </td>
                                  <td>
                                    {pi.isRequired ? (
                                      <Badge color="warning">Required</Badge>
                                    ) : (
                                      <span className="text-soft">No</span>
                                    )}
                                  </td>
                                  <td>
                                    {pi.isDefault ? (
                                      <Badge color="info">Default</Badge>
                                    ) : (
                                      <span className="text-soft">No</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Block>
          ))
        )}
      </Content>

      <Modal isOpen={packageModal} toggle={() => setPackageModal(false)} size="lg">
        <ModalHeader toggle={() => setPackageModal(false)}>
          {editPkg ? "Edit Package" : "Create Package"}
        </ModalHeader>
        <ModalBody>
          {pkgFormError && <Alert color="danger" className="mb-3">{pkgFormError}</Alert>}
          <Row className="g-3">
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <Input
                  value={pkgForm.name}
                  onChange={(e) => {
                    setPField("name", e.target.value);
                    if (!editPkg) setPField("slug", slugify(e.target.value));
                  }}
                  placeholder="e.g. Smokehouse Combo"
                />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Slug</label>
                <Input
                  value={pkgForm.slug}
                  onChange={(e) => setPField("slug", e.target.value)}
                  placeholder="auto-generated from name"
                />
              </div>
            </Col>
            <Col md="12">
              <div className="form-group">
                <label className="form-label">Description</label>
                <Input
                  type="textarea"
                  rows={3}
                  value={pkgForm.description}
                  onChange={(e) => setPField("description", e.target.value)}
                  placeholder="Package description..."
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Included Meats</label>
                <Input
                  type="number"
                  min={0}
                  value={pkgForm.includedMeatCount}
                  onChange={(e) => setPField("includedMeatCount", e.target.value)}
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Included Sides</label>
                <Input
                  type="number"
                  min={0}
                  value={pkgForm.includedSideCount}
                  onChange={(e) => setPField("includedSideCount", e.target.value)}
                />
              </div>
            </Col>
            <Col md="4">
              <div className="form-group">
                <label className="form-label">Included Sauces</label>
                <Input
                  type="number"
                  min={0}
                  value={pkgForm.includedSauceCount}
                  onChange={(e) => setPField("includedSauceCount", e.target.value)}
                />
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label d-block">Includes Rolls</label>
                <div className="custom-control custom-switch mt-1">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="includesRolls"
                    checked={pkgForm.includesRolls}
                    onChange={(e) => setPField("includesRolls", e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="includesRolls">
                    {pkgForm.includesRolls ? "Yes" : "No"}
                  </label>
                </div>
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label d-block">Includes Tea</label>
                <div className="custom-control custom-switch mt-1">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="includesTea"
                    checked={pkgForm.includesTea}
                    onChange={(e) => setPField("includesTea", e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="includesTea">
                    {pkgForm.includesTea ? "Yes" : "No"}
                  </label>
                </div>
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label d-block">Active</label>
                <div className="custom-control custom-switch mt-1">
                  <input
                    type="checkbox"
                    className="custom-control-input"
                    id="pkgIsActive"
                    checked={pkgForm.isActive}
                    onChange={(e) => setPField("isActive", e.target.checked)}
                  />
                  <label className="custom-control-label" htmlFor="pkgIsActive">
                    {pkgForm.isActive ? "Yes" : "No"}
                  </label>
                </div>
              </div>
            </Col>
            <Col md="3">
              <div className="form-group">
                <label className="form-label">Display Order</label>
                <Input
                  type="number"
                  min={0}
                  value={pkgForm.displayOrder}
                  onChange={(e) => setPField("displayOrder", e.target.value)}
                />
              </div>
            </Col>
          </Row>
          <div className="mt-4 d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setPackageModal(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={savePkg} disabled={savingPkg || !pkgForm.name}>
              {savingPkg ? <Spinner size="sm" /> : editPkg ? "Update" : "Create"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)}>
        <ModalHeader toggle={() => setDeleteModal(false)}>Confirm Delete</ModalHeader>
        <ModalBody>
          <p>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <div className="d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button color="danger" onClick={confirmDeletePkg} disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : "Delete"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={tierModal} toggle={() => setTierModal(false)}>
        <ModalHeader toggle={() => setTierModal(false)}>
          {editTier ? "Edit Serving Tier" : "Add Serving Tier"}
        </ModalHeader>
        <ModalBody>
          {tierFormError && <Alert color="danger" className="mb-3">{tierFormError}</Alert>}
          <Row className="g-3">
            <Col md="12">
              <div className="form-group">
                <label className="form-label">Label</label>
                <Input
                  value={tierForm.tierLabel}
                  onChange={(e) => setTField("tierLabel", e.target.value)}
                  placeholder="e.g. Small Party"
                />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Min Guests *</label>
                <Input
                  type="number"
                  min={1}
                  value={tierForm.minGuests}
                  onChange={(e) => setTField("minGuests", e.target.value)}
                />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Max Guests *</label>
                <Input
                  type="number"
                  min={1}
                  value={tierForm.maxGuests}
                  onChange={(e) => setTField("maxGuests", e.target.value)}
                />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Price Per Person *</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={tierForm.pricePerPerson}
                  onChange={(e) => setTField("pricePerPerson", e.target.value)}
                />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Flat Price (optional)</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={tierForm.flatPrice}
                  onChange={(e) => setTField("flatPrice", e.target.value)}
                />
              </div>
            </Col>
            <Col md="6">
              <div className="form-group">
                <label className="form-label">Display Order</label>
                <Input
                  type="number"
                  min={0}
                  value={tierForm.displayOrder}
                  onChange={(e) => setTField("displayOrder", e.target.value)}
                />
              </div>
            </Col>
          </Row>
          <div className="mt-4 d-flex justify-content-end gap-2">
            <Button color="light" onClick={() => setTierModal(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={saveTier}
              disabled={savingTier || !tierForm.minGuests || !tierForm.maxGuests || !tierForm.pricePerPerson}
            >
              {savingTier ? <Spinner size="sm" /> : editTier ? "Update" : "Add"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={itemsModal} toggle={() => setItemsModal(false)} size="lg">
        <ModalHeader toggle={() => setItemsModal(false)}>
          Manage Package Items — {itemsPkg?.name}
        </ModalHeader>
        <ModalBody>
          <p className="text-soft fs-13px mb-3">
            Select which menu items are included in this package. Mark items as "Required" (always included) or "Default" (pre-selected but optional).
          </p>

          {["MEAT", "SIDE", "BREAD", "SAUCE", "DRINK", "DESSERT"].map((cat) => {
            const catItems = menuItems.filter((mi) => mi.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat} className="mb-4">
                <h6 className="text-uppercase text-primary fs-12px mb-2">{cat}S</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0">
                    <tbody>
                      {catItems.map((mi) => {
                        const sel = selectedItems.find((si) => si.menuItemId === mi.id);
                        return (
                          <tr key={mi.id}>
                            <td style={{ width: 40 }}>
                              <div className="custom-control custom-checkbox">
                                <input
                                  type="checkbox"
                                  className="custom-control-input"
                                  id={`mi-${mi.id}`}
                                  checked={!!sel}
                                  onChange={() => toggleItem(mi.id)}
                                />
                                <label className="custom-control-label" htmlFor={`mi-${mi.id}`} />
                              </div>
                            </td>
                            <td>{mi.name}</td>
                            <td style={{ width: 100 }}>
                              {sel && (
                                <div className="custom-control custom-checkbox">
                                  <input
                                    type="checkbox"
                                    className="custom-control-input"
                                    id={`req-${mi.id}`}
                                    checked={sel.isRequired}
                                    onChange={() => toggleItemFlag(mi.id, "isRequired")}
                                  />
                                  <label className="custom-control-label fs-12px" htmlFor={`req-${mi.id}`}>
                                    Required
                                  </label>
                                </div>
                              )}
                            </td>
                            <td style={{ width: 100 }}>
                              {sel && (
                                <div className="custom-control custom-checkbox">
                                  <input
                                    type="checkbox"
                                    className="custom-control-input"
                                    id={`def-${mi.id}`}
                                    checked={sel.isDefault}
                                    onChange={() => toggleItemFlag(mi.id, "isDefault")}
                                  />
                                  <label className="custom-control-label fs-12px" htmlFor={`def-${mi.id}`}>
                                    Default
                                  </label>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="mt-3 d-flex justify-content-between align-items-center">
            <span className="text-soft fs-13px">{selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected</span>
            <div className="d-flex gap-2">
              <Button color="light" onClick={() => setItemsModal(false)}>
                Cancel
              </Button>
              <Button color="primary" onClick={saveItems} disabled={savingItems}>
                {savingItems ? <Spinner size="sm" /> : "Save Items"}
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
};

export default AdminCateringPackages;
