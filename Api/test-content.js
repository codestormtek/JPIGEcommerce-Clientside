const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    const rows = await p.contentPost.findMany({
      take: 1,
      where: { isDeleted: false },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        media: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' } },
        featuredMediaAsset: true,
        authorUser: { select: { id: true, firstName: true, lastName: true, emailAddress: true } },
      },
    });
    console.log('OK - rows:', rows.length);
  } catch (e) {
    console.error('DB ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();

