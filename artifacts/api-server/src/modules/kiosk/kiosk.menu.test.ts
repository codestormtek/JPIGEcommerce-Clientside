import assert from 'node:assert/strict';
import test from 'node:test';
import { assertKioskMenuLineEligibility } from './kiosk.service';

const menuFor = (available: boolean) => ({
  categories: [{ id: 'food', name: 'Food', imageUrl: null }],
  products: [{
    id: 'plate',
    name: 'Plate',
    description: null,
    imageUrl: '',
    categoryIds: ['food'],
    primaryCategoryId: 'food',
    available,
    comboSideCount: 0,
    comboSideCategoryId: null,
    duplicateSideUpcharge: 0,
    items: [{ id: 'plate-item', sku: 'PLATE', price: 10, available }],
  }],
});

test('a zero-stock published menu item is displayable but rejected at checkout eligibility', () => {
  assert.throws(
    () => assertKioskMenuLineEligibility(menuFor(false), [{ productItemId: 'plate-item' }]),
    (error: unknown) =>
      error instanceof Error
      && error.message === 'MENU_CHANGED'
      && (error as { statusCode?: number }).statusCode === 409,
  );
});

test('the same menu line becomes eligible after a mock restock', () => {
  assert.doesNotThrow(() =>
    assertKioskMenuLineEligibility(menuFor(true), [{ productItemId: 'plate-item' }]),
  );
});