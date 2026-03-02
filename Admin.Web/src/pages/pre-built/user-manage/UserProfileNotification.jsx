import React, { useState, useEffect, useCallback } from "react";
import Content from "@/layout/content/Content";
import { Card, Spinner } from "reactstrap";
import Head from "@/layout/head/Head";
import {
  BlockBetween,
  BlockContent,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  InputSwitch,
  Button,
} from "@/components/Component";
import { apiGet, apiPatch } from "@/utils/apiClient";
import UserProfileAside from "./UserProfileAside";

const UserProfileNotificationPage = () => {
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({ optInEmail: false, optInSms: false });
  const [saving, setSaving] = useState({ optInEmail: false, optInSms: false });
  const [error, setError] = useState(null);

  const loadPrefs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet('/users/me/contact-preferences');
      const d = res?.data ?? {};
      setPrefs({ optInEmail: d.optInEmail ?? false, optInSms: d.optInSms ?? false });
    } catch (err) {
      setError(err.message ?? "Failed to load notification preferences.");
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePref = async (key) => {
    const newVal = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: newVal }));
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await apiPatch('/users/me/contact-preferences', { [key]: newVal });
    } catch {
      // revert on failure
      setPrefs((prev) => ({ ...prev, [key]: !newVal }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
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
    loadPrefs();
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
              <UserProfileAside updateSm={updateSm}  sm={sm} />
            </div>
            <div className="card-inner card-inner-lg">
              {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
              <BlockHead size="lg">
                <BlockBetween>
                  <BlockHeadContent>
                    <BlockTitle tag="h4">Notification Settings</BlockTitle>
                    <BlockDes>
                      <p>You will get only notification what have enabled.</p>
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
                <>
                  {error && <div className="alert alert-danger mx-4">{error}</div>}

                  <BlockHead size="sm">
                    <BlockBetween>
                      <BlockHeadContent>
                        <BlockTitle tag="h6">Email Notifications</BlockTitle>
                        <BlockDes>
                          <p>Receive updates, order confirmations, and news via email.</p>
                        </BlockDes>
                      </BlockHeadContent>
                    </BlockBetween>
                  </BlockHead>

                  <BlockContent>
                    <div className="gy-3">
                      <div className="g-item">
                        <div className="custom-control custom-switch d-flex align-items-center gap-2">
                          <InputSwitch
                            id="opt-in-email"
                            checked={prefs.optInEmail}
                            onChange={() => togglePref("optInEmail")}
                            label="Opt in to email notifications"
                          />
                          {saving.optInEmail && <Spinner size="sm" className="ms-2" />}
                        </div>
                      </div>
                    </div>
                  </BlockContent>

                  <BlockHead size="sm">
                    <BlockBetween>
                      <BlockHeadContent>
                        <BlockTitle tag="h6">SMS Notifications</BlockTitle>
                        <BlockDes>
                          <p>Receive text message alerts for orders and account activity.</p>
                        </BlockDes>
                      </BlockHeadContent>
                    </BlockBetween>
                  </BlockHead>

                  <BlockContent>
                    <div className="gy-3">
                      <div className="g-item">
                        <div className="custom-control custom-switch d-flex align-items-center gap-2">
                          <InputSwitch
                            id="opt-in-sms"
                            checked={prefs.optInSms}
                            onChange={() => togglePref("optInSms")}
                            label="Opt in to SMS notifications"
                          />
                          {saving.optInSms && <Spinner size="sm" className="ms-2" />}
                        </div>
                      </div>
                    </div>
                  </BlockContent>
                </>
              )}
            </div>
          </div>
        </Card>
      </Content>
    </React.Fragment>
  );
};

export default UserProfileNotificationPage;
