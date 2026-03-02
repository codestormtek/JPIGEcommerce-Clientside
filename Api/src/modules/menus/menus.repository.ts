import prisma from '../../lib/prisma';
import {
  ListMenusInput, CreateMenuInput, UpdateMenuInput,
  CreateSectionInput, UpdateSectionInput, AddSectionItemInput,
  ListMenuItemsInput, CreateMenuItemInput, UpdateMenuItemInput,
} from './menus.schema';

const menuInclude = {
  sections: {
    orderBy: { displayOrder: 'asc' as const },
    include: {
      items: {
        orderBy: { displayOrder: 'asc' as const },
        include: { menuItem: true },
      },
    },
  },
} as const;

const menuItemInclude = {
  optionGroups: {
    orderBy: { displayOrder: 'asc' as const },
    include: { options: { orderBy: { displayOrder: 'asc' as const } } },
  },
  productMaps: { include: { product: true, productItem: true } },
} as const;

// ─── Menus ────────────────────────────────────────────────────────────────────

export async function findMenus(input: ListMenusInput) {
  const { page, limit, menuType, isActive, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { isDeleted: false };
  if (menuType) where['menuType'] = menuType;
  if (isActive !== undefined) where['isActive'] = isActive;

  const [data, total] = await Promise.all([
    prisma.menu.findMany({ where, include: menuInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.menu.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findMenuById(id: string) {
  return prisma.menu.findFirst({ where: { id, isDeleted: false }, include: menuInclude });
}

export async function createMenu(input: CreateMenuInput) {
  return prisma.menu.create({ data: input, include: menuInclude });
}

export async function updateMenu(id: string, input: UpdateMenuInput) {
  return prisma.menu.update({ where: { id }, data: input, include: menuInclude });
}

export async function softDeleteMenu(id: string) {
  return prisma.menu.update({ where: { id }, data: { isDeleted: true } });
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function findSectionById(id: string) {
  return prisma.menuSection.findUnique({
    where: { id },
    include: { items: { include: { menuItem: true } } },
  });
}

export async function createSection(menuId: string, input: CreateSectionInput) {
  return prisma.menuSection.create({
    data: { menuId, ...input },
    include: { items: { include: { menuItem: true } } },
  });
}

export async function updateSection(id: string, input: UpdateSectionInput) {
  return prisma.menuSection.update({
    where: { id },
    data: input,
    include: { items: { include: { menuItem: true } } },
  });
}

export async function deleteSection(id: string) {
  await prisma.menuSectionItem.deleteMany({ where: { menuSectionId: id } });
  return prisma.menuSection.delete({ where: { id } });
}

// ─── Section items ─────────────────────────────────────────────────────────────

export async function addItemToSection(sectionId: string, input: AddSectionItemInput) {
  return prisma.menuSectionItem.create({
    data: { menuSectionId: sectionId, menuItemId: input.menuItemId, displayOrder: input.displayOrder, priceOverride: input.priceOverride },
    include: { menuItem: true },
  });
}

export async function removeItemFromSection(sectionId: string, menuItemId: string) {
  return prisma.menuSectionItem.delete({ where: { menuSectionId_menuItemId: { menuSectionId: sectionId, menuItemId } } });
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export async function findMenuItems(input: ListMenuItemsInput) {
  const { page, limit, isActive, pricingModel, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { isDeleted: false };
  if (isActive !== undefined) where['isActive'] = isActive;
  if (pricingModel) where['pricingModel'] = pricingModel;

  const [data, total] = await Promise.all([
    prisma.menuItem.findMany({ where, include: menuItemInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.menuItem.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findMenuItemById(id: string) {
  return prisma.menuItem.findFirst({ where: { id, isDeleted: false }, include: menuItemInclude });
}

export async function createMenuItem(input: CreateMenuItemInput) {
  return prisma.menuItem.create({ data: input, include: menuItemInclude });
}

export async function updateMenuItem(id: string, input: UpdateMenuItemInput) {
  return prisma.menuItem.update({ where: { id }, data: input, include: menuItemInclude });
}

export async function softDeleteMenuItem(id: string) {
  return prisma.menuItem.update({ where: { id }, data: { isDeleted: true } });
}

