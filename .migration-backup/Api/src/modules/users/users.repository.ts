import prisma from '../../lib/prisma';
import {
  ListUsersInput, AdminUpdateUserInput, UpsertAddressInput,
  UpdateContactPreferencesInput, CreateReviewInput, ListReviewsInput,
  AddPaymentMethodInput, ListPaymentMethodsInput,
} from './users.schema';

// ─── Safe user select (never returns passwordHash) ────────────────────────────

export const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  emailAddress: true,
  phoneNumber: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastModifiedAt: true,
} as const;

// ─── Users ────────────────────────────────────────────────────────────────────

export async function findUsers(input: ListUsersInput) {
  const { page, limit, search, role, isActive, createdFrom, createdTo, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const createdAtFilter: Record<string, Date> = {};
  if (createdFrom) createdAtFilter['gte'] = new Date(createdFrom);
  if (createdTo) {
    const to = new Date(createdTo);
    to.setHours(23, 59, 59, 999);
    createdAtFilter['lte'] = to;
  }

  const where = {
    isDeleted: false,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { emailAddress: { contains: search, mode: 'insensitive' as const } },
            { phoneNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.siteUser.findMany({
      where,
      select: safeUserSelect,
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.siteUser.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findUserById(id: string) {
  const user = await prisma.siteUser.findFirst({
    where: { id, isDeleted: false },
    select: {
      ...safeUserSelect,
      contactPreference: true,
      userAddresses: {
        include: { address: { include: { country: true } } },
      },
      orders: {
        select: {
          id: true,
          orderDate: true,
          grandTotal: true,
          currency: true,
          orderStatus: { select: { id: true, status: true } },
          orderType: true,
        },
        orderBy: { orderDate: 'desc' },
        take: 10,
      },
      _count: {
        select: { reviews: true, orders: true },
      },
    },
  });
  return user;
}

export async function getUserOrdersByUserId(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const where = { userId };

  const [data, total] = await Promise.all([
    prisma.shopOrder.findMany({
      where,
      select: {
        id: true,
        orderDate: true,
        grandTotal: true,
        subtotal: true,
        taxTotal: true,
        shippingTotal: true,
        discountTotal: true,
        currency: true,
        orderType: true,
        fulfillmentType: true,
        orderStatus: { select: { id: true, status: true } },
        lines: {
          select: {
            id: true,
            qty: true,
            unitPriceSnapshot: true,
            lineTotal: true,
            skuSnapshot: true,
            productNameSnapshot: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.shopOrder.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserAddressesByUserId(userId: string) {
  return prisma.userAddress.findMany({
    where: { userId },
    include: { address: { include: { country: true } } },
  });
}

export async function updateUser(id: string, data: AdminUpdateUserInput | { phoneNumber?: string }) {
  return prisma.siteUser.update({
    where: { id },
    data: { ...data, lastModifiedAt: new Date() },
    select: safeUserSelect,
  });
}

export async function softDeleteUser(id: string): Promise<void> {
  await prisma.siteUser.update({
    where: { id },
    data: { isDeleted: true, isActive: false, lastModifiedAt: new Date() },
  });
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export interface ListAllAddressesInput {
  page: number;
  limit: number;
  search?: string;
  city?: string;
  region?: string;
  countryId?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export async function listAllAddresses(input: ListAllAddressesInput) {
  const { page, limit, search, city, region, countryId, orderBy = 'label', order = 'asc' } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where['OR'] = [
      { label: { contains: search, mode: 'insensitive' } },
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName: { contains: search, mode: 'insensitive' } } },
      { user: { emailAddress: { contains: search, mode: 'insensitive' } } },
      { address: { addressLine1: { contains: search, mode: 'insensitive' } } },
      { address: { city: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (city) where['address'] = { ...((where['address'] as object) || {}), city: { contains: city, mode: 'insensitive' } };
  if (region) where['address'] = { ...((where['address'] as object) || {}), region: { contains: region, mode: 'insensitive' } };
  if (countryId) where['address'] = { ...((where['address'] as object) || {}), countryId };

  const orderClause: Record<string, unknown> = {};
  if (orderBy === 'city') orderClause['address'] = { city: order };
  else if (orderBy === 'user') orderClause['user'] = { lastName: order };
  else orderClause[orderBy] = order;

  const [data, total] = await Promise.all([
    prisma.userAddress.findMany({
      where,
      include: {
        address: { include: { country: true } },
        user: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
      },
      orderBy: orderClause,
      skip,
      take: limit,
    }),
    prisma.userAddress.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserAddresses(userId: string) {
  return prisma.userAddress.findMany({
    where: { userId },
    include: { address: { include: { country: true } } },
  });
}

export async function addUserAddress(userId: string, input: UpsertAddressInput) {
  // If new address is default, unset others first
  if (input.isDefault) {
    await prisma.userAddress.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      addressLine1: input.address.addressLine1,
      addressLine2: input.address.addressLine2,
      city: input.address.city,
      region: input.address.stateProvince,
      postalCode: input.address.postalCode ?? '',
      countryId: input.address.countryId,
    },
  });

  return prisma.userAddress.create({
    data: { userId, addressId: address.id, label: input.label, isDefault: input.isDefault },
    include: { address: { include: { country: true } } },
  });
}

export async function updateUserAddress(userId: string, userAddressId: string, input: UpsertAddressInput) {
  const existing = await prisma.userAddress.findFirst({ where: { id: userAddressId, userId } });
  if (!existing) throw new Error('Address not found');

  if (input.isDefault) {
    await prisma.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  await prisma.address.update({
    where: { id: existing.addressId },
    data: {
      addressLine1: input.address.addressLine1,
      addressLine2: input.address.addressLine2 ?? null,
      city: input.address.city,
      region: input.address.stateProvince ?? null,
      postalCode: input.address.postalCode ?? '',
      countryId: input.address.countryId,
    },
  });

  return prisma.userAddress.update({
    where: { id: userAddressId },
    data: { label: input.label, isDefault: input.isDefault },
    include: { address: { include: { country: true } } },
  });
}

export async function deleteUserAddress(userId: string, userAddressId: string): Promise<void> {
  await prisma.userAddress.deleteMany({ where: { id: userAddressId, userId } });
}

export async function setDefaultAddress(userId: string, userAddressId: string): Promise<void> {
  await prisma.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
  await prisma.userAddress.update({ where: { id: userAddressId }, data: { isDefault: true } });
}

// ─── Contact Preferences ──────────────────────────────────────────────────────

export async function getContactPreferences(userId: string) {
  return prisma.userContactPreference.findUnique({ where: { userId } });
}

export async function upsertContactPreferences(userId: string, input: UpdateContactPreferencesInput) {
  return prisma.userContactPreference.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  });
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

const reviewInclude = {
  product: { select: { id: true, name: true } },
  user: { select: { id: true, emailAddress: true } },
} as const;

export async function findReviews(input: ListReviewsInput) {
  const { page, limit, isApproved, productId, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (isApproved !== undefined) where['isApproved'] = isApproved;
  if (productId) where['productId'] = productId;

  const [data, total] = await Promise.all([
    prisma.userReview.findMany({ where, include: reviewInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.userReview.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findMyReviews(userId: string, input: ListReviewsInput) {
  const { page, limit, productId, orderBy, order } = input;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { userId };
  if (productId) where['productId'] = productId;

  const [data, total] = await Promise.all([
    prisma.userReview.findMany({ where, include: reviewInclude, orderBy: { [orderBy]: order }, skip, take: limit }),
    prisma.userReview.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findReviewById(id: string) {
  return prisma.userReview.findUnique({ where: { id }, include: reviewInclude });
}

export async function createReview(userId: string, input: CreateReviewInput) {
  return prisma.userReview.create({ data: { userId, ...input }, include: reviewInclude });
}

export async function approveReview(id: string) {
  return prisma.userReview.update({ where: { id }, data: { isApproved: true } });
}

export async function deleteReview(id: string) {
  return prisma.userReview.delete({ where: { id } });
}

// ─── Payment Method Tokens ────────────────────────────────────────────────────

export async function listAllPaymentMethods(input: ListPaymentMethodsInput) {
  const { page, limit, search, orderBy, order } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where['OR'] = [
      { brand: { contains: search, mode: 'insensitive' } },
      { last4: { contains: search } },
      { user: { OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { emailAddress: { contains: search, mode: 'insensitive' } },
      ]}},
    ];
  }

  const [data, total] = await Promise.all([
    prisma.paymentMethodToken.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
      },
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    }),
    prisma.paymentMethodToken.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPaymentMethods(userId: string) {
  return prisma.paymentMethodToken.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findPaymentMethodById(id: string, userId: string) {
  return prisma.paymentMethodToken.findFirst({ where: { id, userId } });
}

export async function addPaymentMethod(userId: string, input: AddPaymentMethodInput) {
  if (input.isDefault) {
    await prisma.paymentMethodToken.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }
  return prisma.paymentMethodToken.create({ data: { userId, ...input } });
}

export async function setDefaultPaymentMethod(userId: string, tokenId: string): Promise<void> {
  await prisma.paymentMethodToken.updateMany({ where: { userId }, data: { isDefault: false } });
  await prisma.paymentMethodToken.update({ where: { id: tokenId }, data: { isDefault: true } });
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await prisma.paymentMethodToken.delete({ where: { id } });
}

// ─── Countries ────────────────────────────────────────────────────────────────

export async function findAllCountries() {
  return prisma.country.findMany({
    select: { id: true, countryName: true, iso2: true },
    orderBy: { countryName: 'asc' },
  });
}

