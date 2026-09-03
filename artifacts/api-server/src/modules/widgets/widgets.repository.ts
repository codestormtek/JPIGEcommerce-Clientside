import prisma from '../../lib/prisma';
import type { ListWidgetsInput, CreateWidgetInput, UpdateWidgetInput, CreateWidgetItemInput, UpdateWidgetItemInput } from './widgets.schema';

const widgetInclude = {
  items: {
    where: { isVisible: true },
    orderBy: { sortOrder: 'asc' as const },
    include: {
      mediaAsset: { include: { metadata: true } },
    },
  },
} as const;

const widgetIncludeAll = {
  items: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      mediaAsset: { include: { metadata: true } },
    },
  },
} as const;

function serializeBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeBigInt(val);
    }
    return result;
  }
  return obj;
}

export async function findWidgets(input: ListWidgetsInput) {
  const { page, limit, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where = { isDeleted: false };

  const [items, total] = await Promise.all([
    prisma.widget.findMany({
      where,
      include: widgetIncludeAll,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.widget.count({ where }),
  ]);

  return {
    data: serializeBigInt(items) as typeof items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function findWidgetById(id: string) {
  const widget = await prisma.widget.findFirst({
    where: { id, isDeleted: false },
    include: widgetIncludeAll,
  });
  return widget ? serializeBigInt(widget) as typeof widget : null;
}

export async function findWidgetByPlacement(placement: string) {
  const widget = await prisma.widget.findFirst({
    where: { placement, isDeleted: false, isVisible: true },
    include: widgetInclude,
  });
  return widget ? serializeBigInt(widget) as typeof widget : null;
}

export async function createWidget(input: CreateWidgetInput) {
  const widget = await prisma.widget.create({
    data: input,
    include: widgetIncludeAll,
  });
  return serializeBigInt(widget) as typeof widget;
}

export async function updateWidget(id: string, input: UpdateWidgetInput) {
  const widget = await prisma.widget.update({
    where: { id },
    data: input,
    include: widgetIncludeAll,
  });
  return serializeBigInt(widget) as typeof widget;
}

export async function softDeleteWidget(id: string) {
  return prisma.widget.update({
    where: { id },
    data: { isDeleted: true },
  });
}

export async function createWidgetItem(widgetId: string, input: CreateWidgetItemInput) {
  const item = await prisma.widgetItem.create({
    data: { ...input, widgetId },
    include: { mediaAsset: { include: { metadata: true } } },
  });
  return serializeBigInt(item) as typeof item;
}

export async function updateWidgetItem(itemId: string, input: UpdateWidgetItemInput) {
  const item = await prisma.widgetItem.update({
    where: { id: itemId },
    data: input,
    include: { mediaAsset: { include: { metadata: true } } },
  });
  return serializeBigInt(item) as typeof item;
}

export async function deleteWidgetItem(itemId: string) {
  return prisma.widgetItem.delete({ where: { id: itemId } });
}

export async function findWidgetItemById(itemId: string, widgetId?: string) {
  const item = await prisma.widgetItem.findUnique({
    where: { id: itemId },
    include: { mediaAsset: { include: { metadata: true } } },
  });
  if (!item) return null;
  if (widgetId && item.widgetId !== widgetId) return null;
  return serializeBigInt(item) as typeof item;
}
