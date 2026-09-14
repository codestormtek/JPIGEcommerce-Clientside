import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { logAudit, AuditContext } from '../../utils/auditLogger';
import {
  CloudPrntSettingsInput, CreatePrinterInput, UpdatePrinterInput,
} from './cloudprnt.schema';

const DELIVERY_ACK_WINDOW_MS = 10 * 60 * 1000;
const SAFE_STATUS = ['queued', 'delivering', 'printed', 'error', 'cancelled'];
const PAID_PAYMENT_STATUSES = ['captured', 'partially_refunded'];
const PICKUP_ORDER_TYPES = ['kiosk', 'event_qr', 'remote_pickup'];
// A ticket is useful only while the pickup order is still actionable. In
// particular, reconciliation must never resurrect old completed/cancelled work.
const ACTIVE_PICKUP_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'ready_to_ship'];
export const UNACKNOWLEDGED_DELIVERY_ERROR = 'Printer did not acknowledge delivery. Delivery outcome is unknown; CloudPRNT is quarantined. Do not retry automatically. Check the kitchen, then use the audited Reprint action if needed.';
export const CLOUDPRNT_TEXT_MEDIA_TYPE = 'text/plain';

type PrinterIdentity = {
  id: string;
  printerMac: string | null;
};

type CloudPrntJobQuery = {
  type?: string;
  mac?: string;
  code?: string;
};

type DeliverySlotJob = {
  id: string;
  status: string;
  lastError: string | null;
  acknowledgedAt: Date | null;
};

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function isCloudPrntSuccessCode(statusCode: string | number) {
  // CloudPRNT reports an HTTP-style status value (for example "200%20OK").
  // Do not classify arbitrary strings such as "2 paper errors" as printed.
  return /^2\d{2}(?:\s|%20|$)/.test(String(statusCode).trim());
}

export function isQuarantinedCloudPrntDelivery(job: Pick<DeliverySlotJob, 'status' | 'lastError' | 'acknowledgedAt'>) {
  return job.status === 'error'
    && job.acknowledgedAt === null
    && job.lastError === UNACKNOWLEDGED_DELIVERY_ERROR;
}

/**
 * A printer never receives a second ticket while an earlier delivery has an
 * unknown outcome. CloudPRNT DELETE has no server job ID, so advancing would
 * let a late DELETE for A acknowledge B.
 */
export function selectCloudPrntDeliverySlot<T extends DeliverySlotJob>(jobs: T[]): T | undefined {
  // Callers provide oldest-fetched first. Keep that order: a quarantined A
  // always owns the slot ahead of any legacy/concurrent B.
  return jobs.find((job) => job.status === 'delivering' || isQuarantinedCloudPrntDelivery(job));
}

export function cloudPrntPollIsQuarantined(slot: DeliverySlotJob | undefined) {
  return Boolean(slot && isQuarantinedCloudPrntDelivery(slot));
}

export function cloudPrntPollResponse() {
  return {
    jobReady: true,
    // This service generates UTF-8 kitchen tickets only. Do not advertise a
    // Star command/raster format unless the server has actually encoded one.
    mediaTypes: [CLOUDPRNT_TEXT_MEDIA_TYPE],
    deleteMethod: 'DELETE' as const,
  };
}

function ticketOrderNumber(order: { kioskOrderNumber: string | null; id: string }) {
  return order.kioskOrderNumber ?? `ORD-${order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function cleanTicketLine(value: string | null | undefined) {
  return (value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 240);
}

function verifiedHttpsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw ApiError.badRequest('CloudPRNT canonical URL must be a valid HTTPS URL.');
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const privateHost = hostname === 'localhost'
    || hostname.endsWith('.local')
    || hostname === '::'
    || hostname === '::1'
    || /^(?:fc|fd)[0-9a-f:]*$/i.test(hostname)
    || /^fe[89ab][0-9a-f:]*$/i.test(hostname)
    || /^0\./.test(hostname)
    || /^127\./.test(hostname)
    || /^10\./.test(hostname)
    || /^169\.254\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (url.protocol !== 'https:' || url.username || url.password || privateHost) {
    throw ApiError.badRequest('CloudPRNT canonical URL must be a public HTTPS origin without credentials.');
  }
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw ApiError.badRequest('CloudPRNT canonical URL must be an origin without a path, query, or fragment.');
  }
  return url.origin;
}

async function getCanonicalUrl() {
  const setting = await prisma.siteSetting.findUnique({ where: { settingKey: 'cloudprnt_canonical_url' } });
  return setting?.settingValue ? verifiedHttpsUrl(setting.settingValue) : null;
}

export async function getCloudPrntSettings() {
  const canonicalUrl = await getCanonicalUrl();
  return { canonicalUrl, cloudPrntUrl: canonicalUrl ? `${canonicalUrl}/api/v1/cloudprnt` : null };
}

export async function saveCloudPrntSettings(input: CloudPrntSettingsInput, actorId: string, ctx?: AuditContext) {
  const canonicalUrl = verifiedHttpsUrl(input.canonicalUrl);
  const existing = await prisma.siteSetting.findUnique({ where: { settingKey: 'cloudprnt_canonical_url' } });
  await prisma.siteSetting.upsert({
    where: { settingKey: 'cloudprnt_canonical_url' },
    create: {
      settingKey: 'cloudprnt_canonical_url', settingValue: canonicalUrl,
      label: 'CloudPRNT verified canonical URL', category: 'operations',
    },
    update: { settingValue: canonicalUrl, label: 'CloudPRNT verified canonical URL', category: 'operations' },
  });
  logAudit({
    action: 'CLOUDPRNT_CANONICAL_URL_UPDATED', entityType: 'SiteSetting', entityId: 'cloudprnt_canonical_url',
    beforeJson: { canonicalUrl: existing?.settingValue ?? null }, afterJson: { canonicalUrl }, ctx: { ...ctx, actorId },
  });
  return { canonicalUrl, cloudPrntUrl: `${canonicalUrl}/api/v1/cloudprnt` };
}

function buildOrderTicket(order: {
  id: string;
  kioskOrderNumber: string | null;
  orderType: string;
  requestedFulfillmentAt: Date | null;
  eventName: string | null;
  specialInstructions: string | null;
  addresses: Array<{ addressType: string; fullName: string | null }>;
  lines: Array<{
    qty: number;
    productNameSnapshot: string;
    sideSelectionsText: string | null;
    options: Array<{ variationOption: { value: string } }>;
    menuOptions: Array<{ menuOption: { name: string } }>;
  }>;
}) {
  const customerName = order.addresses.find((address) => address.addressType === 'billing')?.fullName;
  const channel = order.orderType === 'event_qr' ? 'EVENT QR'
    : order.orderType === 'remote_pickup' ? 'REMOTE PICKUP'
      : order.orderType === 'kiosk' ? 'KIOSK' : order.orderType.toUpperCase();
  const lines = [
    'THE JIGGLING PIG',
    'KITCHEN TICKET',
    '--------------------------------',
    `ORDER: ${ticketOrderNumber(order)}`,
    `CHANNEL: ${channel}`,
    customerName ? `NAME: ${cleanTicketLine(customerName)}` : null,
    order.requestedFulfillmentAt ? `PICKUP: ${order.requestedFulfillmentAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'PICKUP: ASAP',
    order.eventName ? `LOCATION: ${cleanTicketLine(order.eventName)}` : null,
    '--------------------------------',
    ...order.lines.flatMap((line) => {
      const options = [
        ...line.options.map((option) => option.variationOption.value),
        ...line.menuOptions.map((option) => option.menuOption.name),
      ].map(cleanTicketLine).filter(Boolean);
      return [
        `${line.qty}x ${cleanTicketLine(line.productNameSnapshot)}`,
        line.sideSelectionsText ? `  SIDES: ${cleanTicketLine(line.sideSelectionsText)}` : null,
        ...options.map((option) => `  • ${option}`),
      ].filter((value): value is string => Boolean(value));
    }),
    order.specialInstructions ? '--------------------------------' : null,
    order.specialInstructions ? `NOTE: ${cleanTicketLine(order.specialInstructions)}` : null,
    '',
    'PAID — PREPARE FOR PICKUP',
    '\n\n\n',
  ].filter((value): value is string => Boolean(value));
  return lines.join('\n');
}

async function getTicketOrder(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      addresses: { select: { addressType: true, fullName: true } },
      lines: {
        select: {
          qty: true, productNameSnapshot: true, sideSelectionsText: true,
          options: { select: { variationOption: { select: { value: true } } } },
          menuOptions: { select: { menuOption: { select: { name: true } } } },
        },
      },
      orderStatus: { select: { status: true } },
      payments: {
        where: { status: { in: PAID_PAYMENT_STATUSES } },
        select: { id: true, status: true, capturedAt: true },
      },
    },
  });
  if (!order) throw ApiError.notFound('Order');
  if (!PICKUP_ORDER_TYPES.includes(order.orderType)) return null;
  if (!order.payments.length) throw ApiError.conflict('A kitchen ticket can only be created after payment is captured.');
  if (!ACTIVE_PICKUP_ORDER_STATUSES.includes(order.orderStatus.status)) return null;
  return order;
}

type CapturedPayment = { status: string; capturedAt: Date | null };

/**
 * `createdAt` is the printer's durable reconciliation cutoff. Do not infer a
 * payment time from an order's date: orders can be created before payment and
 * legacy captures with no capture timestamp must not be printed speculatively.
 */
export function hasPaymentCapturedSincePrinterCreation(payments: CapturedPayment[], printerCreatedAt: Date) {
  return payments.some((payment) =>
    PAID_PAYMENT_STATUSES.includes(payment.status)
    && payment.capturedAt !== null
    && payment.capturedAt >= printerCreatedAt,
  );
}

async function enqueueOrderTicketForPrinter(
  printer: { id: string; createdAt: Date },
  order: NonNullable<Awaited<ReturnType<typeof getTicketOrder>>>,
) {
  if (!hasPaymentCapturedSincePrinterCreation(order.payments, printer.createdAt)) return;
  try {
    await prisma.cloudPrntJob.create({
      data: {
        printerId: printer.id,
        orderId: order.id,
        dedupeKey: `order:${order.id}:printer:${printer.id}`,
        payloadText: buildOrderTicket(order),
      },
    });
  } catch (error) {
    // The unique key is also the cross-poll/process reconciliation lock.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
  }
}

export async function enqueueCapturedOrderKitchenTickets(orderId: string): Promise<void> {
  const [order, printers] = await Promise.all([
    getTicketOrder(orderId),
    prisma.cloudPrntPrinter.findMany({ where: { isActive: true }, select: { id: true, createdAt: true } }),
  ]);
  if (!order) return;
  if (!printers.length) return;
  await Promise.all(printers.map((printer) => enqueueOrderTicketForPrinter(printer, order)));
}

/**
 * Repair the narrow crash window between a captured payment and ticket enqueue.
 * This runs only while an authenticated printer is polling. The printer
 * creation time is a strict cutoff: it may repair only payments captured after
 * that printer existed, never replay historical orders when a printer is added.
 */
export function reconciliationOrderWhere(printerId: string, printerCreatedAt: Date): Prisma.ShopOrderWhereInput {
  return {
    orderType: { in: PICKUP_ORDER_TYPES },
    orderStatus: { status: { in: ACTIVE_PICKUP_ORDER_STATUSES } },
    payments: {
      some: {
        status: { in: PAID_PAYMENT_STATUSES },
        capturedAt: { gte: printerCreatedAt },
      },
    },
    cloudPrntJobs: { none: { printerId } },
  };
}

async function reconcileCapturedTicketsForPrinter(printer: { id: string; createdAt: Date }) {
  const orders = await prisma.shopOrder.findMany({
    where: reconciliationOrderWhere(printer.id, printer.createdAt),
    select: { id: true },
    take: 50,
    orderBy: { orderDate: 'asc' },
  });
  await Promise.all(orders.map(async (order) => {
    const ticketOrder = await getTicketOrder(order.id);
    if (ticketOrder) await enqueueOrderTicketForPrinter(printer, ticketOrder);
  }));
}

export async function createPrinter(input: CreatePrinterInput, actorId: string, ctx?: AuditContext) {
  const token = `cpt_${crypto.randomBytes(32).toString('base64url')}`;
  const printer = await prisma.cloudPrntPrinter.create({
    data: { name: input.name, tokenHash: hashToken(token) },
  });
  logAudit({
    action: 'CLOUDPRNT_PRINTER_CREATED', entityType: 'CloudPrntPrinter', entityId: printer.id,
    afterJson: { name: printer.name }, ctx: { ...ctx, actorId },
  });
  return { id: printer.id, name: printer.name, token, createdAt: printer.createdAt };
}

export async function listPrinters() {
  const printers = await prisma.cloudPrntPrinter.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { jobs: { where: { status: { in: SAFE_STATUS } } } } },
      jobs: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, lastError: true, createdAt: true } },
    },
  });
  const now = Date.now();
  return printers.map((printer) => ({
    id: printer.id, name: printer.name, isActive: printer.isActive,
    status: printer.status, lastSeenAt: printer.lastSeenAt,
    online: Boolean(printer.lastSeenAt && now - printer.lastSeenAt.getTime() < 2 * 60 * 1000),
    printerMac: printer.printerMac, printerModel: printer.printerModel,
    firmwareVersion: printer.firmwareVersion, lastError: printer.lastError,
    jobCount: printer._count.jobs, latestJob: printer.jobs[0] ?? null, createdAt: printer.createdAt,
  }));
}

export async function updatePrinter(printerId: string, input: UpdatePrinterInput, actorId: string, ctx?: AuditContext) {
  const before = await prisma.cloudPrntPrinter.findUnique({ where: { id: printerId } });
  if (!before) throw ApiError.notFound('CloudPRNT printer');
  const printer = await prisma.cloudPrntPrinter.update({ where: { id: printerId }, data: input });
  logAudit({
    action: 'CLOUDPRNT_PRINTER_UPDATED', entityType: 'CloudPrntPrinter', entityId: printerId,
    beforeJson: { name: before.name, isActive: before.isActive },
    afterJson: { name: printer.name, isActive: printer.isActive }, ctx: { ...ctx, actorId },
  });
  return printer;
}

export async function createTestTicket(printerId: string, actorId: string, ctx?: AuditContext) {
  const printer = await prisma.cloudPrntPrinter.findUnique({ where: { id: printerId } });
  if (!printer) throw ApiError.notFound('CloudPRNT printer');
  if (!printer.isActive) throw ApiError.conflict('Activate the printer before sending a test ticket.');
  const job = await prisma.cloudPrntJob.create({
    data: {
      printerId, ticketKind: 'test',
      payloadText: 'THE JIGGLING PIG\nCLOUDPRNT TEST TICKET\n--------------------------------\nIf this prints, the polling connection and text/plain output are working.\nNo order was created.\n\n\n',
    },
  });
  logAudit({ action: 'CLOUDPRNT_TEST_TICKET_CREATED', entityType: 'CloudPrntJob', entityId: job.id, ctx: { ...ctx, actorId } });
  return job;
}

export async function listPrinterJobs(printerId: string) {
  await assertPrinterExists(printerId);
  return prisma.cloudPrntJob.findMany({
    where: { printerId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, orderId: true, originalJobId: true, ticketKind: true, status: true,
      attemptCount: true, createdAt: true, fetchedAt: true, acknowledgedAt: true, printedAt: true, lastError: true,
    },
  });
}

export async function reprintJob(printerId: string, jobId: string, actorId: string, ctx?: AuditContext) {
  const job = await prisma.cloudPrntJob.findFirst({ where: { id: jobId, printerId } });
  if (!job) throw ApiError.notFound('Kitchen ticket');
  if (job.status === 'queued' || job.status === 'delivering') {
    throw ApiError.conflict('This ticket is still awaiting delivery. Do not reprint it unless delivery becomes acknowledged or an error is recorded.');
  }
  // Do not silently retry an ambiguous network delivery. Reprint is a deliberate,
  // auditable staff resolution after checking the kitchen. It releases the
  // quarantine atomically with the labelled reprint, so an old DELETE cannot
  // acknowledge another order in the meantime.
  const reprint = await prisma.$transaction(async (tx) => {
    if (isQuarantinedCloudPrntDelivery(job)) {
      const resolved = await tx.cloudPrntJob.updateMany({
        where: {
          id: job.id,
          status: 'error',
          acknowledgedAt: null,
          lastError: UNACKNOWLEDGED_DELIVERY_ERROR,
        },
        data: {
          status: 'cancelled',
          lastError: 'Delivery outcome was unknown. Staff checked the kitchen and explicitly chose this audited reprint.',
        },
      });
      if (!resolved.count) {
        throw ApiError.conflict('This ambiguous delivery was resolved concurrently. Refresh before creating another reprint.');
      }
    }
    return tx.cloudPrntJob.create({
      data: {
        printerId, orderId: job.orderId, originalJobId: job.id, ticketKind: 'reprint',
        contentType: job.contentType,
        payloadText: `*** REPRINT — VERIFY WITH KITCHEN ***\n${job.payloadText}`,
      },
    });
  });
  logAudit({
    action: 'CLOUDPRNT_JOB_REPRINTED', entityType: 'CloudPrntJob', entityId: reprint.id,
    beforeJson: {
      originalJobId: job.id, status: job.status,
      ambiguousDelivery: isQuarantinedCloudPrntDelivery(job),
    },
    ctx: { ...ctx, actorId },
  });
  return reprint;
}

async function assertPrinterExists(printerId: string) {
  const printer = await prisma.cloudPrntPrinter.findUnique({ where: { id: printerId } });
  if (!printer) throw ApiError.notFound('CloudPRNT printer');
  return printer;
}

export async function authenticatePrinter(authorization?: string) {
  const match = authorization?.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) throw ApiError.unauthorized('CloudPRNT credentials are required');
  const encoded = match[1];
  const decoded = Buffer.from(encoded, 'base64');
  // Buffer accepts invalid Base64 silently; verify the canonical payload before
  // splitting the credentials.
  if (!decoded.length || decoded.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
    throw ApiError.unauthorized('Invalid CloudPRNT credentials');
  }
  const value = decoded.toString('utf8');
  const separator = value.indexOf(':');
  if (separator < 1) throw ApiError.unauthorized('Invalid CloudPRNT credentials');
  const printerId = value.slice(0, separator);
  const token = value.slice(separator + 1);
  const printer = await prisma.cloudPrntPrinter.findUnique({ where: { id: printerId } });
  const actual = Buffer.from(hashToken(token));
  const expected = Buffer.from(printer?.tokenHash ?? crypto.randomBytes(32).toString('hex'));
  const valid = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  if (!printer || !printer.isActive || !valid) throw ApiError.unauthorized('Invalid CloudPRNT credentials');
  return printer;
}

async function flagUnacknowledgedDelivery(printerId: string) {
  const cutoff = new Date(Date.now() - DELIVERY_ACK_WINDOW_MS);
  await prisma.cloudPrntJob.updateMany({
    where: { printerId, status: 'delivering', fetchedAt: { lt: cutoff } },
    data: {
      status: 'error',
      lastError: UNACKNOWLEDGED_DELIVERY_ERROR,
    },
  });
}

function assertRequestIdentity(printer: PrinterIdentity, query: CloudPrntJobQuery) {
  // Runtime validation requires mac. Keep this guard because Express's query
  // type is broader than the validated route contract.
  if (!query.mac) throw ApiError.badRequest('CloudPRNT MAC is required');
  if (printer.printerMac && query.mac.toLowerCase() !== printer.printerMac.toLowerCase()) {
    throw ApiError.unauthorized('CloudPRNT printer MAC does not match these credentials');
  }
}

export async function pollPrinter(printerId: string, metadata: {
  printerMAC?: string | null;
  statusCode: string | number;
  printingInProgress?: boolean;
}) {
  await flagUnacknowledgedDelivery(printerId);
  const authenticatedPrinter = await prisma.cloudPrntPrinter.findUniqueOrThrow({
    where: { id: printerId },
    select: { id: true, createdAt: true },
  });
  await reconcileCapturedTicketsForPrinter(authenticatedPrinter);
  const online = isCloudPrntSuccessCode(metadata.statusCode);
  await prisma.cloudPrntPrinter.update({
    where: { id: printerId },
    data: {
      lastSeenAt: new Date(), status: online ? 'online' : 'error',
      lastError: online ? null : `Printer status: ${String(metadata.statusCode).slice(0, 160)}`,
      ...(metadata.printerMAC ? { printerMac: metadata.printerMAC } : {}),
    },
  });
  // A job is reserved during the poll, not the GET. This makes GET repeatable,
  // as CloudPRNT requires, while keeping one durable active job per printer.
  // Only the documented DELETE confirmation can mark it printed; a later POST
  // is not proof that a physical ticket was printed.
  const deliverySlots = await prisma.cloudPrntJob.findMany({
    where: {
      printerId,
      OR: [
        { status: 'delivering' },
        { status: 'error', acknowledgedAt: null, lastError: UNACKNOWLEDGED_DELIVERY_ERROR },
      ],
    },
    orderBy: { fetchedAt: 'asc' },
    select: { id: true, status: true, lastError: true, acknowledgedAt: true },
  });
  const deliverySlot = selectCloudPrntDeliverySlot(deliverySlots);
  // Do not advertise the timed-out ticket again (which could reprint it), and
  // do not claim a later job. This reservation is what makes a late DELETE
  // unambiguously apply to the original ticket.
  if (cloudPrntPollIsQuarantined(deliverySlot)) return { jobReady: false };
  let active: { id: string } | undefined = deliverySlot;
  if (!active && online && !metadata.printingInProgress) {
    const queued = await prisma.cloudPrntJob.findFirst({
      where: { printerId, status: 'queued' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (queued) {
      const claimed = await prisma.cloudPrntJob.updateMany({
        where: { id: queued.id, status: 'queued' },
        data: { status: 'delivering', fetchedAt: new Date(), attemptCount: { increment: 1 } },
      });
      if (claimed.count) active = queued;
    }
  }

  // Never ask an offline client to fetch a job. It remains reserved so an
  // online poll resumes the same ticket rather than creating a duplicate.
  if (!active || !online) return { jobReady: false };
  return cloudPrntPollResponse();
}

export async function fetchJob(printer: PrinterIdentity, query: CloudPrntJobQuery) {
  assertRequestIdentity(printer, query);
  if (!query.type) throw ApiError.badRequest('CloudPRNT media type is required');
  if (query.type.toLowerCase() !== CLOUDPRNT_TEXT_MEDIA_TYPE) {
    throw new ApiError(415, `Unsupported CloudPRNT media type: ${query.type}`);
  }
  const job = await prisma.cloudPrntJob.findFirst({
    where: { printerId: printer.id, status: 'delivering' },
    orderBy: { fetchedAt: 'asc' },
    select: { id: true, contentType: true, payloadText: true },
  });
  if (!job) throw ApiError.notFound('CloudPRNT job');
  // No mutation here: Star explicitly permits the client to re-GET the same
  // document until it sends DELETE confirmation.
  return { contentType: CLOUDPRNT_TEXT_MEDIA_TYPE, payloadText: job.payloadText };
}

export async function completeJob(printer: PrinterIdentity, query: CloudPrntJobQuery) {
  assertRequestIdentity(printer, query);
  const deliverySlots = await prisma.cloudPrntJob.findMany({
    where: {
      printerId: printer.id,
      OR: [
        { status: 'delivering' },
        { status: 'error', acknowledgedAt: null, lastError: UNACKNOWLEDGED_DELIVERY_ERROR },
      ],
    },
    orderBy: { fetchedAt: 'asc' },
  });
  const current = selectCloudPrntDeliverySlot(deliverySlots);
  // CloudPRNT does not echo a server job identifier in DELETE. For an
  // authenticated printer with no active delivery, DELETE is the idempotent
  // completion of an already-terminal job. If A timed out, A remains in the
  // slot so a late DELETE resolves A rather than incorrectly acknowledging B.
  if (!current) return;
  const now = new Date();
  const printed = isCloudPrntSuccessCode(query.code ?? '');
  const completed = await prisma.cloudPrntJob.updateMany({
    // A concurrent DELETE can win this transition. Its loser is idempotent
    // and must not mutate another job. The error predicate prevents a stale
    // request from resolving a staff-resolved ticket.
    where: {
      id: current.id,
      status: current.status,
      ...(isQuarantinedCloudPrntDelivery(current)
        ? { acknowledgedAt: null, lastError: UNACKNOWLEDGED_DELIVERY_ERROR }
        : {}),
    },
    data: {
      status: printed ? 'printed' : 'error',
      acknowledgedAt: now, printedAt: printed ? now : null,
      lastError: printed ? null : `Printer completion status: ${(query.code ?? 'unknown').slice(0, 160)}`,
    },
  });
  if (completed.count && !printed) {
    await prisma.cloudPrntPrinter.update({
      where: { id: printer.id },
      data: { status: 'error', lastError: `Printer completion status: ${(query.code ?? 'unknown').slice(0, 160)}` },
    });
  }
}