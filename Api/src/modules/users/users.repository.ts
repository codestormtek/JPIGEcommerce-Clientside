import prisma from '../../lib/prisma';
import {
  ListUsersInput, AdminUpdateUserInput, UpsertAddressInput,
  UpdateContactPreferencesInput, CreateReviewInput, ListReviewsInput,
  AddPaymentMethodInput,
} from './users.schema';

// ─── Safe user select (never returns passwordHash) ────────────────────────────

export const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  emailAddress: true,
  phoneNumber: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastModifiedAt: true,
} as const;

// ─── Users ────────────────────────────────────────────────────────────────────

export async function findUsers(input: ListUsersInput) {
  const { page, limit, search, role, isActive, orderBy, order } = input;
  const skip = (page - 1) * limit;

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
  return prisma.siteUser.findFirst({
    where: { id, isDeleted: false },
    select: {
      ...safeUserSelect,
      contactPreference: true,
      userAddresses: {
        include: { address: { include: { country: true } } },
      },
    },
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

