import React, { useState } from 'react';
import { useFileManager } from "../components/Context";
import Files from '../components/Files';
import DatePicker from "react-datepicker";
import { Row, Col, Button } from 'reactstrap';

const Recovery = () => {
  const [dates, setDates] = useState({
    from: new Date(),
    to: new Date(),
  });

  const { fileManager } = useFileManager();

  const files = fileManager.deletedFiles || [];

  return (
    <>
      <Row>
        <Col xl="3" className="order-xl-12">
          <div className={`nk-fmg-filter toggle-expand-content ${fileManager.recoveryFilter ? "expanded" : ""}`}>
            <form>
              <Row>
                <Col lg="12" md="4">
                  <div className="form-group">
                    <label className="form-label">From</label>
                    <div className="form-control-wrap">
                      <DatePicker
                        selected={dates.from}
                        onChange={(date) => setDates({ ...dates, from: date })}
                        className="form-control date-picker"
                      />
                    </div>
                  </div>
                </Col>
                <Col lg="12" md="4">
                  <div className="form-group">
                    <label className="form-label">To</label>
                    <div className="form-control-wrap">
                      <DatePicker
                        selected={dates.to}
                        onChange={(date) => setDates({ ...dates, to: date })}
                        className="form-control date-picker"
                      />
                    </div>
                  </div>
                </Col>
                <Col lg="12">
                  <div className="d-flex justify-between mt-1">
                    <button type="reset" className="link link-sm link-primary ms-n1">
                      Reset Filter
                    </button>
                    <Button color="primary" size="sm">
                      Filter
                    </Button>
                  </div>
                </Col>
              </Row>
            </form>
          </div>
        </Col>
        <Col xl="9" lg="12">
          {files.length === 0 ? (
            <div className="text-muted text-center py-4">No deleted files found.</div>
          ) : (
            <Files files={files} fixedView="list" page="recovery" />
          )}
        </Col>
      </Row>
    </>
  );
};

export default Recovery;
