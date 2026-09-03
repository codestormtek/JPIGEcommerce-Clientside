import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { CreateDashboardInput, UpdateDashboardInput, CreateWidgetInput, UpdateWidgetInput } from './dashboards.schema';

// ─── Shared selects ───────────────────────────────────────────────────────────

const widgetSelect = {
  id: true,
  dashboardId: true,
  title: true,
  type: true,
  x: true,
  y: true,
  w: true,
  h: true,
  metricKey: true,
  source: true,
  configJson: true,
  createdAt: true,
  updatedAt: true,
} as const;

const dashboardSelect = {
  id: true,
  name: true,
  scope: true,
  ownerUserId: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  widgets: { select: widgetSelect, orderBy: { y: 'asc' as const } },
} as const;

// ─── Dashboards ───────────────────────────────────────────────────────────────

export async function findDashboards(ownerUserId?: string) {
  return prisma.dashboard.findMany({
    where: {
      isActive: true,
      ...(ownerUserId
        ? { OR: [{ ownerUserId }, { scope: { in: ['STORE', 'GLOBAL'] } }] }
        : { scope: { in: ['STORE', 'GLOBAL'] } }),
    },
    select: dashboardSelect,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function findDashboardById(id: string) {
  return prisma.dashboard.findUnique({ where: { id }, select: dashboardSelect });
}

export async function createDashboard(data: CreateDashboardInput, ownerUserId: string) {
  return prisma.dashboard.create({
    data: {
      name: data.name,
      scope: data.scope,
      ownerUserId: data.scope === 'USER' ? ownerUserId : null,
      isDefault: data.isDefault,
    },
    select: dashboardSelect,
  });
}

export async function updateDashboard(id: string, data: UpdateDashboardInput) {
  return prisma.dashboard.update({ where: { id }, data, select: dashboardSelect });
}

export async function deleteDashboard(id: string) {
  return prisma.dashboard.update({ where: { id }, data: { isActive: false } });
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

export async function findWidgetById(id: string) {
  return prisma.dashboardWidget.findUnique({ where: { id }, select: widgetSelect });
}

export async function createWidget(dashboardId: string, data: CreateWidgetInput) {
  return prisma.dashboardWidget.create({
    data: {
      dashboardId,
      title: data.title,
      type: data.type,
      x: data.x,
      y: data.y,
      w: data.w,
      h: data.h,
      metricKey: data.metricKey,
      source: data.source,
      configJson: data.configJson as Prisma.InputJsonValue,
    },
    select: widgetSelect,
  });
}

export async function updateWidget(id: string, data: UpdateWidgetInput) {
  return prisma.dashboardWidget.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.x !== undefined && { x: data.x }),
      ...(data.y !== undefined && { y: data.y }),
      ...(data.w !== undefined && { w: data.w }),
      ...(data.h !== undefined && { h: data.h }),
      ...(data.metricKey !== undefined && { metricKey: data.metricKey }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.configJson !== undefined && { configJson: data.configJson as Prisma.InputJsonValue }),
    },
    select: widgetSelect,
  });
}

export async function deleteWidget(id: string) {
  return prisma.dashboardWidget.delete({ where: { id } });
}

