import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import { Card, Spinner } from "reactstrap";
import Head from "@/layout/head/Head";
import { Modal, ModalBody } from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Row,
  Col,
  Button,
} from "@/components/Component";
import { apiGet, apiPatch } from "@/utils/apiClient";
import { useAuth } from "@/context/AuthContext";
import UserProfileAside from "./UserProfileAside";

const UserProfileRegularPage = () => {
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", phoneNumber: "" });
  const { refreshProfile } = useAuth();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileRes, addrRes] = await Promise.all([
        apiGet('/users/me'),
        apiGet('/users/me/addresses'),
      ]);
      const p = profileRes?.data ?? {};
      setProfile(p);
      setFormData({
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        phoneNumber: p.phoneNumber ?? "",
      });
      setAddresses(addrRes?.data ?? []);
    } catch (err) {
      setError(err.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const onInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitForm = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await apiPatch('/users/me', {
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phoneNumber: formData.phoneNumber || undefined,
      });
      setProfile(res?.data ?? profile);
      await refreshProfile();
      setModal(false);
    } catch (err) {
      setError(err.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // function to change the design view under 990 px
  const viewChange = () => {
    if (window.innerWidth < 990) {
      setMobileView(true);
    } else {
      setMobileView(false);
      updateSm(false);
    }
  };

  useEffect(() => {
    loadData();
    viewChange();
    window.addEventListener("load", viewChange);
    window.addEventListener("resize", viewChange);
    document.getElementsByClassName("nk-header")[0].addEventListener("click", function () {
      updateSm(false);
    });
    return () => {
      window.removeEventListener("resize", viewChange);
      window.removeEventListener("load", viewChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const fullName = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—" : "—";
  const formatAddress = (ua) => {
    if (!ua) return null;
    const a = ua.address;
    const lines = [
      a.addressLine1,
      a.addressLine2,
      [a.city, a.stateProvince, a.postalCode].filter(Boolean).join(", "),
      a.country?.name,
    ].filter(Boolean);
    return lines;
  };
  const addressLines = formatAddress(defaultAddress);
  
  return (
    <React.Fragment>
      <Head title="User List - Profile"></Head>
      <Content>
        <Card className="card-bordered">
          <div className="card-aside-wrap">
            <div
              className={`card-aside card-aside-left user-aside toggle-slide toggle-slide-left toggle-break-lg ${
                sm ? "content-active" : ""
              }`}
            >
              <UserProfileAside updateSm={updateSm} sm={sm} />
            </div>
            <div className="card-inner card-inner-lg">
              {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
              <BlockHead size="lg">
                <BlockBetween>
                  <BlockHeadContent>
                    <BlockTitle tag="h4">Personal Information</BlockTitle>
                    <BlockDes>
                      <p>Basic info, like your name and address, that you use on Nio Platform.</p>
                    </BlockDes>
                  </BlockHeadContent>
                  <BlockHeadContent className="align-self-start d-lg-none">
                    <Button
                      className={`toggle btn btn-icon btn-trigger mt-n1 ${sm ? "active" : ""}`}
                      onClick={() => updateSm(!sm)}
                    >
                      <Icon name="menu-alt-r"></Icon>
                    </Button>
                  </BlockHeadContent>
                </BlockBetween>
              </BlockHead>

              {loading ? (
                <div className="text-center py-4"><Spinner color="primary" /></div>
              ) : (
              <Block>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="nk-data data-list">
                  <div className="data-head">
                    <h6 className="overline-title">Basics</h6>
                  </div>
                  <div className="data-item" onClick={() => setModal(true)}>
                    <div className="data-col">
                      <span className="data-label">Full Name</span>
                      <span className="data-value">{fullName}</span>
                    </div>
                    <div className="data-col data-col-end">
                      <span className="data-more"><Icon name="forward-ios"></Icon></span>
                    </div>
                  </div>
                  <div className="data-item">
                    <div className="data-col">
                      <span className="data-label">Email</span>
                      <span className="data-value">{profile?.emailAddress ?? "—"}</span>
                    </div>
                    <div className="data-col data-col-end">
                      <span className="data-more disable"><Icon name="lock-alt"></Icon></span>
                    </div>
                  </div>
                  <div className="data-item" onClick={() => setModal(true)}>
                    <div className="data-col">
                      <span className="data-label">Phone Number</span>
                      <span className="data-value text-soft">{profile?.phoneNumber || <em className="text-soft">Not set</em>}</span>
                    </div>
                    <div className="data-col data-col-end">
                      <span className="data-more"><Icon name="forward-ios"></Icon></span>
                    </div>
                  </div>
                  {defaultAddress && (
                  <div className="data-item">
                    <div className="data-col">
                      <span className="data-label">Address</span>
                      <span className="data-value">
                        {addressLines.map((line, i) => (
                          <span key={i}>{line}{i < addressLines.length - 1 && <br />}</span>
                        ))}
                      </span>
                    </div>
                    <div className="data-col data-col-end">
                      <span className="data-more disable"><Icon name="map-pin"></Icon></span>
                    </div>
                  </div>
                  )}
                </div>
                <div className="nk-data data-list">
                  <div className="data-head">
                    <h6 className="overline-title">Preferences</h6>
                  </div>
                  <div className="data-item">
                    <div className="data-col">
                      <span className="data-label">Language</span>
                      <span className="data-value">English (United State)</span>
                    </div>
                    <div className="data-col data-col-end">
                      <a
                        href="#language"
                        onClick={(ev) => {
                          ev.preventDefault();
                        }}
                        className="link link-primary"
                      >
                        Change Language
                      </a>
                    </div>
                  </div>
                  <div className="data-item">
                    <div className="data-col">
                      <span className="data-label">Date Format</span>
                      <span className="data-value">MM/DD/YYYY</span>
                    </div>
                    <div className="data-col data-col-end">
                      <a
                        href="#link"
                        onClick={(ev) => {
                          ev.preventDefault();
                        }}
                        className="link link-primary"
                      >
                        Change
                      </a>
                    </div>
                  </div>
                  <div className="data-item">
                    <div className="data-col">
                      <span className="data-label">Timezone</span>
                      <span className="data-value">Bangladesh (GMT +6)</span>
                    </div>
                    <div className="data-col data-col-end">
                      <a
                        href="#link"
                        onClick={(ev) => {
                          ev.preventDefault();
                        }}
                        className="link link-primary"
                      >
                        Change
                      </a>
                    </div>
                  </div>
                </div>
              </Block>
              )}

              <Modal isOpen={modal} className="modal-dialog-centered" size="lg" toggle={() => setModal(false)}>
                <a href="#close" onClick={(ev) => { ev.preventDefault(); setModal(false); }} className="close">
                  <Icon name="cross-sm"></Icon>
                </a>
                <ModalBody>
                  <div className="p-2">
                    <h5 className="title">Update Profile</h5>
                    {error && <div className="alert alert-danger mt-2">{error}</div>}
                    <Row className="gy-4 mt-2">
                      <Col md="6">
                        <div className="form-group">
                          <label className="form-label" htmlFor="first-name">First Name</label>
                          <input
                            type="text"
                            id="first-name"
                            className="form-control"
                            name="firstName"
                            value={formData.firstName}
                            onChange={onInputChange}
                            placeholder="First name"
                          />
                        </div>
                      </Col>
                      <Col md="6">
                        <div className="form-group">
                          <label className="form-label" htmlFor="last-name">Last Name</label>
                          <input
                            type="text"
                            id="last-name"
                            className="form-control"
                            name="lastName"
                            value={formData.lastName}
                            onChange={onInputChange}
                            placeholder="Last name"
                          />
                        </div>
                      </Col>
                      <Col md="6">
                        <div className="form-group">
                          <label className="form-label" htmlFor="phone-no">Phone Number</label>
                          <input
                            type="text"
                            id="phone-no"
                            className="form-control"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={onInputChange}
                            placeholder="e.g. +1 555 000 0000"
                          />
                        </div>
                      </Col>
                      <Col size="12">
                        <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                          <li>
                            <Button
                              color="primary"
                              size="lg"
                              disabled={saving}
                              onClick={(ev) => { ev.preventDefault(); submitForm(); }}
                            >
                              {saving ? <Spinner size="sm" /> : "Update Profile"}
                            </Button>
                          </li>
                          <li>
                            <a href="#cancel" onClick={(ev) => { ev.preventDefault(); setModal(false); }} className="link link-light">
                              Cancel
                            </a>
                          </li>
                        </ul>
                      </Col>
                    </Row>
                  </div>
                </ModalBody>
              </Modal>
            </div>
          </div>
        </Card>
      </Content>
    </React.Fragment>
  );
};

export default UserProfileRegularPage;
