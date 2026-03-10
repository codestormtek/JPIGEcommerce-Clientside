import prisma from '../../lib/prisma';
import {
  ListCateringMenuItemsInput,
  CreateCateringMenuItemInput,
  UpdateCateringMenuItemInput,
  ListPortionRulesInput,
  CreatePortionRuleInput,
  UpdatePortionRuleInput,
  ListPackagesInput,
  CreatePackageInput,
  UpdatePackageInput,
  ListDeliveryZonesInput,
  CreateDeliveryZoneInput,
  UpdateDeliveryZoneInput,
  ListAvailabilityInput,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  ListQuotesInput,
  SubmitQuoteInput,
  UpdateQuoteInput,
} from './catering.schema';

// ─── Menu Items ──────────────────────────────────────────────────────────────

const menuItemInclude = {
  portionRules: true,
  mediaAsset: true,
} as const;

export async function findMenuItems(input: ListCateringMenuItemsInput) {
  const { page, limit, category, isActive, includeDeleted } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (!includeDeleted) where['isDeleted'] = false;
  if (category) where['category'] = category;
  if (isActive !== undefined) where['isActive'] = isActive;

  const [data, total] = await Promise.all([
    prisma.cateringMenuItem.findMany({
      where,
      include: menuItemInclude,
      orderBy: { displayOrder: 'asc' },
      skip,
      take: limit,
    }),
    prisma.cateringMenuItem.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findMenuItemById(id: string) {
  return prisma.cateringMenuItem.findUnique({ where: { id }, include: menuItemInclude });
}

export async function createMenuItem(data: CreateCateringMenuItemInput) {
  return prisma.cateringMenuItem.create({ data, include: menuItemInclude });
}

export async function updateMenuItem(id: string, data: UpdateCateringMenuItemInput) {
  return prisma.cateringMenuItem.update({ where: { id }, data, include: menuItemInclude });
}

export async function softDeleteMenuItem(id: string) {
  return prisma.cateringMenuItem.update({ where: { id }, data: { isDeleted: true, isActive: false } });
}

export async function findActiveMenuItemsGrouped() {
  const items = await prisma.cateringMenuItem.findMany({
    where: { isDeleted: false, isActive: true },
    include: { portionRules: true, mediaAsset: true },
    orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
  });
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const cat = item.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  return grouped;
}

// ─── Portion Rules ───────────────────────────────────────────────────────────

const portionRuleInclude = {
  menuItem: { select: { id: true, name: true, category: true, portionUnit: true } },
} as const;

export async function findPortionRules(input: ListPortionRulesInput) {
  const { page, limit, menuItemId, appetiteLevel } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (menuItemId) where['menuItemId'] = menuItemId;
  if (appetiteLevel) where['appetiteLevel'] = appetiteLevel;

  const [data, total] = await Promise.all([
    prisma.cateringPortionRule.findMany({
      where,
      include: portionRuleInclude,
      orderBy: { menuItem: { displayOrder: 'asc' } },
      skip,
      take: limit,
    }),
    prisma.cateringPortionRule.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findPortionRuleById(id: string) {
  return prisma.cateringPortionRule.findUnique({ where: { id }, include: portionRuleInclude });
}

export async function createPortionRule(data: CreatePortionRuleInput) {
  return prisma.cateringPortionRule.create({ data, include: portionRuleInclude });
}

export async function updatePortionRule(id: string, data: UpdatePortionRuleInput) {
  return prisma.cateringPortionRule.update({ where: { id }, data, include: portionRuleInclude });
}

export async function deletePortionRule(id: string) {
  return prisma.cateringPortionRule.delete({ where: { id } });
}

// ─── Packages ────────────────────────────────────────────────────────────────

const packageInclude = {
  tiers: { orderBy: { displayOrder: 'asc' as const } },
  items: {
    include: { menuItem: { select: { id: true, name: true, category: true } } },
    orderBy: { displayOrder: 'asc' as const },
  },
  mediaAsset: true,
} as const;

export async function findPackages(input: ListPackagesInput) {
  const { page, limit, isActive, includeDeleted } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (!includeDeleted) where['isDeleted'] = false;
  if (isActive !== undefined) where['isActive'] = isActive;

  const [data, total] = await Promise.all([
    prisma.cateringPackage.findMany({
      where,
      include: packageInclude,
      orderBy: { displayOrder: 'asc' },
      skip,
      take: limit,
    }),
    prisma.cateringPackage.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findPackageById(id: string) {
  return prisma.cateringPackage.findUnique({ where: { id }, include: packageInclude });
}

export async function createPackage(input: CreatePackageInput) {
  const { tiers, items, ...data } = input;
  return prisma.cateringPackage.create({
    data: {
      ...data,
      tiers: tiers ? { create: tiers.map(({ id: _id, ...t }) => t) } : undefined,
      items: items ? { create: items.map(({ id: _id, ...i }) => i) } : undefined,
    },
    include: packageInclude,
  });
}

export async function updatePackage(id: string, input: UpdatePackageInput) {
  const { tiers, items, ...data } = input;

  if (tiers) {
    await prisma.cateringPackageTier.deleteMany({ where: { packageId: id } });
    await prisma.cateringPackageTier.createMany({
      data: tiers.map(({ id: _id, ...t }) => ({ ...t, packageId: id })),
    });
  }
  if (items) {
    await prisma.cateringPackageItem.deleteMany({ where: { packageId: id } });
    await prisma.cateringPackageItem.createMany({
      data: items.map(({ id: _id, ...i }) => ({ ...i, packageId: id })),
    });
  }

  return prisma.cateringPackage.update({ where: { id }, data, include: packageInclude });
}

export async function softDeletePackage(id: string) {
  return prisma.cateringPackage.update({ where: { id }, data: { isDeleted: true, isActive: false } });
}

export async function findActivePackages() {
  return prisma.cateringPackage.findMany({
    where: { isDeleted: false, isActive: true },
    include: packageInclude,
    orderBy: { displayOrder: 'asc' },
  });
}

// ─── Delivery Zones ──────────────────────────────────────────────────────────

export async function findDeliveryZones(input: ListDeliveryZonesInput) {
  const { page, limit, isActive } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where['isActive'] = isActive;

  const [data, total] = await Promise.all([
    prisma.cateringDeliveryZone.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      skip,
      take: limit,
    }),
    prisma.cateringDeliveryZone.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findDeliveryZoneById(id: string) {
  return prisma.cateringDeliveryZone.findUnique({ where: { id } });
}

export async function createDeliveryZone(data: CreateDeliveryZoneInput) {
  return prisma.cateringDeliveryZone.create({ data });
}

export async function updateDeliveryZone(id: string, data: UpdateDeliveryZoneInput) {
  return prisma.cateringDeliveryZone.update({ where: { id }, data });
}

export async function deleteDeliveryZone(id: string) {
  return prisma.cateringDeliveryZone.delete({ where: { id } });
}

export async function findDeliveryZoneByZip(zip: string) {
  return prisma.cateringDeliveryZone.findFirst({
    where: { isActive: true, zipCodes: { has: zip } },
    orderBy: { fee: 'asc' },
  });
}

// ─── Availability ────────────────────────────────────────────────────────────

export async function findAvailability(input: ListAvailabilityInput) {
  const { page, limit, isActive } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where['isActive'] = isActive;

  const [data, total] = await Promise.all([
    prisma.cateringAvailability.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.cateringAvailability.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findAvailabilityById(id: string) {
  return prisma.cateringAvailability.findUnique({ where: { id } });
}

export async function createAvailability(data: CreateAvailabilityInput) {
  return prisma.cateringAvailability.create({
    data: {
      ...data,
      blockedDate: data.blockedDate ? new Date(data.blockedDate) : null,
    },
  });
}

export async function updateAvailability(id: string, data: UpdateAvailabilityInput) {
  return prisma.cateringAvailability.update({
    where: { id },
    data: {
      ...data,
      blockedDate: data.blockedDate !== undefined
        ? (data.blockedDate ? new Date(data.blockedDate) : null)
        : undefined,
    },
  });
}

export async function deleteAvailability(id: string) {
  return prisma.cateringAvailability.delete({ where: { id } });
}

export async function findAvailabilityForDate(date: Date) {
  const blockedRule = await prisma.cateringAvailability.findFirst({
    where: { isActive: true, blockedDate: date },
  });
  const defaultRule = await prisma.cateringAvailability.findFirst({
    where: { isActive: true, blockedDate: null },
    orderBy: { createdAt: 'desc' },
  });
  const bookedCount = await prisma.cateringQuote.count({
    where: {
      eventDate: date,
      status: { in: ['APPROVED', 'QUOTED', 'PENDING'] },
    },
  });
  return { blockedRule, defaultRule, bookedCount };
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

const quoteInclude = {
  items: {
    include: {
      menuItem: { select: { id: true, name: true, category: true } },
    },
  },
  user: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
} as const;

export async function findQuotes(input: ListQuotesInput) {
  const { page, limit, status, eventType, search, dateFrom, dateTo, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (eventType) where['eventType'] = eventType;
  if (search) {
    where['OR'] = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
      { quoteNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (dateFrom || dateTo) {
    const eventDateFilter: Record<string, unknown> = {};
    if (dateFrom) eventDateFilter['gte'] = new Date(dateFrom);
    if (dateTo) eventDateFilter['lte'] = new Date(dateTo);
    where['eventDate'] = eventDateFilter;
  }

  const [data, total] = await Promise.all([
    prisma.cateringQuote.findMany({
      where,
      include: quoteInclude,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.cateringQuote.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findQuoteById(id: string) {
  return prisma.cateringQuote.findUnique({ where: { id }, include: quoteInclude });
}

export async function createQuote(input: SubmitQuoteInput & { quoteNumber: string }) {
  const { items, ...data } = input;
  return prisma.cateringQuote.create({
    data: {
      ...data,
      eventDate: new Date(data.eventDate),
      items: { create: items },
    },
    include: quoteInclude,
  });
}

export async function updateQuote(id: string, data: UpdateQuoteInput) {
  return prisma.cateringQuote.update({
    where: { id },
    data: {
      ...data,
      expiresAt: data.expiresAt !== undefined
        ? (data.expiresAt ? new Date(data.expiresAt) : null)
        : undefined,
    },
    include: quoteInclude,
  });
}

export async function deleteQuote(id: string) {
  return prisma.cateringQuote.delete({ where: { id } });
}

export async function getNextQuoteNumber(): Promise<string> {
  const last = await prisma.cateringQuote.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { quoteNumber: true },
  });
  if (!last) return 'JPIG-CAT-000001';
  const num = parseInt(last.quoteNumber.replace('JPIG-CAT-', ''), 10);
  return `JPIG-CAT-${String(num + 1).padStart(6, '0')}`;
}

// ─── Dashboard / Production ─────────────────────────────────────────────────

export async function getDashboardStats() {
  const [pendingQuotes, bookedEvents, allApproved, prepItems] = await Promise.all([
    prisma.cateringQuote.count({ where: { status: { in: ['PENDING', 'QUOTED'] } } }),
    prisma.cateringQuote.count({ where: { status: 'APPROVED' } }),
    prisma.cateringQuote.findMany({
      where: { status: 'APPROVED' },
      select: { totalEstimate: true },
    }),
    prisma.cateringQuoteItem.count({
      where: { quote: { status: 'APPROVED' } },
    }),
  ]);
  const projectedRevenue = allApproved.reduce(
    (sum, q) => sum + Number(q.totalEstimate), 0,
  );
  return { pendingQuotes, bookedEvents, projectedRevenue, prepItems };
}

export async function getProductionForDate(date: Date) {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const items = await prisma.cateringQuoteItem.findMany({
    where: {
      quote: {
        status: { in: ['APPROVED', 'CONVERTED'] },
        eventDate: { gte: date, lt: nextDay },
      },
    },
    include: {
      menuItem: { select: { id: true, name: true, category: true } },
    },
  });

  const aggregated: Record<string, { name: string; category: string; totalQty: number; unit: string }> = {};
  for (const item of items) {
    const key = item.menuItemId || item.itemName;
    if (!aggregated[key]) {
      aggregated[key] = {
        name: item.itemName,
        category: item.menuItem?.category || 'OTHER',
        totalQty: 0,
        unit: item.unitOfMeasure,
      };
    }
    aggregated[key].totalQty += Number(item.quantity);
  }
  return Object.values(aggregated);
}
