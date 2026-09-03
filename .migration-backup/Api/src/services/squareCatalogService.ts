import { randomUUID } from 'crypto';
import { getSquareClient } from '../lib/square';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

export function isSquareConfigured(): boolean {
  return Boolean((process.env.SQUARE_ACCESS_TOKEN ?? '').trim());
}

/**
 * Push a single product to the Square catalog (create or update).
 * Stores the resulting Square catalog object id on the product row.
 */
export async function syncProductToSquare(productId: string): Promise<{ squareCatalogObjectId: string }> {
  if (!isSquareConfigured()) {
    throw new Error('Square is not configured (SQUARE_ACCESS_TOKEN missing)');
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, isDeleted: false },
  });
  if (!product) throw new Error(`Product ${productId} not found`);

  const client = getSquareClient();
  const priceCents = BigInt(Math.round(Number(product.price) * 100));

  // For updates, Square requires the current object version and the real
  // variation id. Fetch the existing catalog item first; if it no longer
  // exists in Square, fall back to creating a new one.
  let itemId = `#jpig-item-${product.id}`;
  let itemVersion: bigint | undefined;
  let variationId = `#jpig-var-${product.id}`;
  let variationVersion: bigint | undefined;

  if (product.squareCatalogObjectId) {
    try {
      const existing = await client.catalog.object.get({
        objectId: product.squareCatalogObjectId,
      });
      const obj = existing.object;
      if (obj && obj.type === 'ITEM') {
        itemId = obj.id;
        itemVersion = obj.version ?? undefined;
        const firstVariation = obj.itemData?.variations?.[0];
        if (firstVariation && firstVariation.type === 'ITEM_VARIATION') {
          variationId = firstVariation.id;
          variationVersion = firstVariation.version ?? undefined;
        }
      }
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status !== 404) throw err;
      // Object was deleted in Square — recreate it with fresh client ids.
      logger.warn(`Square catalog object ${product.squareCatalogObjectId} not found; recreating item for product ${product.id}`);
    }
  }

  const response = await client.catalog.object.upsert({
    idempotencyKey: randomUUID(),
    object: {
      type: 'ITEM',
      id: itemId,
      version: itemVersion,
      itemData: {
        name: product.name,
        description: product.description ?? undefined,
        variations: [
          {
            type: 'ITEM_VARIATION',
            id: variationId,
            version: variationVersion,
            itemVariationData: {
              itemId: itemVersion !== undefined ? itemId : undefined,
              name: 'Regular',
              pricingType: 'FIXED_PRICING',
              priceMoney: { amount: priceCents, currency: 'USD' },
            },
          },
        ],
      },
    },
  });

  const catalogObject = response.catalogObject;
  const squareId = catalogObject?.id;
  if (!squareId) {
    throw new Error('Square did not return a catalog object id');
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { squareCatalogObjectId: squareId, squareSyncedAt: new Date() },
  });

  return { squareCatalogObjectId: squareId };
}

/**
 * Fire-and-forget sync used after product create/update.
 * Never throws; logs failures.
 */
export function syncProductToSquareInBackground(productId: string): void {
  if (!isSquareConfigured()) return;
  syncProductToSquare(productId).catch((err) => {
    const details = (err as { body?: unknown }).body;
    logger.warn(
      `Square catalog sync failed for product ${productId}: ${err instanceof Error ? err.message : err}` +
        (details ? ` | ${JSON.stringify(details)}` : ''),
    );
  });
}

export interface SquareSyncSummary {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ productId: string; name: string; error: string }>;
}

/**
 * Sync all non-deleted products to Square, sequentially (gentle on rate limits).
 */
export async function syncAllProductsToSquare(): Promise<SquareSyncSummary> {
  if (!isSquareConfigured()) {
    throw new Error('Square is not configured (SQUARE_ACCESS_TOKEN missing)');
  }

  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const summary: SquareSyncSummary = { total: products.length, synced: 0, failed: 0, errors: [] };

  for (const p of products) {
    try {
      await syncProductToSquare(p.id);
      summary.synced++;
    } catch (err) {
      summary.failed++;
      summary.errors.push({
        productId: p.id,
        name: p.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info(`Square catalog sync complete: ${summary.synced}/${summary.total} synced, ${summary.failed} failed`);
  return summary;
}
