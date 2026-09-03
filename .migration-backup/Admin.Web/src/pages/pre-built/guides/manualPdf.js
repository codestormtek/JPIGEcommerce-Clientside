// Generates a real PDF file of the whole manual using jsPDF.
// Two-pass approach: TOC pages are reserved up front (entry count is known),
// content pages record their page numbers, then the TOC is filled in with them.
import { jsPDF } from "jspdf";

// ── Layout constants (pt) ────────────────────────────────────────────────────
const PAGE_W = 612; // letter
const PAGE_H = 792;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_ZONE = 40; // reserved at bottom for footer
const BOTTOM_Y = PAGE_H - MARGIN - FOOTER_ZONE + 24;

const COLORS = {
  text: [40, 40, 40],
  muted: [110, 110, 110],
  heading: [20, 20, 20],
  tipBorder: [30, 224, 172],
  tipBg: [240, 249, 241],
  warnBorder: [232, 83, 71],
  warnBg: [253, 243, 243],
  stepCircle: [133, 79, 255],
  line: [51, 51, 51],
};

// ── Helpers: tree ────────────────────────────────────────────────────────────
const flattenTree = (nodes, depth = 0, out = []) => {
  (nodes || []).forEach((n) => {
    out.push({ node: n, depth });
    flattenTree(n.children, depth + 1, out);
  });
  return out;
};

const numberFor = (nodes, id) => {
  const walk = (list, prefix) => {
    for (let i = 0; i < (list || []).length; i++) {
      const num = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      if (list[i].id === id) return num;
      const hit = walk(list[i].children, num);
      if (hit) return hit;
    }
    return null;
  };
  return walk(nodes, "");
};

// ── Helpers: HTML → simple paragraph list ────────────────────────────────────
// Returns [{ text, style: 'p'|'li'|'h', ordinal? }]
const htmlToParagraphs = (html) => {
  if (!html) return [];
  if (!/<\/?[a-z][\s\S]*>/i.test(html)) {
    return html.split(/\n+/).map((t) => t.trim()).filter(Boolean).map((text) => ({ text, style: "p" }));
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = [];
  const pushText = (el, style, ordinal) => {
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (text) out.push({ text, style, ordinal });
  };
  const walk = (node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType !== 1) {
        const text = (child.textContent || "").trim();
        if (text) out.push({ text, style: "p" });
        return;
      }
      const tag = child.tagName.toLowerCase();
      if (tag === "ol" || tag === "ul") {
        let i = 0;
        child.querySelectorAll(":scope > li").forEach((li) => {
          i += 1;
          pushText(li, "li", tag === "ol" ? i : null);
        });
      } else if (/^h[1-6]$/.test(tag)) {
        pushText(child, "h");
      } else if (tag === "p" || tag === "div" || tag === "blockquote") {
        // If it contains nested lists, recurse; otherwise take its text.
        if (child.querySelector("ol,ul")) walk(child);
        else pushText(child, "p");
      } else {
        pushText(child, "p");
      }
    });
  };
  walk(doc.body);
  return out;
};

// ── Helpers: images ──────────────────────────────────────────────────────────
// Normalizes any browser-decodable image (webp/gif/png/jpg) to JPEG data URL.
const loadImageAsJpeg = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 8000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.82), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });

// Pre-fetch every image in the tree (block images + step images).
const collectImageUrls = (nodes, out = new Set()) => {
  (nodes || []).forEach((n) => {
    (n.blocks || []).forEach((b) => {
      if (b.imageUrl) out.add(b.imageUrl);
      (b.steps || []).forEach((s) => { if (s.imageUrl) out.add(s.imageUrl); });
    });
    collectImageUrls(n.children, out);
  });
  return out;
};

// ── Main generator ───────────────────────────────────────────────────────────
export async function generateManualPdf(tree, { title = "BBQ Rig User Guide", subtitle = "Operating manual for equipment and features" } = {}) {
  const flat = flattenTree(tree);
  const printDate = new Date().toLocaleDateString();

  // Pre-load images in parallel.
  const urls = [...collectImageUrls(tree)];
  const imageMap = {};
  await Promise.all(urls.map(async (u) => { imageMap[u] = await loadImageAsJpeg(u); }));

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = MARGIN;

  const ensureSpace = (needed) => {
    if (y + needed > BOTTOM_Y) {
      doc.addPage();
      y = MARGIN;
      return true;
    }
    return false;
  };

  const writeParagraph = (text, { size = 10, style = "normal", color = COLORS.text, indent = 0, gapAfter = 6, bullet = null } = {}) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const bulletW = bullet ? doc.getTextWidth(bullet) + 4 : 0;
    const width = CONTENT_W - indent - bulletW;
    const lines = doc.splitTextToSize(text, width);
    const lineH = size * 1.35;
    lines.forEach((line, i) => {
      ensureSpace(lineH);
      if (i === 0 && bullet) doc.text(bullet, MARGIN + indent, y + size);
      doc.text(line, MARGIN + indent + bulletW, y + size);
      y += lineH;
    });
    y += gapAfter;
  };

  const writeHtml = (html, opts = {}) => {
    htmlToParagraphs(html).forEach((p) => {
      if (p.style === "h") {
        writeParagraph(p.text, { ...opts, size: 11, style: "bold", gapAfter: 4 });
      } else if (p.style === "li") {
        writeParagraph(p.text, { ...opts, indent: (opts.indent || 0) + 10, bullet: p.ordinal ? `${p.ordinal}.` : "\u2022", gapAfter: 3 });
      } else {
        writeParagraph(p.text, opts);
      }
    });
  };

  const drawImage = (url, caption, { maxW = CONTENT_W * 0.7, maxH = 200, indent = 0 } = {}) => {
    const img = imageMap[url];
    if (!img) return;
    let w = img.w, h = img.h;
    const scale = Math.min(maxW / w, maxH / h, 1);
    w *= scale; h *= scale;
    const capH = caption ? 14 : 0;
    if (h + capH > BOTTOM_Y - MARGIN) { const s2 = (BOTTOM_Y - MARGIN - capH) / h; w *= s2; h *= s2; }
    ensureSpace(h + capH + 8);
    try {
      doc.addImage(img.dataUrl, "JPEG", MARGIN + indent, y, w, h);
      y += h + 4;
      if (caption) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.muted);
        doc.text(doc.splitTextToSize(caption, CONTENT_W - indent), MARGIN + indent, y + 8);
        y += 14;
      }
      y += 6;
    } catch { /* skip undecodable image */ }
  };

  // ── Cover page ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...COLORS.heading);
  doc.text(title, PAGE_W / 2, 260, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.muted);
  doc.text(subtitle, PAGE_W / 2, 290, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Printed ${printDate}`, PAGE_W / 2, 315, { align: "center" });

  // ── Reserve TOC pages (entry count is known up front) ──
  const TOC_TOP = MARGIN + 40; // below TOC heading
  const TOC_LINE_H = 16;
  const tocPerPage = Math.floor((BOTTOM_Y - TOC_TOP) / TOC_LINE_H);
  const tocPageCount = Math.max(1, Math.ceil(flat.length / tocPerPage));
  const tocFirstPage = 2;
  for (let i = 0; i < tocPageCount; i++) doc.addPage();

  // ── Content ──
  const sectionPages = {}; // id -> pdf page number
  const renderSection = (node, depth) => {
    const num = numberFor(tree, node.id);
    if (depth === 0) {
      doc.addPage();
      y = MARGIN;
    } else {
      ensureSpace(60);
      y += 6;
    }
    sectionPages[node.id] = doc.getNumberOfPages();

    const size = depth === 0 ? 17 : depth === 1 ? 13.5 : 11.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...COLORS.heading);
    const headLines = doc.splitTextToSize(`${num}. ${node.title}`, CONTENT_W);
    headLines.forEach((line) => { doc.text(line, MARGIN, y + size); y += size * 1.25; });
    if (depth === 0) {
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(1.2);
      doc.line(MARGIN, y + 4, PAGE_W - MARGIN, y + 4);
      y += 12;
    } else {
      y += 6;
    }

    if (node.description) writeHtml(node.description, { color: COLORS.muted });

    (node.blocks || []).forEach((b) => renderBlock(b));
    (node.children || []).forEach((c) => renderSection(c, depth + 1));
  };

  const renderBlock = (b) => {
    y += 2;
    if (b.type === "tip" || b.type === "warning") {
      const border = b.type === "tip" ? COLORS.tipBorder : COLORS.warnBorder;
      const label = b.type === "tip" ? "TIP" : "WARNING";
      ensureSpace(40);
      const startY = y;
      const startPage = doc.getNumberOfPages();
      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...border);
      doc.text(`${label}${b.title ? ` \u2014 ${b.title}` : ""}`, MARGIN + 12, y + 9);
      y += 18;
      writeHtml(b.body, { indent: 12 });
      if (b.imageUrl) drawImage(b.imageUrl, b.imageCaption, { indent: 12, maxH: 160 });
      // Left border bar (only when the callout stayed on one page)
      if (doc.getNumberOfPages() === startPage) {
        doc.setDrawColor(...border);
        doc.setLineWidth(3);
        doc.line(MARGIN + 2, startY + 2, MARGIN + 2, y - 2);
      }
      y += 4;
      return;
    }

    if (b.title) writeParagraph(b.title, { size: 11.5, style: "bold", color: COLORS.heading, gapAfter: 3 });

    if (b.type === "steps") {
      if (b.body) writeHtml(b.body);
      (b.steps || []).forEach((s, i) => {
        const stepPrefix = `${i + 1}.`;
        doc.setFont("helvetica", "bold");
        htmlToParagraphs(s.text).forEach((p, pi) => {
          writeParagraph(p.text, {
            indent: 16,
            bullet: pi === 0 ? stepPrefix : null,
            gapAfter: 3,
            style: pi === 0 ? "normal" : "normal",
          });
        });
        if (s.imageUrl) drawImage(s.imageUrl, s.imageCaption, { indent: 16, maxH: 150 });
        y += 2;
      });
      y += 4;
      return;
    }

    if (b.type === "image") {
      if (b.imageUrl) drawImage(b.imageUrl, b.imageCaption || b.title, { maxH: 260 });
      return;
    }

    // text / default
    if (b.body) writeHtml(b.body);
    if (b.imageUrl) drawImage(b.imageUrl, b.imageCaption);
  };

  (tree || []).forEach((n) => renderSection(n, 0));

  // ── Fill in the reserved TOC pages ──
  for (let i = 0; i < tocPageCount; i++) {
    doc.setPage(tocFirstPage + i);
    let ty = MARGIN;
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(...COLORS.heading);
      doc.text("Table of Contents", MARGIN, ty + 17);
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(1.2);
      doc.line(MARGIN, ty + 26, PAGE_W - MARGIN, ty + 26);
    }
    ty = TOC_TOP;
    const entries = flat.slice(i * tocPerPage, (i + 1) * tocPerPage);
    entries.forEach(({ node, depth }) => {
      const num = numberFor(tree, node.id);
      const page = sectionPages[node.id];
      const label = `${num}. ${node.title}`;
      const indent = depth * 16;
      doc.setFont("helvetica", depth === 0 ? "bold" : "normal");
      doc.setFontSize(depth === 0 ? 10.5 : 10);
      doc.setTextColor(...COLORS.text);
      const pageStr = page ? String(page) : "";
      const pageW = doc.getTextWidth(pageStr);
      const labelMaxW = CONTENT_W - indent - pageW - 24;
      const labelLine = doc.splitTextToSize(label, labelMaxW)[0];
      doc.text(labelLine, MARGIN + indent, ty + 10);
      // dotted leader
      const labelW = doc.getTextWidth(labelLine);
      const dotStart = MARGIN + indent + labelW + 6;
      const dotEnd = PAGE_W - MARGIN - pageW - 6;
      if (dotEnd > dotStart) {
        doc.setLineDashPattern([1, 3], 0);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.6);
        doc.line(dotStart, ty + 8, dotEnd, ty + 8);
        doc.setLineDashPattern([], 0);
      }
      doc.text(pageStr, PAGE_W - MARGIN, ty + 10, { align: "right" });
      ty += TOC_LINE_H;
    });
  }

  // ── Footer pass: page number + print date on every page except the cover ──
  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    doc.setDrawColor(220, 224, 234);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, PAGE_H - 42, PAGE_W - MARGIN, PAGE_H - 42);
    doc.text(`${title} \u2014 Printed ${printDate}`, MARGIN, PAGE_H - 28);
    doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, PAGE_H - 28, { align: "right" });
  }

  const fileName = `${title.replace(/[^\w\d]+/g, "-").replace(/^-+|-+$/g, "")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
