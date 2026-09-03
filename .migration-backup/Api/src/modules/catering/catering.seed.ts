import prisma from '../../lib/prisma';

export async function seedCateringData() {
  console.log('Seeding catering data...');

  const existingItems = await prisma.cateringMenuItem.count();
  if (existingItems > 0) {
    console.log('Catering data already seeded, skipping.');
    return;
  }

  const meats = [
    { name: 'Pulled Pork', category: 'MEAT' as const, pricingType: 'PER_LB' as const, unitPrice: 14.99, portionUnit: 'lbs', description: 'Slow-smoked pulled pork, hand-pulled and seasoned' },
    { name: 'Pulled Chicken', category: 'MEAT' as const, pricingType: 'PER_LB' as const, unitPrice: 13.99, portionUnit: 'lbs', description: 'Tender smoked chicken, pulled and ready to serve' },
    { name: 'Ribs', category: 'MEAT' as const, pricingType: 'PER_RACK' as const, unitPrice: 24.99, isPremium: true, portionUnit: 'racks', description: 'St. Louis style spare ribs, fall-off-the-bone tender' },
    { name: 'Smoked Wings', category: 'MEAT' as const, pricingType: 'PER_DOZEN' as const, unitPrice: 18.99, portionUnit: 'wings', description: 'Jumbo smoked wings with your choice of sauce' },
    { name: 'Sausage', category: 'MEAT' as const, pricingType: 'PER_LB' as const, unitPrice: 12.99, portionUnit: 'lbs', description: 'House-made smoked sausage links' },
    { name: 'Smoked Turkey Legs', category: 'MEAT' as const, pricingType: 'PER_PIECE' as const, unitPrice: 8.99, isPremium: true, portionUnit: 'legs', description: 'Massive smoked turkey legs, festival style' },
  ];

  const sides = [
    { name: 'Mac & Cheese', category: 'SIDE' as const, pricingType: 'PER_HALF_PAN' as const, unitPrice: 35.00, portionUnit: 'half pans', description: 'Creamy baked mac and cheese' },
    { name: 'Baked Beans', category: 'SIDE' as const, pricingType: 'PER_HALF_PAN' as const, unitPrice: 30.00, portionUnit: 'half pans', description: 'Sweet and smoky baked beans' },
    { name: 'Green Beans', category: 'SIDE' as const, pricingType: 'PER_HALF_PAN' as const, unitPrice: 28.00, portionUnit: 'half pans', description: 'Southern-style green beans' },
    { name: 'Cole Slaw', category: 'SIDE' as const, pricingType: 'PER_HALF_PAN' as const, unitPrice: 25.00, portionUnit: 'half pans', description: 'Fresh creamy coleslaw' },
  ];

  const breads = [
    { name: 'Rolls', category: 'BREAD' as const, pricingType: 'PER_DOZEN' as const, unitPrice: 6.00, portionUnit: 'dozen', description: 'Fresh baked dinner rolls' },
  ];

  const sauces = [
    { name: 'Original BBQ Sauce', category: 'SAUCE' as const, pricingType: 'PER_BOTTLE' as const, unitPrice: 0.00, portionUnit: 'bottles', description: 'Our signature original BBQ sauce' },
    { name: 'Spicy BBQ Sauce', category: 'SAUCE' as const, pricingType: 'PER_BOTTLE' as const, unitPrice: 0.00, portionUnit: 'bottles', description: 'Kick it up with our spicy blend' },
    { name: 'Sweet Heat Sauce', category: 'SAUCE' as const, pricingType: 'PER_BOTTLE' as const, unitPrice: 0.00, portionUnit: 'bottles', description: 'Sweet with a hint of heat' },
    { name: 'Carolina Gold Sauce', category: 'SAUCE' as const, pricingType: 'PER_BOTTLE' as const, unitPrice: 0.00, portionUnit: 'bottles', description: 'Tangy mustard-based Carolina gold' },
  ];

  const drinks = [
    { name: 'Sweet Tea', category: 'DRINK' as const, pricingType: 'PER_GALLON' as const, unitPrice: 8.00, portionUnit: 'gallons', description: 'Southern sweet tea, brewed fresh' },
    { name: 'Peach Tea', category: 'DRINK' as const, pricingType: 'PER_GALLON' as const, unitPrice: 9.00, portionUnit: 'gallons', description: 'Sweet tea with real peach flavor' },
  ];

  const allItems = [...meats, ...sides, ...breads, ...sauces, ...drinks];
  const createdItems: Record<string, string> = {};

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const { isPremium, ...rest } = item as typeof item & { isPremium?: boolean };
    const created = await prisma.cateringMenuItem.create({
      data: {
        ...rest,
        isPremium: isPremium || false,
        isActive: true,
        displayOrder: i,
      },
    });
    createdItems[item.name] = created.id;
  }

  console.log(`Created ${allItems.length} catering menu items`);

  const portionRules = [
    { name: 'Pulled Pork', light: 0.25, moderate: 0.33, heavy: 0.5, unit: 'lbs' },
    { name: 'Pulled Chicken', light: 0.25, moderate: 0.33, heavy: 0.5, unit: 'lbs' },
    { name: 'Ribs', light: 0.33, moderate: 0.5, heavy: 0.75, unit: 'racks' },
    { name: 'Smoked Wings', light: 2, moderate: 3, heavy: 4, unit: 'wings' },
    { name: 'Sausage', light: 0.2, moderate: 0.33, heavy: 0.5, unit: 'lbs' },
    { name: 'Smoked Turkey Legs', light: 0.5, moderate: 0.75, heavy: 1, unit: 'legs' },
    { name: 'Mac & Cheese', light: 0.04, moderate: 0.05, heavy: 0.067, unit: 'half pans' },
    { name: 'Baked Beans', light: 0.04, moderate: 0.05, heavy: 0.067, unit: 'half pans' },
    { name: 'Green Beans', light: 0.04, moderate: 0.05, heavy: 0.067, unit: 'half pans' },
    { name: 'Cole Slaw', light: 0.04, moderate: 0.05, heavy: 0.067, unit: 'half pans' },
    { name: 'Rolls', light: 0.083, moderate: 0.1, heavy: 0.125, unit: 'dozen' },
    { name: 'Sweet Tea', light: 0.08, moderate: 0.1, heavy: 0.133, unit: 'gallons' },
    { name: 'Peach Tea', light: 0.08, moderate: 0.1, heavy: 0.133, unit: 'gallons' },
  ];

  for (const rule of portionRules) {
    const menuItemId = createdItems[rule.name];
    if (!menuItemId) continue;

    for (const level of ['LIGHT', 'MODERATE', 'HEAVY'] as const) {
      const qty = level === 'LIGHT' ? rule.light : level === 'MODERATE' ? rule.moderate : rule.heavy;
      await prisma.cateringPortionRule.create({
        data: {
          menuItemId,
          appetiteLevel: level,
          qtyPerPerson: qty,
          unitOfMeasure: rule.unit,
        },
      });
    }
  }

  console.log(`Created ${portionRules.length * 3} portion rules`);

  const packages = [
    {
      name: 'Pulled Pork Sandwich Pack',
      slug: 'pulled-pork-sandwich-pack',
      description: 'Classic pulled pork sandwiches with 2 sides, rolls, and sauces',
      includedMeatCount: 1, includedSideCount: 2, includedSauceCount: 2,
      includesRolls: true, includesTea: false,
      tiers: [
        { minGuests: 10, maxGuests: 20, pricePerPerson: 14.99 },
        { minGuests: 21, maxGuests: 35, pricePerPerson: 13.99 },
        { minGuests: 36, maxGuests: 50, pricePerPerson: 12.99 },
        { minGuests: 51, maxGuests: 100, pricePerPerson: 11.99 },
      ],
      defaultMeats: ['Pulled Pork'],
    },
    {
      name: 'Smokehouse Combo Pack',
      slug: 'smokehouse-combo-pack',
      description: '2 meats, 2 sides, rolls, and sauces — our most popular catering package',
      includedMeatCount: 2, includedSideCount: 2, includedSauceCount: 2,
      includesRolls: true, includesTea: false,
      tiers: [
        { minGuests: 15, maxGuests: 25, pricePerPerson: 18.99 },
        { minGuests: 26, maxGuests: 40, pricePerPerson: 17.49 },
        { minGuests: 41, maxGuests: 60, pricePerPerson: 16.49 },
        { minGuests: 61, maxGuests: 100, pricePerPerson: 15.49 },
      ],
      defaultMeats: ['Pulled Pork', 'Pulled Chicken'],
    },
    {
      name: 'Rib Party Pack',
      slug: 'rib-party-pack',
      description: 'Premium rib pack with 2 sides, rolls, and all signature sauces',
      includedMeatCount: 1, includedSideCount: 2, includedSauceCount: 4,
      includesRolls: true, includesTea: false,
      tiers: [
        { minGuests: 10, maxGuests: 20, pricePerPerson: 22.99 },
        { minGuests: 21, maxGuests: 35, pricePerPerson: 21.49 },
        { minGuests: 36, maxGuests: 50, pricePerPerson: 19.99 },
        { minGuests: 51, maxGuests: 100, pricePerPerson: 18.99 },
      ],
      defaultMeats: ['Ribs'],
    },
    {
      name: 'Wing Party Pack',
      slug: 'wing-party-pack',
      description: 'Smoked wings with 2 sides and all 4 signature sauces',
      includedMeatCount: 1, includedSideCount: 2, includedSauceCount: 4,
      includesRolls: false, includesTea: false,
      tiers: [
        { minGuests: 15, maxGuests: 25, pricePerPerson: 16.99 },
        { minGuests: 26, maxGuests: 40, pricePerPerson: 15.99 },
        { minGuests: 41, maxGuests: 60, pricePerPerson: 14.99 },
        { minGuests: 61, maxGuests: 100, pricePerPerson: 13.99 },
      ],
      defaultMeats: ['Smoked Wings'],
    },
    {
      name: 'Pitmaster Pack',
      slug: 'pitmaster-pack',
      description: 'The ultimate BBQ spread — 3 meats, 3 sides, rolls, tea, and all sauces',
      includedMeatCount: 3, includedSideCount: 3, includedSauceCount: 4,
      includesRolls: true, includesTea: true,
      tiers: [
        { minGuests: 20, maxGuests: 30, pricePerPerson: 24.99 },
        { minGuests: 31, maxGuests: 50, pricePerPerson: 22.99 },
        { minGuests: 51, maxGuests: 75, pricePerPerson: 21.49 },
        { minGuests: 76, maxGuests: 150, pricePerPerson: 19.99 },
      ],
      defaultMeats: ['Pulled Pork', 'Ribs', 'Smoked Wings'],
    },
  ];

  for (let i = 0; i < packages.length; i++) {
    const { defaultMeats, tiers, ...pkgData } = packages[i];
    const pkg = await prisma.cateringPackage.create({
      data: {
        ...pkgData,
        displayOrder: i,
        tiers: {
          create: tiers.map((t, ti) => ({ ...t, displayOrder: ti })),
        },
      },
    });

    for (const meatName of defaultMeats) {
      const menuItemId = createdItems[meatName];
      if (menuItemId) {
        await prisma.cateringPackageItem.create({
          data: {
            packageId: pkg.id,
            menuItemId,
            isDefault: true,
            isRequired: false,
          },
        });
      }
    }
  }

  console.log(`Created ${packages.length} catering packages with tiers`);

  const zones = [
    { name: 'Local (0-10 miles)', zipCodes: ['39208', '39209', '39212', '39213', '39204', '39206', '39211', '39216'], fee: 0, minOrderAmount: 150 },
    { name: 'Nearby (10-20 miles)', zipCodes: ['39042', '39047', '39110', '39157', '39056', '39232', '39272'], fee: 25, minOrderAmount: 250 },
    { name: 'Extended (20-30 miles)', zipCodes: ['39402', '39501', '39503', '39301', '39073', '39194'], fee: 50, minOrderAmount: 400 },
  ];

  for (let i = 0; i < zones.length; i++) {
    await prisma.cateringDeliveryZone.create({
      data: { ...zones[i], displayOrder: i },
    });
  }

  console.log(`Created ${zones.length} delivery zones`);

  await prisma.cateringAvailability.create({
    data: {
      maxOrdersPerDay: 3,
      leadTimeDays: 2,
      cutoffHour: 17,
      reason: 'Default availability settings',
      isActive: true,
    },
  });

  console.log('Created default availability rule');
  console.log('Catering seed data complete!');
}
