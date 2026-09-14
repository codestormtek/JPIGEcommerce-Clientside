import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { config } from '../../config';
import { ApiError } from '../../utils/apiError';
import { AuditContext, logAudit } from '../../utils/auditLogger';
import { CreateSmartLinkInput, UpdateSmartLinkInput } from './smart-links.schema';

const qrOptions = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  width: 1200,
  color: { dark: '#111111', light: '#FFFFFFFF' },
};
const SMART_LINK_CONFIG_KEY = 'smart_links_config';
const DEFAULT_SMART_LINK_CONFIG = {
  canonicalOrigin: 'https://jpig-ecommerce-clientside.replit.app',
  allowedOrigins: [] as string[],
};

function publicHttpsOrigin(value: string, label: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(503, `${label} must be configured as a public HTTPS origin.`);
  }
  const hostname = url.hostname.toLowerCase();
  const privateHost = hostname === 'localhost'
    || hostname.endsWith('.local')
    || hostname === '::1'
    || /^127\./.test(hostname)
    || /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (url.protocol !== 'https:' || url.username || url.password || privateHost
    || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new ApiError(503, `${label} must be a public HTTPS origin without a path, query, fragment, or credentials.`);
  }
  return url.origin;
}

export type SmartLinkConfig = { canonicalOrigin: string; allowedOrigins: string[] };

/**
 * Printed QR/NFC URLs must come from an admin-managed, database-backed setting.
 * Never derive this from a request host, preview address, or public client env.
 */
export async function getSmartLinkConfig(): Promise<SmartLinkConfig> {
  const row = await prisma.siteSetting.findUnique({ where: { settingKey: SMART_LINK_CONFIG_KEY } });
  let parsed: unknown = DEFAULT_SMART_LINK_CONFIG;
  if (row) {
    try {
      parsed = JSON.parse(row.settingValue);
    } catch {
      throw new ApiError(503, 'Smart Links configuration is invalid. An administrator must save a canonical HTTPS origin.');
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new ApiError(503, 'Smart Links configuration is invalid. An administrator must save a canonical HTTPS origin.');
  }
  const value = parsed as { canonicalOrigin?: unknown; allowedOrigins?: unknown };
  if (typeof value.canonicalOrigin !== 'string') {
    throw new ApiError(503, 'Smart Links configuration requires a canonical HTTPS origin.');
  }
  if (!Array.isArray(value.allowedOrigins) || !value.allowedOrigins.every((origin) => typeof origin === 'string')) {
    throw new ApiError(503, 'Smart Links allowed destinations must be a list of HTTPS origins.');
  }
  return {
    canonicalOrigin: publicHttpsOrigin(value.canonicalOrigin.trim(), 'Smart Links canonical origin'),
    allowedOrigins: value.allowedOrigins.map((origin) => publicHttpsOrigin(origin.trim(), 'Smart Links allowed destination')),
  };
}

export async function updateSmartLinkConfig(input: SmartLinkConfig) {
  const config = {
    canonicalOrigin: publicHttpsOrigin(input.canonicalOrigin.trim(), 'Smart Links canonical origin'),
    allowedOrigins: input.allowedOrigins.map((origin) => publicHttpsOrigin(origin.trim(), 'Smart Links allowed destination')),
  };
  if (new Set(config.allowedOrigins).size !== config.allowedOrigins.length) {
    throw ApiError.badRequest('Smart Links allowed destinations must not contain duplicates.');
  }
  await prisma.siteSetting.upsert({
    where: { settingKey: SMART_LINK_CONFIG_KEY },
    update: { settingValue: JSON.stringify(config), label: 'Smart Links canonical origin and allowed destinations', category: 'smart_links' },
    create: { settingKey: SMART_LINK_CONFIG_KEY, settingValue: JSON.stringify(config), label: 'Smart Links canonical origin and allowed destinations', category: 'smart_links' },
  });
  return config;
}

function allowedDestinationOrigins(config: SmartLinkConfig) {
  return new Set([config.canonicalOrigin, ...config.allowedOrigins]);
}

function isShortLinkPath(url: URL, origin: string) {
  if (url.origin !== origin) return false;
  try {
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    return pathname === '/go' || pathname.startsWith('/go/');
  } catch {
    return true;
  }
}

function assertSafeDestination(value: string, field: string, config: SmartLinkConfig) {
  const url = new URL(value);
  if (!allowedDestinationOrigins(config).has(url.origin)) {
    throw ApiError.badRequest(`${field} must use the canonical Smart Links origin or an admin-allowlisted HTTPS origin.`);
  }
  if (isShortLinkPath(url, config.canonicalOrigin)) {
    throw ApiError.badRequest(`${field} cannot point to /go. Smart Links may not redirect through another Smart Link.`);
  }
}

function publicGoUrl(slug: string, origin: string) {
  return `${origin}/go/${encodeURIComponent(slug)}`;
}

function pickupSourceToken(slug: string) {
  return crypto.createHmac('sha256', config.jwt.secret).update(`pickup-source:event_qr:${slug}`).digest('base64url');
}

function destinationFor(link: { slug: string; targetUrl: string; fallbackUrl: string | null; isArchived: boolean }, origin: string) {
  const destination = link.isArchived ? (link.fallbackUrl ?? origin) : link.targetUrl;
  // A QR short link entering the pickup screen carries a signed operational
  // channel marker. It is not marketing attribution and is verified again by
  // the pickup API before it can be persisted as an event-QR order.
  if (!link.isArchived) {
    try {
      const url = new URL(destination);
      if (url.origin === origin && url.pathname === '/pickup') {
        url.searchParams.set('pickupSource', 'event_qr');
        url.searchParams.set('pickupSourceLink', link.slug);
        url.searchParams.set('pickupSourceToken', pickupSourceToken(link.slug));
        return url.toString();
      }
    } catch {
      // Stored destinations are validated by safeDestinationFor below.
    }
  }
  return destination;
}

function safeDestinationFor(link: { slug: string; targetUrl: string; fallbackUrl: string | null; isArchived: boolean }, config: SmartLinkConfig) {
  const origin = config.canonicalOrigin;
  const destination = destinationFor(link, origin);
  try {
    assertSafeDestination(destination, 'Stored destination', config);
    return destination;
  } catch {
    // Existing data may predate allowlisting. Never turn that into an open
    // redirect; a safe canonical landing page is preferable to a redirect.
    return origin;
  }
}

function adminShape(link: {
  id: string; createdAt: Date; updatedAt: Date; title: string; slug: string; targetUrl: string;
  fallbackUrl: string | null; isArchived: boolean; archivedAt: Date | null; _count?: { visits: number };
}, origin: string) {
  return {
    ...link,
    goUrl: publicGoUrl(link.slug, origin),
    visitCount: link._count?.visits ?? 0,
  };
}

export async function listSmartLinks() {
  const config = await getSmartLinkConfig();
  const rows = await prisma.smartLink.findMany({
    include: { _count: { select: { visits: true } } },
    orderBy: [{ isArchived: 'asc' }, { createdAt: 'desc' }],
  });
  return rows.map((row) => adminShape(row, config.canonicalOrigin));
}

export async function createSmartLink(input: CreateSmartLinkInput, actorId: string, ctx?: AuditContext) {
  const config = await getSmartLinkConfig();
  assertSafeDestination(input.targetUrl, 'Target URL', config);
  if (input.fallbackUrl) assertSafeDestination(input.fallbackUrl, 'Fallback URL', config);
  const exists = await prisma.smartLink.findUnique({ where: { slug: input.slug } });
  if (exists) throw ApiError.conflict('That slug is permanently reserved. Choose another slug.');
  let link;
  try {
    link = await prisma.smartLink.create({ data: { ...input, createdBy: actorId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw ApiError.conflict('That slug is permanently reserved. Choose another slug.');
    }
    throw error;
  }
  logAudit({
    action: 'SMART_LINK_CREATED', entityType: 'SmartLink', entityId: link.id,
    afterJson: { title: link.title, slug: link.slug, targetUrl: link.targetUrl, fallbackUrl: link.fallbackUrl },
    ctx: { ...ctx, actorId },
  });
  return adminShape(link, config.canonicalOrigin);
}

export async function updateSmartLink(id: string, input: UpdateSmartLinkInput, actorId: string, ctx?: AuditContext) {
  const before = await prisma.smartLink.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Smart link');
  if (before.isArchived) throw ApiError.conflict('Inactive Smart Links cannot be edited. Reactivate the link first.');
  const config = await getSmartLinkConfig();
  if (input.targetUrl) assertSafeDestination(input.targetUrl, 'Target URL', config);
  if (input.fallbackUrl) assertSafeDestination(input.fallbackUrl, 'Fallback URL', config);
  const after = await prisma.smartLink.update({ where: { id }, data: input });
  logAudit({
    action: 'SMART_LINK_UPDATED', entityType: 'SmartLink', entityId: id,
    beforeJson: { title: before.title, slug: before.slug, targetUrl: before.targetUrl, fallbackUrl: before.fallbackUrl },
    afterJson: { title: after.title, slug: after.slug, targetUrl: after.targetUrl, fallbackUrl: after.fallbackUrl },
    ctx: { ...ctx, actorId },
  });
  return adminShape(after, config.canonicalOrigin);
}

export async function deactivateSmartLink(id: string, actorId: string, ctx?: AuditContext) {
  const before = await prisma.smartLink.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Smart link');
  const config = await getSmartLinkConfig();
  if (before.isArchived) return adminShape(before, config.canonicalOrigin);
  const after = await prisma.smartLink.update({
    where: { id }, data: { isArchived: true, archivedAt: new Date() },
  });
  logAudit({
    action: 'SMART_LINK_DEACTIVATED', entityType: 'SmartLink', entityId: id,
    beforeJson: { slug: before.slug, targetUrl: before.targetUrl, isArchived: false },
    afterJson: { slug: after.slug, fallbackUrl: destinationFor(after, config.canonicalOrigin), isArchived: true },
    ctx: { ...ctx, actorId },
  });
  return adminShape(after, config.canonicalOrigin);
}

export async function reactivateSmartLink(id: string, actorId: string, ctx?: AuditContext) {
  const before = await prisma.smartLink.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('Smart link');
  const config = await getSmartLinkConfig();
  if (!before.isArchived) return adminShape(before, config.canonicalOrigin);
  const after = await prisma.smartLink.update({ where: { id }, data: { isArchived: false, archivedAt: null } });
  logAudit({
    action: 'SMART_LINK_REACTIVATED', entityType: 'SmartLink', entityId: id,
    beforeJson: { slug: before.slug, isInactive: true },
    afterJson: { slug: after.slug, isInactive: false },
    ctx: { ...ctx, actorId },
  });
  return adminShape(after, config.canonicalOrigin);
}

async function duplicateSlug(slug: string) {
  const base = `${slug}-copy`.slice(0, 75).replace(/-+$/, '');
  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const exists = await prisma.smartLink.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw ApiError.conflict('Unable to allocate a duplicate slug. Please create the link with a new slug.');
}

export async function duplicateSmartLink(id: string, actorId: string, ctx?: AuditContext) {
  const source = await prisma.smartLink.findUnique({ where: { id } });
  if (!source) throw ApiError.notFound('Smart link');
  const config = await getSmartLinkConfig();
  assertSafeDestination(source.targetUrl, 'Source target URL', config);
  if (source.fallbackUrl) assertSafeDestination(source.fallbackUrl, 'Source fallback URL', config);
  const slug = await duplicateSlug(source.slug);
  let duplicate;
  try {
    duplicate = await prisma.smartLink.create({
      data: {
        title: `${source.title} (copy)`.slice(0, 120),
        slug,
        targetUrl: source.targetUrl,
        fallbackUrl: source.fallbackUrl,
        createdBy: actorId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw ApiError.conflict('A duplicate was created concurrently. Please try again.');
    }
    throw error;
  }
  logAudit({
    action: 'SMART_LINK_DUPLICATED', entityType: 'SmartLink', entityId: duplicate.id,
    beforeJson: { sourceId: source.id, sourceSlug: source.slug },
    afterJson: { slug: duplicate.slug, targetUrl: duplicate.targetUrl },
    ctx: { ...ctx, actorId },
  });
  return adminShape(duplicate, config.canonicalOrigin);
}

export async function resolveSmartLink(slug: string, referer?: string, countVisit = true) {
  const config = await getSmartLinkConfig();
  const origin = config.canonicalOrigin;
  const link = await prisma.smartLink.findUnique({ where: { slug } });
  if (!link) return { url: origin, found: false, archived: false, allowedOrigins: [origin, ...config.allowedOrigins] };
  let sourceHost: string | null = null;
  if (referer) {
    try { sourceHost = new URL(referer).hostname.slice(0, 255); } catch { /* ignore malformed referrer */ }
  }
  // A visit means the immutable short link was reached, including an archived
  // link which safely falls through to its fallback. Do not let metrics make
  // redirects fail if a database write is momentarily unavailable.
  if (countVisit) prisma.smartLinkVisit.create({ data: { smartLinkId: link.id, sourceHost } }).catch(() => undefined);
  return { url: safeDestinationFor(link, config), found: true, archived: link.isArchived, allowedOrigins: [origin, ...config.allowedOrigins] };
}

async function getQrLink(id: string) {
  const link = await prisma.smartLink.findUnique({ where: { id } });
  if (!link) throw ApiError.notFound('Smart link');
  return link;
}

export async function smartLinkQrSvg(id: string) {
  const config = await getSmartLinkConfig();
  const link = await getQrLink(id);
  return QRCode.toString(publicGoUrl(link.slug, config.canonicalOrigin), { ...qrOptions, type: 'svg' });
}

export async function smartLinkQrPng(id: string) {
  const config = await getSmartLinkConfig();
  const link = await getQrLink(id);
  return QRCode.toBuffer(publicGoUrl(link.slug, config.canonicalOrigin), { ...qrOptions, type: 'png' });
}

export async function smartLinkSignPdf(id: string): Promise<Buffer> {
  const config = await getSmartLinkConfig();
  const link = await getQrLink(id);
  const qr = await smartLinkQrPng(id);
  return new Promise((resolve, reject) => {
    // 5 x 7 inches, a common counter-sign size.
    const doc = new PDFDocument({ size: [360, 504], margin: 28, info: { Title: `${link.title} QR sign` } });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(22)
      .text(link.title, { align: 'center', width: 304 });
    doc.moveDown(0.45).font('Helvetica').fontSize(11)
      .text('Scan to order or learn more', { align: 'center', width: 304 });
    doc.image(qr, 55, 115, { width: 250, height: 250 });
    doc.font('Helvetica-Bold').fontSize(12).text('SCAN ME', 28, 390, { align: 'center', width: 304 });
    doc.moveDown(0.55).font('Helvetica').fontSize(8).fillColor('#444444')
      .text(publicGoUrl(link.slug, config.canonicalOrigin), { align: 'center', width: 304 });
    doc.end();
  });
}

export async function smartLinkMetrics(id: string, days: number) {
  const config = await getSmartLinkConfig();
  const link = await prisma.smartLink.findUnique({ where: { id }, select: { id: true, title: true, slug: true } });
  if (!link) throw ApiError.notFound('Smart link');
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);
  const [total, daily] = await Promise.all([
    prisma.smartLinkVisit.count({ where: { smartLinkId: id, occurredAt: { gte: from } } }),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "occurredAt" AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
      FROM "smart_link_visits"
      WHERE "smartLinkId" = ${id} AND "occurredAt" >= ${from}
      GROUP BY 1 ORDER BY 1`,
  ]);
  return {
    link: { ...link, goUrl: publicGoUrl(link.slug, config.canonicalOrigin) }, days, totalVisits: total,
    daily: daily.map((row) => ({ date: new Date(row.day).toISOString().slice(0, 10), visits: Number(row.count) })),
  };
}

export async function smartLinkAuditHistory(id: string) {
  const link = await prisma.smartLink.findUnique({ where: { id }, select: { id: true } });
  if (!link) throw ApiError.notFound('Smart link');
  return prisma.auditLog.findMany({
    where: { entityType: 'SmartLink', entityId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, action: true, beforeJson: true, afterJson: true, createdAt: true },
  });
}
