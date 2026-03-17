import { ApiError } from '../../utils/apiError';
import * as repo from './site-settings.repository';
import type { CreateSettingInput, UpdateSettingInput, BulkUpdateSettingsInput } from './site-settings.schema';

export async function getAllSettings() {
  return repo.findAll();
}

export async function getSettingByKey(key: string) {
  const setting = await repo.findByKey(key);
  if (!setting) throw ApiError.notFound('Site setting');
  return setting;
}

export async function createSetting(input: CreateSettingInput) {
  const existing = await repo.findByKey(input.settingKey);
  if (existing) throw ApiError.conflict('A setting with this key already exists');
  return repo.create(input);
}

export async function updateSetting(key: string, input: UpdateSettingInput) {
  const existing = await repo.findByKey(key);
  if (!existing) throw ApiError.notFound('Site setting');
  return repo.update(key, input);
}

export async function deleteSetting(key: string) {
  const existing = await repo.findByKey(key);
  if (!existing) throw ApiError.notFound('Site setting');
  return repo.remove(key);
}

export async function bulkUpdateSettings(input: BulkUpdateSettingsInput) {
  return repo.bulkUpsert(input.settings);
}

const DEFAULT_SETTINGS = [
  { settingKey: 'promo_banner_text', settingValue: 'FREE delivery & 40% Discount for next 3 orders! Place your 1st order in.', label: 'Promo Banner Text', category: 'header' },
  { settingKey: 'promo_banner_countdown', settingValue: '02/02/2026 10:20:00', label: 'Promo Banner Countdown', category: 'header' },
  { settingKey: 'support_phone', settingValue: '+258 3268 21485', label: 'Support Phone Number', category: 'header' },
  { settingKey: 'support_phone_href', settingValue: 'tel:+2583268214855', label: 'Support Phone Link', category: 'header' },
  { settingKey: 'delivery_hours_text', settingValue: 'We deliver to your everyday from 7:00 to 22:00', label: 'Delivery Hours Text', category: 'header' },
  { settingKey: 'trending_products_text', settingValue: 'Trending Products', label: 'Trending Products Button Text', category: 'header' },
  { settingKey: 'trending_products_link', settingValue: '/shop', label: 'Trending Products Button Link', category: 'header' },
  { settingKey: 'sale_banner_text', settingValue: 'Get 30% Discount Now', label: 'Sale Banner Button Text', category: 'header' },
  { settingKey: 'sale_banner_link', settingValue: '/shop-grid-top-filter', label: 'Sale Banner Button Link', category: 'header' },
  { settingKey: 'discount_section_title', settingValue: 'Products With Discounts', label: 'Discount Section Title', category: 'homepage_promotions' },
  { settingKey: 'discount_countdown', settingValue: '12/05/2025 10:20:00', label: 'Discount Countdown Date', category: 'homepage_promotions' },
  { settingKey: 'discount_banner_1', settingValue: JSON.stringify({ title: '', subtitle: 'Fresh Juice', price_label: 'Only', link: '/shop', image_url: '' }), label: 'Discount Banner 1 (left top)', category: 'homepage_promotions' },
  { settingKey: 'discount_banner_2', settingValue: JSON.stringify({ title: '', subtitle: 'Fresh Juice', price_label: 'Only', link: '/shop', image_url: '' }), label: 'Discount Banner 2 (left bottom)', category: 'homepage_promotions' },
  { settingKey: 'feature_card_1', settingValue: JSON.stringify({ badge: 'Weekend Discount', title: 'Drink Fresh Corn Juice', subtitle: 'Good Taste', link: '/shop', image_url: '' }), label: 'Feature Promo Card 1', category: 'homepage_promotions' },
  { settingKey: 'feature_card_2', settingValue: JSON.stringify({ badge: 'Weekend Discount', title: 'Organic Lemon Flavored', subtitle: 'Banana Chips', link: '/shop', image_url: '' }), label: 'Feature Promo Card 2', category: 'homepage_promotions' },
  { settingKey: 'feature_card_3', settingValue: JSON.stringify({ badge: 'Weekend Discount', title: 'Nozes Pecanera Brasil', subtitle: 'Chocolate Snacks', link: '/shop', image_url: '' }), label: 'Feature Promo Card 3', category: 'homepage_promotions' },
  { settingKey: 'feature_card_4', settingValue: JSON.stringify({ badge: 'Weekend Discount', title: 'Strawberry Water Drinks', subtitle: 'Flavors Awesome', link: '/shop', image_url: '' }), label: 'Feature Promo Card 4', category: 'homepage_promotions' },
  { settingKey: 'feature_strip_1_title', settingValue: 'Best Prices & Offers', label: 'Feature Strip 1 – Title', category: 'feature_strip' },
  { settingKey: 'feature_strip_1_desc', settingValue: 'We offer the best BBQ prices and special deals for our customers.', label: 'Feature Strip 1 – Description', category: 'feature_strip' },
  { settingKey: 'feature_strip_2_title', settingValue: '100% Return Policy', label: 'Feature Strip 2 – Title', category: 'feature_strip' },
  { settingKey: 'feature_strip_2_desc', settingValue: 'Not satisfied? We make it right with our hassle-free return policy.', label: 'Feature Strip 2 – Description', category: 'feature_strip' },
  { settingKey: 'feature_strip_3_title', settingValue: 'Support 24/7', label: 'Feature Strip 3 – Title', category: 'feature_strip' },
  { settingKey: 'feature_strip_3_desc', settingValue: 'Our team is here around the clock to help with any questions.', label: 'Feature Strip 3 – Description', category: 'feature_strip' },
  { settingKey: 'feature_strip_4_title', settingValue: 'Great Offer Daily Deal', label: 'Feature Strip 4 – Title', category: 'feature_strip' },
  { settingKey: 'feature_strip_4_desc', settingValue: 'Check back daily for fresh deals and limited-time BBQ specials.', label: 'Feature Strip 4 – Description', category: 'feature_strip' },
  { settingKey: 'footer_phone', settingValue: '1-800-513-1710', label: 'Footer Phone Number (display)', category: 'footer' },
  { settingKey: 'footer_phone_href', settingValue: 'tel:18005131710', label: 'Footer Phone Link (href)', category: 'footer' },
  { settingKey: 'footer_location', settingValue: 'Located in the metro DC area', label: 'Footer Location Text', category: 'footer' },
  { settingKey: 'footer_newsletter_text', settingValue: 'Subscribe to the mailing list to receive updates on the new arrivals and other discounts', label: 'Footer Newsletter Tagline', category: 'footer' },
];

export async function seedDefaultSettings() {
  for (const def of DEFAULT_SETTINGS) {
    const existing = await repo.findByKey(def.settingKey);
    if (!existing) {
      await repo.create(def);
    } else if (existing.category === 'general' && def.category !== 'general') {
      await repo.update(def.settingKey, { category: def.category, label: def.label });
    }
  }
}
