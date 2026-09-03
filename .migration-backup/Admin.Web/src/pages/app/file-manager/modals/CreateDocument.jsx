import React, { useState, useRef } from "react";
import { Button, Spinner } from "reactstrap";
import { Icon } from "@/components/Component";
import { useFileManager, useFileManagerUpdate } from "../components/Context";

import { Editor } from "@tinymce/tinymce-react";
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin.css";
import "tinymce/skins/ui/oxide/content.css";
import "tinymce/skins/content/default/content.css";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/charmap";
import "tinymce/plugins/anchor";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";

// ─── HTML → docx elements ─────────────────────────────────────────────────────

function buildTextRuns(element, docxLib) {
  const { TextRun } = docxLib;
  const runs = [];

  const walk = (node, bold = false, italics = false, underline = false, strike = false) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) {
        runs.push(new TextRun({ text, bold, italics, underline: underline ? {} : undefined, strike }));
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    const b = bold || tag === 'strong' || tag === 'b';
    const i = italics || tag === 'em' || tag === 'i';
    const u = underline || tag === 'u';
    const s = strike || tag === 's' || tag === 'del' || tag === 'strike';
    if (tag === 'br') { runs.push(new TextRun({ text: '', break: 1 })); return; }
    for (const child of node.childNodes) walk(child, b, i, u, s);
  };

  for (const child of element.childNodes) walk(child);
  return runs.length ? runs : [new TextRun({ text: '' })];
}

function htmlToDocxChildren(html, docxLib) {
  const { Paragraph, TextRun, HeadingLevel, AlignmentType } = docxLib;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const items = [];

  const HEADING_MAP = {
    h1: HeadingLevel.HEADING_1,
    h2: HeadingLevel.HEADING_2,
    h3: HeadingLevel.HEADING_3,
    h4: HeadingLevel.HEADING_4,
    h5: HeadingLevel.HEADING_5,
    h6: HeadingLevel.HEADING_6,
  };

  const processNode = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();

    if (HEADING_MAP[tag]) {
      items.push(new Paragraph({ heading: HEADING_MAP[tag], children: buildTextRuns(node, docxLib) }));
      return;
    }

    if (tag === 'p') {
      const align = node.style?.textAlign;
      const alignment = align === 'center' ? AlignmentType.CENTER
        : align === 'right' ? AlignmentType.RIGHT
        : align === 'justify' ? AlignmentType.JUSTIFIED
        : AlignmentType.LEFT;
      items.push(new Paragraph({ alignment, children: buildTextRuns(node, docxLib) }));
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const isOrdered = tag === 'ol';
      let counter = 1;
      for (const li of node.querySelectorAll(':scope > li')) {
        const prefix = isOrdered ? `${counter++}. ` : '• ';
        const runs = buildTextRuns(li, docxLib);
        // Prepend the bullet/number to the first run
        items.push(new Paragraph({
          indent: { left: 720 },
          children: [new TextRun({ text: prefix }), ...runs],
        }));
      }
      return;
    }

    if (tag === 'br') {
      items.push(new Paragraph({ text: '' }));
      return;
    }

    if (tag === 'hr') {
      items.push(new Paragraph({ text: '─'.repeat(50) }));
      return;
    }

    if (tag === 'blockquote') {
      for (const child of node.children) {
        items.push(new Paragraph({
          indent: { left: 720 },
          children: buildTextRuns(child.nodeType === Node.ELEMENT_NODE ? child : node, docxLib),
        }));
      }
      return;
    }

    if (tag === 'div') {
      for (const child of node.childNodes) processNode(child);
      return;
    }

    // Fallback: treat as a paragraph
    const text = node.textContent.trim();
    if (text) {
      items.push(new Paragraph({ children: buildTextRuns(node, docxLib) }));
    }
  };

  for (const child of doc.body.childNodes) processNode(child);
  if (items.length === 0) items.push(new Paragraph({ text: '' }));
  return items;
}

// ─── PDF generation via jsPDF ─────────────────────────────────────────────────

async function generatePdf(htmlContent, docTitle) {
  const { default: jsPDF } = await import('jspdf');
  await import('html2canvas');

  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:720px;padding:32px 40px;' +
    'font-family:Arial,sans-serif;font-size:13px;color:#222;line-height:1.7;background:#fff;';
  container.innerHTML = `<h1 style="font-size:22px;margin:0 0 18px 0;color:#111;border-bottom:2px solid #ddd;padding-bottom:8px;">${docTitle}</h1>${htmlContent}`;
  document.body.appendChild(container);

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  await new Promise((resolve) => {
    pdf.html(container, {
      callback: resolve,
      margin: [12, 12, 12, 12],
      autoPaging: 'text',
      x: 0,
      y: 0,
      width: 186,
      windowWidth: 720,
    });
  });

  document.body.removeChild(container);
  return pdf.output('blob');
}

// ─── DOCX generation via docx package ────────────────────────────────────────

async function generateDocx(htmlContent, docTitle) {
  const docxLib = await import('docx');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docxLib;

  const bodyChildren = htmlToDocxChildren(htmlContent, docxLib);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: docTitle, bold: true, size: 44 })],
          spacing: { after: 240 },
        }),
        new Paragraph({ text: '' }),
        ...bodyChildren,
      ],
    }],
  });

  return Packer.toBlob(doc);
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateDocument = ({ toggle }) => {
  const { fileManager } = useFileManager();
  const { fileManagerUpdate } = useFileManagerUpdate();

  const editorRef = useRef(null);

  const [title, setTitle] = useState('Untitled Document');
  const [format, setFormat] = useState('pdf');
  const [folderSlug, setFolderSlug] = useState(fileManager.currentFolder?.slug || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const topFolders = fileManager.folders.filter((f) => !f.parentSlug);
  const childFolders = (slug) => fileManager.folders.filter((f) => f.parentSlug === slug);

  const safeFilename = (name, ext) =>
    `${(name || 'document').replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_').toLowerCase()}.${ext}`;

  const handleSave = async () => {
    const htmlContent = editorRef.current?.getContent?.() || '';
    if (!htmlContent.replace(/<[^>]+>/g, '').trim()) {
      setError('Please write some content before saving.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a document title.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let blob, mimeType, ext;

      if (format === 'pdf') {
        blob = await generatePdf(htmlContent, title);
        mimeType = 'application/pdf';
        ext = 'pdf';
      } else {
        blob = await generateDocx(htmlContent, title);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        ext = 'docx';
      }

      const filename = safeFilename(title, ext);
      const file = new File([blob], filename, { type: mimeType });
      await fileManagerUpdate.uploadFile(file, folderSlug || undefined);
      toggle();
    } catch (err) {
      console.error('Document generation failed', err);
      setError(err.message || 'Failed to generate document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <React.Fragment>
      <a href="#close" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="close">
        <Icon name="cross-sm" />
      </a>

      <div className="modal-body modal-body-lg" style={{ padding: '1.5rem' }}>
        <h5 className="title mb-4">Create Document</h5>

        {/* Title */}
        <div className="form-group mb-3">
          <label className="form-label fw-medium">Document Title</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* WYSIWYG Editor */}
        <div className="form-group mb-3">
          <label className="form-label fw-medium">Content</label>
          <Editor
            onInit={(evt, editor) => { editorRef.current = editor; }}
            init={{
              height: 380,
              menubar: false,
              skin: false,
              content_css: false,
              plugins:
                'advlist autolink lists link charmap anchor searchreplace visualblocks code fullscreen insertdatetime table wordcount',
              toolbar:
                'undo redo | blocks | bold italic underline strikethrough | forecolor | ' +
                'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                'link table | code fullscreen',
              content_style:
                'body { font-family: Arial, sans-serif; font-size: 13px; color: #364a63; }',
            }}
          />
        </div>

        {/* Format + Folder */}
        <div className="row g-3 mb-3">
          <div className="col-sm-4">
            <label className="form-label fw-medium">Save As</label>
            <div className="d-flex gap-4 mt-1">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  id="fmt-pdf"
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                />
                <label className="form-check-label" htmlFor="fmt-pdf">
                  <Icon name="file-pdf" className="me-1 text-danger" /> PDF
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  id="fmt-docx"
                  checked={format === 'docx'}
                  onChange={() => setFormat('docx')}
                />
                <label className="form-check-label" htmlFor="fmt-docx">
                  <Icon name="file-doc" className="me-1 text-primary" /> DOCX
                </label>
              </div>
            </div>
          </div>

          <div className="col-sm-8">
            <label className="form-label fw-medium">
              Save to Folder <span className="text-muted small">(optional)</span>
            </label>
            <select
              className="form-select form-select-sm"
              value={folderSlug}
              onChange={(e) => setFolderSlug(e.target.value)}
            >
              <option value="">No folder (root)</option>
              {topFolders.map((f) => (
                <React.Fragment key={f.slug}>
                  <option value={f.slug}>{f.name}</option>
                  {childFolders(f.slug).map((child) => (
                    <option key={child.slug} value={child.slug}>
                      {'\u00a0\u00a0\u00a0\u00a0↳ '}{child.name}
                    </option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

        <div className="nk-modal-action justify-end">
          <ul className="btn-toolbar g-4 align-center">
            <li>
              <a href="#cancel" onClick={(ev) => { ev.preventDefault(); toggle(); }} className="link link-primary">
                Cancel
              </a>
            </li>
            <li>
              <Button color="primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Spinner size="sm" className="me-1" />Generating…</>
                ) : (
                  <><Icon name="save" className="me-1" />Save Document</>
                )}
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </React.Fragment>
  );
};

export default CreateDocument;
