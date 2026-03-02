import React, { useState, useEffect } from "react";
import Content from "@/layout/content/Content";
import { Card, Badge, Modal, ModalBody, Spinner } from "reactstrap";
import Head from "@/layout/head/Head";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  InputSwitch,
  Button,
  Row,
  Col,
} from "@/components/Component";
import { apiPost } from "@/utils/apiClient";
import UserProfileAside from "./UserProfileAside";

const UserProfileSettingPage = () => {
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const onPwChange = (e) => setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submitChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    try {
      setPwSaving(true);
      setPwError(null);
      await apiPost('/auth/change-password', pwForm);
      setPwSuccess(true);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwError(err.message ?? "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const openPwModal = () => { setPwError(null); setPwSuccess(false); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setPwModal(true); };

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
  }, []);
  
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
              <UserProfileAside updateSm={updateSm}  sm={sm}/>
            </div>
            <div className="card-inner card-inner-lg">
              {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
              <BlockHead size="lg">
                <BlockBetween>
                  <BlockHeadContent>
                    <BlockTitle tag="h4">Security Settings</BlockTitle>
                    <BlockDes>
                      <p>These settings will help you to keep your account secure.</p>
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

              <Block>
                <Card className="card-bordered">
                  <div className="card-inner-group">
                    <div className="card-inner">
                      <div className="between-center flex-wrap flex-md-nowrap g-3">
                        <div className="nk-block-text">
                          <h6>Save my Activity Logs</h6>
                          <p>You can save your all activity logs including unusual activity detected.</p>
                        </div>
                        <div className="nk-block-actions">
                          <ul className="align-center gx-3">
                            <li className="order-md-last">
                              <div className="custom-control custom-switch me-n2">
                                <InputSwitch checked id="activity-log" />
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="card-inner">
                      <div className="between-center flex-wrap g-3">
                        <div className="nk-block-text">
                          <h6>Change Password</h6>
                          <p>Set a unique password to protect your account.</p>
                        </div>
                        <div className="nk-block-actions flex-shrink-sm-0">
                          <ul className="align-center flex-wrap flex-sm-nowrap gx-3 gy-2">
                            <li className="order-md-last">
                              <Button color="primary" onClick={openPwModal}>Change Password</Button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="between-center flex-wrap flex-md-nowrap g-3">
                        <div className="nk-block-text">
                          <h6>
                            2 Factor Auth &nbsp; <Badge color="success" className="ml-0">Enabled</Badge>
                          </h6>
                          <p>
                            Secure your account with 2FA security. When it is activated you will need to enter not only your
                            password, but also a special code using app. You will receive this code via mobile application.{" "}
                          </p>
                        </div>
                        <div className="nk-block-actions">
                          <Button color="primary">Disable</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Block>
            </div>
          </div>
        </Card>
      </Content>
      <Modal isOpen={pwModal} className="modal-dialog-centered" size="md" toggle={() => setPwModal(false)}>
        <a href="#close" onClick={(ev) => { ev.preventDefault(); setPwModal(false); }} className="close">
          <Icon name="cross-sm"></Icon>
        </a>
        <ModalBody>
          <div className="p-2">
            <h5 className="title">Change Password</h5>
            {pwError && <div className="alert alert-danger mt-2">{pwError}</div>}
            {pwSuccess && <div className="alert alert-success mt-2">Password changed successfully!</div>}
            <Row className="gy-4 mt-2">
              <Col size="12">
                <div className="form-group">
                  <label className="form-label" htmlFor="current-password">Current Password</label>
                  <input type="password" id="current-password" className="form-control" name="currentPassword" value={pwForm.currentPassword} onChange={onPwChange} placeholder="Current password" />
                </div>
              </Col>
              <Col size="12">
                <div className="form-group">
                  <label className="form-label" htmlFor="new-password">New Password</label>
                  <input type="password" id="new-password" className="form-control" name="newPassword" value={pwForm.newPassword} onChange={onPwChange} placeholder="Min. 8 characters" />
                </div>
              </Col>
              <Col size="12">
                <div className="form-group">
                  <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                  <input type="password" id="confirm-password" className="form-control" name="confirmPassword" value={pwForm.confirmPassword} onChange={onPwChange} placeholder="Repeat new password" />
                </div>
              </Col>
              <Col size="12">
                <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                  <li>
                    <Button color="primary" size="lg" disabled={pwSaving || pwSuccess} onClick={(ev) => { ev.preventDefault(); submitChangePassword(); }}>
                      {pwSaving ? <Spinner size="sm" /> : "Update Password"}
                    </Button>
                  </li>
                  <li>
                    <a href="#cancel" onClick={(ev) => { ev.preventDefault(); setPwModal(false); }} className="link link-light">Cancel</a>
                  </li>
                </ul>
              </Col>
            </Row>
          </div>
        </ModalBody>
      </Modal>
    </React.Fragment>
  );
};

export default UserProfileSettingPage;
