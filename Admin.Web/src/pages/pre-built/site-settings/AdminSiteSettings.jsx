import React, { useState, useEffect, useCallback } from "react";
import { Spinner, Alert } from "reactstrap";
import {
  Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle,
  Row, Col, Button,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { apiGet, apiPatch } from "@/utils/apiClient";

const AdminSiteSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dirty, setDirty] = useState({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/site-settings");
      setSettings(res?.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (settingKey, value) => {
    setDirty((prev) => ({ ...prev, [settingKey]: value }));
    setSuccess(null);
  };

  const getValue = (setting) => {
    if (dirty.hasOwnProperty(setting.settingKey)) {
      return dirty[setting.settingKey];
    }
    return setting.settingValue;
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const keys = Object.keys(dirty);
      for (const key of keys) {
        await apiPatch(`/site-settings/${key}`, {
          settingValue: dirty[key],
        });
      }
      setDirty({});
      setSuccess(`${keys.length} setting(s) saved successfully.`);
      await loadSettings();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const grouped = settings.reduce((acc, s) => {
    const cat = s.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const categoryLabels = {
    header: "Header & Banner Settings",
    general: "General Settings",
  };

  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <>
      <Head title="Site Settings" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Site Settings
              </BlockTitle>
              <p className="text-soft">Manage dynamic text and configuration values displayed on the storefront.</p>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button
                color="primary"
                disabled={!hasDirty || saving}
                onClick={saveAll}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="me-1" /> Saving…
                  </>
                ) : (
                  <>
                    <em className="icon ni ni-save me-1"></em> Save Changes
                  </>
                )}
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {error && (
          <Alert color="danger" className="mb-3">
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="success" className="mb-3">
            {success}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner />
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <Block key={category}>
              <div className="card card-bordered">
                <div className="card-inner-group">
                  <div className="card-inner">
                    <h6 className="overline-title-alt mb-0">
                      {categoryLabels[category] || category}
                    </h6>
                  </div>
                  {items.map((setting) => (
                    <div key={setting.id} className="card-inner">
                      <Row className="align-items-center">
                        <Col md="4">
                          <label className="form-label mb-0 fw-medium">
                            {setting.label || setting.settingKey}
                          </label>
                          <span className="d-block text-soft fs-12px">
                            Key: <code>{setting.settingKey}</code>
                          </span>
                        </Col>
                        <Col md="8">
                          {setting.settingValue && setting.settingValue.length > 80 ? (
                            <textarea
                              className="form-control"
                              rows={3}
                              value={getValue(setting)}
                              onChange={(e) =>
                                handleChange(setting.settingKey, e.target.value)
                              }
                            />
                          ) : (
                            <input
                              type="text"
                              className="form-control"
                              value={getValue(setting)}
                              onChange={(e) =>
                                handleChange(setting.settingKey, e.target.value)
                              }
                            />
                          )}
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
              </div>
            </Block>
          ))
        )}
      </Content>
    </>
  );
};

export default AdminSiteSettings;
