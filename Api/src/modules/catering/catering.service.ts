import { ApiError } from '../../utils/apiError';
import { CalculateEstimateInput, SubmitQuoteInput, UpdateQuoteInput } from './catering.schema';
import * as repo from './catering.repository';

export async function getPublicMenu() {
  return repo.findActiveMenuItemsGrouped();
}

export async function getPublicPackages() {
  return repo.findActivePackages();
}

export async function calculateEstimate(input: CalculateEstimateInput) {
  const { guestCount, appetiteLevel = 'MODERATE', selectedItems, deliveryZip, setupRequested, disposableKit } = input;

  const allItems = await repo.findMenuItems({ page: 1, limit: 200, isActive: true });
  const itemMap = new Map(allItems.data.map(i => [i.id, i]));

  const lineItems: {
    menuItemId: string;
    itemName: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    lineTotal: number;
  }[] = [];

  for (const sel of selectedItems) {
    const item = itemMap.get(sel.menuItemId);
    if (!item) continue;

    const portionRule = item.portionRules.find(
      (r: { appetiteLevel: string }) => r.appetiteLevel === appetiteLevel,
    );

    let quantity: number;
    if (sel.quantity) {
      quantity = sel.quantity;
    } else if (portionRule) {
      quantity = Math.ceil(Number(portionRule.qtyPerPerson) * guestCount);
    } else {
      quantity = guestCount;
    }

    const unitPrice = Number(item.unitPrice);
    const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
    const unitOfMeasure = portionRule?.unitOfMeasure || item.portionUnit || 'unit';

    lineItems.push({
      menuItemId: item.id,
      itemName: item.name,
      quantity,
      unitOfMeasure,
      unitPrice,
      lineTotal,
    });
  }

  const foodSubtotal = Math.round(lineItems.reduce((sum, li) => sum + li.lineTotal, 0) * 100) / 100;

  let deliveryFee = 0;
  if (deliveryZip) {
    const zone = await repo.findDeliveryZoneByZip(deliveryZip);
    if (zone) deliveryFee = Number(zone.fee);
  }

  const setupFee = setupRequested ? 50 : 0;
  const disposableFee = disposableKit ? Math.ceil(guestCount * 0.75) : 0;

  const totalEstimate = Math.round((foodSubtotal + deliveryFee + setupFee + disposableFee) * 100) / 100;

  const packages = await repo.findActivePackages();
  const suggestedPackages = packages
    .filter(pkg => {
      const selectedMeats = selectedItems.filter(si => {
        const it = itemMap.get(si.menuItemId);
        return it && it.category === 'MEAT';
      }).length;
      return selectedMeats <= pkg.includedMeatCount;
    })
    .map(pkg => {
      const tier = pkg.tiers.find(
        t => guestCount >= t.minGuests && guestCount <= t.maxGuests,
      );
      if (!tier) return null;
      const packagePrice = tier.flatPrice
        ? Number(tier.flatPrice)
        : Number(tier.pricePerPerson) * guestCount;
      return {
        id: pkg.id,
        name: pkg.name,
        slug: pkg.slug,
        description: pkg.description,
        price: packagePrice,
        savings: Math.max(0, Math.round((foodSubtotal - packagePrice) * 100) / 100),
        tier: {
          label: tier.tierLabel,
          minGuests: tier.minGuests,
          maxGuests: tier.maxGuests,
          pricePerPerson: Number(tier.pricePerPerson),
        },
      };
    })
    .filter(Boolean);

  return {
    lineItems,
    foodSubtotal,
    deliveryFee,
    setupFee,
    disposableFee,
    totalEstimate,
    guestCount,
    appetiteLevel,
    suggestedPackages,
  };
}

export async function submitQuote(input: SubmitQuoteInput) {
  const quoteNumber = await repo.getNextQuoteNumber();
  return repo.createQuote({ ...input, quoteNumber });
}

export async function updateQuote(id: string, input: UpdateQuoteInput) {
  const existing = await repo.findQuoteById(id);
  if (!existing) throw ApiError.notFound('Catering quote');
  return repo.updateQuote(id, input);
}

export async function checkAvailability(dateStr: string) {
  const date = new Date(dateStr);
  const { blockedRule, defaultRule, bookedCount } = await repo.findAvailabilityForDate(date);

  if (blockedRule) {
    return {
      available: false,
      reason: blockedRule.reason || 'This date is not available for catering orders.',
    };
  }

  const maxOrders = defaultRule?.maxOrdersPerDay ?? 3;
  const leadTimeDays = defaultRule?.leadTimeDays ?? 2;
  const cutoffHour = defaultRule?.cutoffHour ?? 17;

  const now = new Date();
  const leadDate = new Date(now);
  leadDate.setDate(leadDate.getDate() + leadTimeDays);
  if (now.getHours() >= cutoffHour) {
    leadDate.setDate(leadDate.getDate() + 1);
  }

  if (date < leadDate) {
    return {
      available: false,
      reason: `We require at least ${leadTimeDays} day(s) advance notice for catering orders.`,
    };
  }

  if (bookedCount >= maxOrders) {
    return {
      available: false,
      reason: 'This date is fully booked. Please choose another date.',
    };
  }

  return {
    available: true,
    slotsRemaining: maxOrders - bookedCount,
    leadTimeDays,
    cutoffHour,
  };
}

export async function checkDeliveryFee(zip: string) {
  const zone = await repo.findDeliveryZoneByZip(zip);
  if (!zone) {
    return {
      available: false,
      message: 'We do not currently deliver to this ZIP code. Please contact us for special arrangements.',
    };
  }
  return {
    available: true,
    zoneName: zone.name,
    fee: Number(zone.fee),
    minOrderAmount: zone.minOrderAmount ? Number(zone.minOrderAmount) : null,
  };
}

export async function getDashboard() {
  return repo.getDashboardStats();
}

export async function getProduction(dateStr: string) {
  const date = new Date(dateStr);
  return repo.getProductionForDate(date);
}
