import prisma from '../../lib/prisma';

export async function findAll() {
  return prisma.siteSetting.findMany({
    orderBy: [{ category: 'asc' }, { label: 'asc' }],
  });
}

export async function findByKey(settingKey: string) {
  return prisma.siteSetting.findUnique({ where: { settingKey } });
}

export async function findById(id: string) {
  return prisma.siteSetting.findUnique({ where: { id } });
}

export async function create(data: {
  settingKey: string;
  settingValue: string;
  label: string;
  category: string;
}) {
  return prisma.siteSetting.create({ data });
}

export async function update(settingKey: string, data: {
  settingValue?: string;
  label?: string;
  category?: string;
}) {
  return prisma.siteSetting.update({
    where: { settingKey },
    data,
  });
}

export async function remove(settingKey: string) {
  return prisma.siteSetting.delete({ where: { settingKey } });
}

export async function bulkUpsert(
  settings: { settingKey: string; settingValue: string }[]
) {
  const results = await prisma.$transaction(
    settings.map((s) =>
      prisma.siteSetting.upsert({
        where: { settingKey: s.settingKey },
        update: { settingValue: s.settingValue },
        create: {
          settingKey: s.settingKey,
          settingValue: s.settingValue,
          label: s.settingKey,
          category: 'general',
        },
      })
    )
  );
  return results;
}
