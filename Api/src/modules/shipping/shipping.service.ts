import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { config } from '../../config';
import * as shippo from '../../services/shippoService';
import { GetRatesInput } from './shipping.schema';

export async function getShippingRates(input: GetRatesInput) {
  if (!config.shippo.enabled) {
    throw ApiError.badRequest('Live shipping rates are not configured. Please contact support.');
  }

  // Fetch product item dimensions from DB
  const ids = input.items.map((i) => i.productItemId);
  const productItems = await prisma.productItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, weight: true, length: true, width: true, height: true, shippingClass: true },
  });

  if (productItems.length === 0) {
    throw ApiError.badRequest('No valid product items found');
  }

  const cartDimensions: shippo.CartItemDimensions[] = input.items.map((item) => {
    const pi = productItems.find((p) => p.id === item.productItemId);
    return {
      productItemId: item.productItemId,
      qty: item.qty,
      weightOz: pi?.weight != null ? Number(pi.weight) : null,
      length: pi?.length != null ? Number(pi.length) : null,
      width: pi?.width != null ? Number(pi.width) : null,
      height: pi?.height != null ? Number(pi.height) : null,
      shippingClass: pi?.shippingClass ?? null,
    };
  });

  const toAddress: shippo.ShippoAddress = {
    name: input.address.name,
    street1: input.address.street1,
    street2: input.address.street2,
    city: input.address.city,
    state: input.address.state,
    zip: input.address.zip,
    country: input.address.country ?? 'US',
    phone: input.address.phone,
    email: input.address.email,
  };

  const rates = await shippo.getRates(cartDimensions, toAddress);
  const parcel = shippo.calculateParcel(cartDimensions);

  return {
    rates,
    parcel: {
      weight: parcel.weight,
      mass_unit: parcel.mass_unit,
      length: parcel.length,
      width: parcel.width,
      height: parcel.height,
      distance_unit: parcel.distance_unit,
      boxName: parcel.boxName,
    },
  };
}
