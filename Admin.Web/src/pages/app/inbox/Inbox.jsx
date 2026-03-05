import React, { useState, useEffect, useCallback } from "react";
import Head from "@/layout/head/Head";
import ContentAlt from "@/layout/content/ContentAlt";
import InboxAside from "./InboxAside";
import InboxBody from "./InboxBody";
import { inboxLabels, contacts } from "./InboxData";
import { apiGet } from "@/utils/apiClient";

const mailboxNavData = [
  { name: "Inbox", icon: "inbox", badge: { theme: "primary" } },
  { name: "Sent",  icon: "send",  badge: null },
  { name: "Trash", icon: "trash", badge: null },
];

/** Strip HTML tags to get a plain-text preview */
const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
};

/** Transform a MessageOutbox (sent) record into the shape the inbox components expect */
const toInboxItem = (msg) => ({
  id: msg.id,
  userId: 1,
  _direction: "sent",
  _raw: msg,
  message: {
    subject: msg.subject || "(no subject)",
    meta: {
      sent: true,
      inbox: false,
      draft: false,
      trash: false,
      archive: false,
      favourite: false,
      unread: true,
      spam: false,
      checked: false,
      tags:
        msg.status === "failed"
          ? [{ text: "Failed", color: "danger" }]
          : msg.status === "queued" || msg.status === "sending"
          ? [{ text: msg.status, color: "warning" }]
          : [],
    },
    reply: [
      {
        replyId: msg.id,
        userId: 1,
        to: { user: null, mail: msg.toAddress },
        date: new Date(msg.createdAt).toLocaleDateString(),
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        replyMessage: [stripHtml(msg.bodyHtml) || msg.bodyText || ""],
        attachment: null,
      },
    ],
  },
});

/** Transform a MessageInbox (received) record into the shape the inbox components expect */
const toInboxInboundItem = (msg) => ({
  id: msg.id,
  userId: 1,
  _direction: "received",
  _raw: msg,
  message: {
    subject: msg.subject || "(no subject)",
    meta: {
      sent: false,
      inbox: true,
      draft: false,
      trash: msg.isTrash   ?? false,
      archive: msg.isArchived ?? false,
      favourite: msg.isFavourite ?? false,
      unread: !(msg.isRead ?? false),
      spam: false,
      checked: false,
      tags: [],
    },
    reply: [
      {
        replyId: msg.id,
        userId: 1,
        // "to" here holds the SENDER so the list can show "From: ..."
        to: { user: null, mail: msg.fromAddress },
        date: new Date(msg.createdAt).toLocaleDateString(),
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        replyMessage: [stripHtml(msg.bodyHtml) || msg.bodyText || ""],
        attachment: null,
      },
    ],
  },
});

const Inbox = () => {
  const [currentTab, setCurrentTab] = useState("Inbox");
  const [aside, setAside] = useState(false);
  const [mailId, setMailId] = useState(null);
  const [messageView, setMessageView] = useState(false);
  const [data, setData] = useState([]);
  const [tabData, setTabData] = useState([]);
  const [labels, setLabels] = useState(inboxLabels);
  const [filterLabel, setFilterLabel] = useState("");
  const [contact, setContact] = useState(contacts);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // ── Fetch both inbound and outbound emails ─────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inboundRes, outboundRes] = await Promise.all([
        apiGet("/notifications/inbox?limit=100&order=desc"),
        apiGet("/notifications?channel=email&limit=100&orderBy=createdAt&order=desc"),
      ]);
      const inbound  = (inboundRes?.data  ?? []).map(toInboxInboundItem);
      const outbound = (outboundRes?.data ?? []).map(toInboxItem);
      // Inbound first so "Inbox" tab shows them, outbound follows for "Sent"
      setData([...inbound, ...outbound]);
    } catch (err) {
      console.error("Mailbox: failed to load messages", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Filter list by active tab ──────────────────────────────────────────────
  useEffect(() => {
    if (currentTab === "Trash") {
      setTabData(data.filter((item) => item.message.meta.trash === true));
    } else if (currentTab === "Archive") {
      setTabData(data.filter((item) => item.message.meta.archive === true));
    } else if (currentTab === "Inbox") {
      setTabData(
        data.filter(
          (item) =>
            item._direction === "received" &&
            item.message.meta.trash   !== true &&
            item.message.meta.archive !== true
        )
      );
    } else {
      // "Sent" — outbound only, not trashed/archived
      setTabData(
        data.filter(
          (item) =>
            item._direction === "sent" &&
            item.message.meta.trash   !== true &&
            item.message.meta.archive !== true
        )
      );
    }
    setFilterLabel("");
    setCurrentPage(1);
  }, [currentTab, data]);

  // ── Label filter ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!filterLabel) return;
    const filtered = data.filter(
      (item) =>
        item.message.meta.tags?.length > 0 &&
        item.message.meta.tags[0].text === filterLabel
    );
    setTabData(filtered);
    setCurrentPage(1);
  }, [filterLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setAside(false);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentItems = tabData.slice(indexOfFirstItem, indexOfLastItem);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <React.Fragment>
      <Head title="Mailbox"></Head>
      <ContentAlt>
        <div className="nk-ibx">
          <InboxAside
            navData={mailboxNavData}
            aside={aside}
            setAside={setAside}
            data={data}
            setData={setData}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            contact={contact}
            setContact={setContact}
            labels={labels}
            setLabels={setLabels}
            setFilterLabel={setFilterLabel}
            setMessageView={setMessageView}
          />
          {aside && <div className="toggle-overlay" onClick={() => setAside(!aside)}></div>}
          <InboxBody
            data={data}
            setData={setData}
            aside={aside}
            setAside={setAside}
            currentTab={currentTab}
            tabData={loading ? [] : currentItems}
            setTabData={setTabData}
            messageView={messageView}
            setMessageView={setMessageView}
            mailId={mailId}
            setMailId={setMailId}
            outerLabels={labels}
            itemPerPage={itemPerPage}
            totalItems={tabData.length}
            paginate={paginate}
            currentPage={currentPage}
            loading={loading}
            onRefresh={fetchAll}
          />
        </div>
      </ContentAlt>
    </React.Fragment>
  );
};

export default Inbox;
