import React, { useState, useEffect, useCallback } from "react";
import Dropzone from "react-dropzone";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Badge, Modal, ModalBody, Spinner } from "reactstrap";
import {
  Block, BlockBetween, BlockDes, BlockHead, BlockHeadContent, BlockTitle,
  Icon, Row, Col,
  Button, RSelect,
} from "@/components/Component";
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from "@/utils/apiClient";
import { toast } from "react-toastify";

async function getAllPages(path) {
  const records = [];
  let page = 1;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await apiGet(`${path}${separator}page=${page}&limit=100`);
    const pageRecords = response?.data ?? [];
    records.push(...pageRecords);

    const total = response?.meta?.total;
    if (!Number.isFinite(total) || records.length >= total || pageRecords.length === 0) {
      return records;
    }
    page += 1;
  }
}

function isLiveNow(campaign) {
  if (!campaign.isActive) return false;
  const now = Date.now();
  if (campaign.startsAt && new Date(campaign.startsAt).getTime() > now) return false;
  if (campaign.endsAt && new Date(campaign.endsAt).getTime() <= now) return false;
  return true;
}

const AdminKioskMarketing = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [products, setProducts] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);

  const [editModal, setEditModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    title: "",
    body: "",
    campaignType: "upsell",
    isActive: false,
    startsAt: "",
    endsAt: "",
    priority: "0",
    amountOff: "",
    mediaAssetId: null,
    durationSeconds: "10",
    allKiosks: true,
    productIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const camps = await apiGet("/kiosk/campaigns");
      setCampaigns(camps?.data ?? camps ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssets = useCallback(async () => {
    try {
      const [productRecords, mediaRecords] = await Promise.all([
        getAllPages("/products?visibility=all"),
        getAllPages("/media?mediaType=image")
      ]);
      setProducts(productRecords);
      setMediaAssets(mediaRecords);
    } catch (e) {
      console.error("Failed to load products/media", e);
      toast.error(`Products and media could not be loaded: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadAssets();
  }, [loadData, loadAssets]);

  const openAddModal = () => {
    setEditCampaign(null);
    setFormValues({
      name: "",
      description: "",
      title: "",
      body: "",
      campaignType: "upsell",
      isActive: false,
      startsAt: "",
      endsAt: "",
      priority: "0",
      amountOff: "",
      mediaAssetId: null,
      durationSeconds: "10",
      allKiosks: true,
      productIds: [],
    });
    setFormError(null);
    setEditModal(true);
  };

  const openEditModal = (camp) => {
    setEditCampaign(camp);
    setFormValues({
      name: camp.name || "",
      description: camp.description || "",
      title: camp.title || "",
      body: camp.body || "",
      campaignType: camp.campaignType || "upsell",
      isActive: camp.isActive || false,
      startsAt: camp.startsAt ? camp.startsAt.substring(0, 16) : "",
      endsAt: camp.endsAt ? camp.endsAt.substring(0, 16) : "",
      priority: camp.priority != null ? String(camp.priority) : "0",
      amountOff: camp.amountOff != null ? String(camp.amountOff) : "",
      mediaAssetId: camp.mediaAssetId
        ? { value: camp.mediaAssetId, label: mediaAssets.find(m => m.id === camp.mediaAssetId)?.altText || camp.mediaAssetId }
        : null,
      durationSeconds: camp.durationSeconds != null ? String(camp.durationSeconds) : "10",
      allKiosks: camp.allKiosks ?? true,
      productIds: camp.products ? camp.products.map(p => ({ value: p.id, label: p.name })) : [],
    });
    setFormError(null);
    setEditModal(true);
  };

  const handleDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadingImage(true);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "media");
      const res = await apiUpload("/media/upload", fd);
      const uploaded = res?.data ?? res;
      if (uploaded?.id) {
        setMediaAssets((prev) => [uploaded, ...prev]);
        setFormValues((prev) => ({
          ...prev,
          mediaAssetId: { value: uploaded.id, label: uploaded.altText || uploaded.url.split("/").pop() }
        }));
      } else {
        throw new Error("The image uploaded, but the media record was not returned.");
      }
    } catch (e) {
      setFormError(e.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    if (!formValues.name) return "Name is required";
    if (formValues.campaignType === "upsell") {
      if (!formValues.amountOff || Number(formValues.amountOff) <= 0) {
        return "Upsell campaigns require a positive discount amount";
      }
      if (formValues.isActive && formValues.productIds.length === 0) {
        return "Active upsell campaigns require at least one product";
      }
    } else if (formValues.campaignType === "post_sale_ad") {
      if (!formValues.mediaAssetId) {
        return "Post-sale ads require an image media asset";
      }
      if (!formValues.durationSeconds || Number(formValues.durationSeconds) < 1) {
        return "Duration must be at least 1 second";
      }
    }
    if (formValues.startsAt && formValues.endsAt && new Date(formValues.endsAt) <= new Date(formValues.startsAt)) {
      return "End time must be after the start time";
    }
    return null;
  };

  const saveForm = async () => {
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload = {
      name: formValues.name,
      description: formValues.description || null,
      title: formValues.title || null,
      body: formValues.body || null,
      campaignType: formValues.campaignType,
      isActive: formValues.isActive,
      startsAt: formValues.startsAt ? new Date(formValues.startsAt).toISOString() : null,
      endsAt: formValues.endsAt ? new Date(formValues.endsAt).toISOString() : null,
      priority: parseInt(formValues.priority, 10) || 0,
      amountOff: formValues.amountOff ? parseFloat(formValues.amountOff) : null,
      mediaAssetId: formValues.mediaAssetId?.value || null,
      durationSeconds: parseInt(formValues.durationSeconds, 10) || 10,
      allKiosks: formValues.allKiosks,
      productIds: formValues.productIds.map((p) => p.value),
    };

    try {
      if (editCampaign) {
        await apiPatch(`/kiosk/campaigns/${editCampaign.id}`, payload);
        toast.success("Campaign updated successfully");
      } else {
        await apiPost("/kiosk/campaigns", payload);
        toast.success("Campaign created successfully");
      }
      setEditModal(false);
      loadData();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/kiosk/campaigns/${deleteTarget.id}`);
      setDeleteModal(false);
      setDeleteTarget(null);
      toast.success("Campaign deleted");
      loadData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderCard = (camp) => {
    const isUpsell = camp.campaignType === "upsell";
    return (
      <Col sm="6" lg="4" key={camp.id} className="mb-4">
        <div className="card card-bordered h-100">
          {camp.imageUrl ? (
            <img
              src={camp.imageUrl}
              className="card-img-top"
              alt="Campaign"
              style={{ height: "180px", objectFit: "cover" }}
            />
          ) : (
            <div
              className="card-img-top bg-light d-flex align-items-center justify-content-center"
              style={{ height: "180px" }}
            >
              <Icon name="img" style={{ fontSize: "3rem", color: "#ccc" }} />
            </div>
          )}
          <div className="card-inner d-flex flex-column">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <Badge color={isUpsell ? "primary" : "secondary"} className="text-uppercase">
                {isUpsell ? "Upsell Offer" : "Post-Sale Ad"}
              </Badge>
              {camp.priority > 0 && (
                <Badge color="outline-primary" className="text-uppercase">
                  High Priority
                </Badge>
              )}
            </div>
            <h5 className="card-title text-uppercase mb-1">{camp.name}</h5>
            {camp.description && <p className="text-soft small mb-3">{camp.description}</p>}

            <div className="mt-auto pt-3 border-top">
              <Row className="g-2 text-sm">
                {isUpsell && camp.amountOff && (
                  <Col xs="12" className="d-flex align-items-center text-primary font-weight-bold">
                    <Icon name="tag" className="me-1" />
                    ${Number(camp.amountOff).toFixed(2)} OFF
                  </Col>
                )}
                <Col xs="12" className="d-flex align-items-center text-soft">
                  <Icon name="calendar" className="me-1" />
                  {camp.startsAt || camp.endsAt ? (
                    <>
                      {camp.startsAt ? new Date(camp.startsAt).toLocaleDateString() : "Now"} -{" "}
                      {camp.endsAt ? new Date(camp.endsAt).toLocaleDateString() : "Forever"}
                    </>
                  ) : (
                    "Runs indefinitely"
                  )}
                </Col>
                {!isUpsell && (
                  <Col xs="12" className="d-flex align-items-center text-soft">
                    <Icon name="clock" className="me-1" />
                    Shows for {camp.durationSeconds}s
                  </Col>
                )}
              </Row>
            </div>
            
            <div className="d-flex justify-content-end mt-3">
              <Button color="light" size="sm" className="btn-icon me-2" onClick={() => openEditModal(camp)}>
                <Icon name="edit" />
              </Button>
              <Button
                color="danger"
                size="sm"
                className="btn-icon btn-dim"
                onClick={() => {
                  setDeleteTarget(camp);
                  setDeleteModal(true);
                }}
              >
                <Icon name="trash" />
              </Button>
            </div>
          </div>
        </div>
      </Col>
    );
  };

  const activeCamps = campaigns.filter(isLiveNow);
  const inactiveCamps = campaigns.filter((c) => !isLiveNow(c));

  return (
    <React.Fragment>
      <Head title="Kiosk Marketing" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page className="text-uppercase">Kiosk Marketing</BlockTitle>
              <BlockDes className="text-soft">
                <p>Manage upsells and post-sale ads across all kiosk devices.</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="primary" onClick={openAddModal} className="text-uppercase">
                <Icon name="plus" />
                <span>New Campaign</span>
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
          </div>
        ) : error ? (
          <div className="text-center text-danger py-5">{error}</div>
        ) : (
          <>
            <Block>
              <div className="d-flex align-items-center mb-3">
                <div className="bg-success rounded-circle me-2" style={{ width: 10, height: 10 }}></div>
                <h5 className="text-uppercase mb-0 text-success">Live Now</h5>
              </div>
              {activeCamps.length === 0 ? (
                <div className="card card-bordered card-dashed text-center py-5 mb-4 text-soft">
                  <Icon name="monitor" className="fs-1 mb-2 opacity-50" />
                  <p>No active campaigns running on kiosks.</p>
                </div>
              ) : (
                <Row className="g-gs">{activeCamps.map(renderCard)}</Row>
              )}
            </Block>

            <Block className="mt-5">
              <div className="d-flex align-items-center mb-3 text-soft">
                <div className="bg-secondary rounded-circle me-2" style={{ width: 10, height: 10 }}></div>
                <h5 className="text-uppercase mb-0 text-secondary">Scheduled & Drafts</h5>
              </div>
              {inactiveCamps.length === 0 ? (
                <p className="text-soft text-center py-4 fst-italic">No inactive campaigns.</p>
              ) : (
                <Row className="g-gs">{inactiveCamps.map(renderCard)}</Row>
              )}
            </Block>
          </>
        )}
      </Content>

      <Modal isOpen={editModal} toggle={() => setEditModal(false)} size="lg">
        <ModalBody>
          <a
            href="#cancel"
            onClick={(e) => {
              e.preventDefault();
              setEditModal(false);
            }}
            className="close"
          >
            <Icon name="cross-sm"></Icon>
          </a>
          <div className="p-2">
            <h5 className="title mb-4 text-uppercase">
              {editCampaign ? "Edit Campaign" : "New Campaign"}
            </h5>

            {formError && <div className="alert alert-danger mb-4">{formError}</div>}

            <Row className="g-4">
              <Col md="12">
                <div className="form-group">
                  <label className="form-label">Internal Name</label>
                  <div className="form-control-wrap">
                    <input
                      type="text"
                      className="form-control"
                      value={formValues.name}
                      onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                      placeholder="e.g. Summer Drink Upsell"
                    />
                  </div>
                </div>
              </Col>

              <Col md="12">
                <div className="form-group">
                  <label className="form-label">Internal Description</label>
                  <div className="form-control-wrap">
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formValues.description}
                      onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                      placeholder="Optional notes for staff"
                    ></textarea>
                  </div>
                </div>
              </Col>
              
              <Col md="6">
                <div className="form-group">
                  <label className="form-label">Campaign Type</label>
                  <div className="form-control-wrap">
                    <select
                      className="form-select"
                      value={formValues.campaignType}
                      onChange={(e) => setFormValues({ ...formValues, campaignType: e.target.value })}
                    >
                      <option value="upsell">Checkout Upsell</option>
                      <option value="post_sale_ad">Post-Sale Ad</option>
                    </select>
                  </div>
                </div>
              </Col>

              <Col md="6">
                <div className="form-group d-flex h-100 align-items-end">
                  <div className="custom-control custom-switch">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="isActiveSwitch"
                      checked={formValues.isActive}
                      onChange={(e) => setFormValues({ ...formValues, isActive: e.target.checked })}
                    />
                    <label className="custom-control-label" htmlFor="isActiveSwitch">
                      Active (Broadcast to Kiosks)
                    </label>
                  </div>
                </div>
              </Col>

              <Col md="6">
                <div className="form-group">
                  <label className="form-label">Starts At</label>
                  <div className="form-control-wrap">
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formValues.startsAt}
                      onChange={(e) => setFormValues({ ...formValues, startsAt: e.target.value })}
                    />
                  </div>
                  <div className="form-note">Leave blank to start immediately</div>
                </div>
              </Col>

              <Col md="6">
                <div className="form-group">
                  <label className="form-label">Ends At</label>
                  <div className="form-control-wrap">
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formValues.endsAt}
                      onChange={(e) => setFormValues({ ...formValues, endsAt: e.target.value })}
                    />
                  </div>
                  <div className="form-note">Leave blank to run indefinitely</div>
                </div>
              </Col>

              {formValues.campaignType === "upsell" && (
                <Col md="12">
                  <div className="card card-bordered card-inner bg-light mt-3">
                    <h6 className="title text-uppercase text-primary mb-3">Upsell Configuration</h6>
                    <Row className="g-4">
                      <Col md="6">
                        <div className="form-group">
                          <label className="form-label">Discount Amount ($)</label>
                          <div className="form-control-wrap">
                            <input
                              type="number"
                              step="0.01"
                              className="form-control"
                              value={formValues.amountOff}
                              onChange={(e) => setFormValues({ ...formValues, amountOff: e.target.value })}
                            />
                          </div>
                        </div>
                      </Col>
                      <Col md="6">
                        <div className="form-group">
                          <label className="form-label">Priority (Higher runs first)</label>
                          <div className="form-control-wrap">
                            <input
                              type="number"
                              className="form-control"
                              value={formValues.priority}
                              onChange={(e) => setFormValues({ ...formValues, priority: e.target.value })}
                            />
                          </div>
                        </div>
                      </Col>
                      <Col md="12">
                        <div className="form-group">
                          <label className="form-label">Target Products</label>
                          <div className="form-control-wrap">
                            <RSelect
                              options={products.map(p => ({ value: p.id, label: p.name }))}
                              isMulti
                              value={formValues.productIds}
                              onChange={(selected) => setFormValues({ ...formValues, productIds: selected || [] })}
                              placeholder="Select products..."
                            />
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Col>
              )}

              {formValues.campaignType === "post_sale_ad" && (
                <Col md="12">
                  <div className="card card-bordered card-inner bg-light mt-3">
                    <h6 className="title text-uppercase text-primary mb-3">Post-Sale Ad Configuration</h6>
                    <Row className="g-4">
                      <Col md="12">
                        <div className="form-group">
                          <label className="form-label">Graphic Asset</label>
                          <div className="form-control-wrap d-flex gap-2 align-items-center">
                            <div className="flex-grow-1">
                              <RSelect
                                options={mediaAssets.map(m => ({ value: m.id, label: m.altText || m.url.split("/").pop() }))}
                                value={formValues.mediaAssetId}
                                onChange={(opt) => setFormValues({ ...formValues, mediaAssetId: opt })}
                                placeholder="Select image asset..."
                              />
                            </div>
                            <Dropzone onDrop={handleDrop} accept={{ "image/*": [] }} multiple={false}>
                              {({ getRootProps, getInputProps }) => (
                                <div {...getRootProps()} className="btn btn-outline-primary d-flex align-items-center flex-shrink-0">
                                  <input {...getInputProps()} />
                                  {uploadingImage ? <Spinner size="sm" /> : <><Icon name="upload" className="me-1"/> Upload</>}
                                </div>
                              )}
                            </Dropzone>
                          </div>
                        </div>
                      </Col>
                      <Col md="6">
                        <div className="form-group">
                          <label className="form-label">Duration (seconds)</label>
                          <div className="form-control-wrap">
                            <input
                              type="number"
                              className="form-control"
                              value={formValues.durationSeconds}
                              onChange={(e) => setFormValues({ ...formValues, durationSeconds: e.target.value })}
                            />
                          </div>
                        </div>
                      </Col>
                      <Col md="6">
                        <div className="form-group">
                          <label className="form-label">Priority</label>
                          <div className="form-control-wrap">
                            <input
                              type="number"
                              className="form-control"
                              value={formValues.priority}
                              onChange={(e) => setFormValues({ ...formValues, priority: e.target.value })}
                            />
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Col>
              )}

              <Col md="12">
                <div className="mt-2">
                  <h6 className="title text-uppercase text-soft mb-3">Customer Copy</h6>
                </div>
                <Row className="g-4">
                  <Col md="12">
                    <div className="form-group">
                      <label className="form-label">Headline</label>
                      <div className="form-control-wrap">
                        <input
                          type="text"
                          className="form-control"
                          value={formValues.title}
                          onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                          placeholder="e.g. Thirsty?"
                        />
                      </div>
                    </div>
                  </Col>
                  <Col md="12">
                    <div className="form-group">
                      <label className="form-label">Body Text</label>
                      <div className="form-control-wrap">
                        <textarea
                          className="form-control"
                          rows="3"
                          value={formValues.body}
                          onChange={(e) => setFormValues({ ...formValues, body: e.target.value })}
                          placeholder="e.g. Add an iced tea now and save $1."
                        ></textarea>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>

            </Row>
            
            <div className="mt-5 d-flex justify-content-end gap-2">
              <Button color="light" onClick={() => setEditModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button color="primary" onClick={saveForm} disabled={saving}>
                {saving ? <Spinner size="sm" /> : (editCampaign ? "Save Changes" : "Create Campaign")}
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} size="sm">
        <ModalBody className="p-4 text-center">
          <Icon name="alert-circle" className="text-danger mb-3" style={{ fontSize: "3rem" }} />
          <h5 className="title mb-3">Delete Campaign?</h5>
          <p className="text-soft">Are you sure you want to delete this campaign? This action cannot be undone.</p>
          <div className="mt-4 d-flex justify-content-center gap-2">
            <Button color="light" onClick={() => setDeleteModal(false)} disabled={deleteLoading}>Cancel</Button>
            <Button color="danger" onClick={doDelete} disabled={deleteLoading}>
              {deleteLoading ? <Spinner size="sm" /> : "Delete"}
            </Button>
          </div>
        </ModalBody>
      </Modal>

    </React.Fragment>
  );
};

export default AdminKioskMarketing;
