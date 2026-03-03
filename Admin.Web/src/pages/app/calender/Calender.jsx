import React, { useState, useEffect } from "react";
import ContentAlt from "@/layout/content/ContentAlt";
import Head from "@/layout/head/Head";
import CalenderApp from "@/components/partials/calender/Calender";
import DatePicker from "react-datepicker";
import { Modal, ModalBody, ModalHeader, Button, Spinner } from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Col,
  Icon,
  PreviewAltCard,
  Row,
  RSelect,
} from "@/components/Component";
import { useForm } from "react-hook-form";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/apiClient";

// ─── Event type → FullCalendar CSS class mapping ─────────────────────────────
const EVENT_TYPE_OPTIONS = [
  { value: "truck_stop", label: "🚚 Truck Stop", className: "fc-event-primary" },
  { value: "catering",   label: "🍽 Catering",   className: "fc-event-success" },
  { value: "festival",   label: "🎪 Festival",   className: "fc-event-warning" },
  { value: "private",    label: "🔒 Private",    className: "fc-event-danger"  },
];

const CLASS_TO_TYPE = Object.fromEntries(EVENT_TYPE_OPTIONS.map((o) => [o.className, o]));

/** Merge a DatePicker date + a DatePicker time into one ISO string for the API */
const combineDT = (date, time) => {
  const d = new Date(date);
  const t = new Date(time);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.toISOString();
};

/** Map a raw API ScheduleEvent → FullCalendar event shape */
const toCalEvent = (e) => {
  const opt = EVENT_TYPE_OPTIONS.find((o) => o.value === e.eventType) ?? EVENT_TYPE_OPTIONS[0];
  return {
    id: e.id,
    title: e.title,
    start: e.startTime,
    end: e.endTime ?? undefined,
    description: e.description ?? "",
    className: opt.className,
    type: { value: opt.className, label: opt.label },
  };
};

const Calender = () => {
  const [modal, setModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    endDate: new Date(),
    eventType: EVENT_TYPE_OPTIONS[0],
    locationId: null,
  });
  const { reset, register, handleSubmit, formState: { errors } } = useForm();

  const toggle = () => setModal((m) => !m);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      startDate: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      endDate: new Date(),
      eventType: EVENT_TYPE_OPTIONS[0],
      locationId: null,
    });
  };

  const onFormCancel = () => {
    setModal(false);
    resetForm();
  };

  // ── Load events + locations on mount ────────────────────────────────────────
  useEffect(() => {
    apiGet("/locations/events?limit=100").then((res) => {
      setEvents((res?.data ?? []).map(toCalEvent));
    }).catch((err) => console.error("Failed to load events", err));

    apiGet("/locations?limit=100").then((res) => {
      setLocations((res?.data ?? []).map((l) => ({ value: l.id, label: l.name })));
    }).catch((err) => console.error("Failed to load locations", err));
  }, []);

  useEffect(() => {
    reset(formData);
  }, [formData]);

  // ── Create event ─────────────────────────────────────────────────────────────
  const handleFormSubmit = async () => {
    if (!formData.locationId) return;
    setSaving(true);
    try {
      const payload = {
        locationId: formData.locationId.value,
        title: formData.title,
        eventType: formData.eventType?.value ?? "truck_stop",
        startTime: combineDT(formData.startDate, formData.startTime),
        endTime: combineDT(formData.endDate, formData.endTime),
        description: formData.description,
        isPublic: true,
      };
      const res = await apiPost("/locations/events", payload);
      const newEv = toCalEvent(res?.data ?? res);
      setEvents((prev) => [...prev, newEv]);
      toggle();
      resetForm();
    } catch (err) {
      console.error("Failed to create event", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit event (called by inner CalenderApp after inline edit) ───────────────
  const editEvent = async (ev) => {
    try {
      const typeOpt = CLASS_TO_TYPE[ev.className];
      const res = await apiPatch(`/locations/events/${ev.id}`, {
        title: ev.title,
        description: ev.description,
        ...(typeOpt ? { eventType: typeOpt.value } : {}),
      });
      const updated = toCalEvent(res?.data ?? res);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      console.error("Failed to update event", err);
    }
  };

  // ── Date cell click → pre-fill form and open "Add Event" modal ──────────────
  const handleDateClick = (date, allDay) => {
    const start = new Date(date);
    // For all-day clicks use midnight; for time-grid clicks use the exact slot
    const startTime = allDay ? (() => { const t = new Date(); t.setSeconds(0, 0); return t; })() : start;
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setFormData((prev) => ({
      ...prev,
      startDate: start,
      startTime,
      endDate: end,
      endTime: end,
    }));
    setModal(true);
  };

  // ── Delete event ─────────────────────────────────────────────────────────────
  const deleteEvent = async (id) => {
    try {
      await apiDelete(`/locations/events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete event", err);
    }
  };

  return (
    <React.Fragment>
      <Head title="Calender" />
      <ContentAlt>
        <Block>
          <PreviewAltCard className="bg-white" bodyClass="py-3 border-bottom border-light rounded-0">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page>Calendar</BlockTitle>
                </BlockHeadContent>
                <BlockHeadContent>
                  <Button color="primary" onClick={toggle}>
                    <Icon name="plus" />
                    <span>Add Event</span>
                  </Button>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>
          </PreviewAltCard>

          <PreviewAltCard className="mt-0">
            <CalenderApp events={events} onDelete={deleteEvent} onEdit={editEvent} onDateClick={handleDateClick} />
          </PreviewAltCard>
        </Block>
      </ContentAlt>

      <Modal isOpen={modal} toggle={() => onFormCancel()} className="modal-md">
        <ModalHeader toggle={() => onFormCancel()}>Add Event</ModalHeader>
        <ModalBody>
          <form className="form-validate is-alter" onSubmit={handleSubmit(handleFormSubmit)}>
            <Row className="gx-4 gy-3">
              <Col size="12">
                <div className="form-group">
                  <label className="form-label" htmlFor="event-title">
                    Event Title
                  </label>
                  <div className="form-control-wrap">
                    <input
                      type="text"
                      id="event-title"
                      {...register('title', { required: true })}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="form-control" />
                    {errors.title && <p className="invalid">This field is required</p>}
                  </div>
                </div>
              </Col>
              <Col sm="6">
                <div className="form-group">
                  <label className="form-label">Start Date &amp; Time</label>
                  <Row className="gx-2">
                    <div className="w-55">
                      <div className="form-control-wrap">
                        <DatePicker
                          selected={formData.startDate}
                          onChange={(date) => setFormData({ ...formData, startDate: date })}
                          className="form-control date-picker"
                        />
                      </div>
                    </div>
                    <div className="w-45">
                      <div className="form-control-wrap has-timepicker">
                        <DatePicker
                          selected={formData.startTime}
                          onChange={(date) => setFormData({ ...formData, startTime: date })}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeCaption="Time"
                          dateFormat="h:mm aa"
                          className="form-control date-picker"
                        />
                      </div>
                    </div>
                  </Row>
                </div>
              </Col>
              <Col sm="6">
                <div className="form-group">
                  <label className="form-label">End Date &amp; Time</label>
                  <Row className="gx-2">
                    <div className="w-55">
                      <div className="form-control-wrap">
                        <DatePicker
                          selected={formData.endDate}
                          onChange={(date) => setFormData({ ...formData, endDate: date })}
                          className="form-control date-picker"
                          minDate={formData.startDate}
                        />
                      </div>
                    </div>
                    <div className="w-45">
                      <div className="form-control-wrap has-timepicker">
                        <DatePicker
                          selected={formData.endTime}
                          onChange={(date) => setFormData({ ...formData, endTime: date })}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeCaption="Time"
                          dateFormat="h:mm aa"
                          className="form-control date-picker"
                        />
                      </div>
                    </div>
                  </Row>
                </div>
              </Col>
              <Col size="12">
                <div className="form-group">
                  <label className="form-label" htmlFor="event-description">
                    Event Description
                  </label>
                  <div className="form-control-wrap">
                    <textarea
                      className="form-control"
                      id="event-description"
                      {...register('description', { required: true })}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      ></textarea>

                    {errors.description && <p className="invalid">This field is required</p>}
                  </div>
                </div>
              </Col>
              <Col size="12">
                <div className="form-group">
                  <label className="form-label">Event Type</label>
                  <div className="form-control-wrap">
                    <RSelect
                      options={EVENT_TYPE_OPTIONS}
                      value={formData.eventType}
                      onChange={(selected) => setFormData({ ...formData, eventType: selected })}
                    />
                  </div>
                </div>
              </Col>
              <Col size="12">
                <div className="form-group">
                  <label className="form-label">
                    Location <span className="text-danger">*</span>
                  </label>
                  <div className="form-control-wrap">
                    <RSelect
                      options={locations}
                      value={formData.locationId}
                      placeholder="Select a location…"
                      onChange={(selected) => setFormData({ ...formData, locationId: selected })}
                    />
                    {!formData.locationId && saving && (
                      <p className="invalid">Please select a location</p>
                    )}
                  </div>
                </div>
              </Col>
              <Col size="12">
                <ul className="d-flex justify-content-between gx-4 mt-1">
                  <li>
                    <Button type="submit" color="primary" disabled={saving}>
                      {saving ? <Spinner size="sm" /> : "Add Event"}
                    </Button>
                  </li>
                  <li>
                    <Button color="danger" className="btn-dim" onClick={() => onFormCancel()}>
                      Discard
                    </Button>
                  </li>
                </ul>
              </Col>
            </Row>
          </form>
        </ModalBody>
      </Modal>
    </React.Fragment>
  );
};
export default Calender;
