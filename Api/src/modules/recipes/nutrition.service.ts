import prisma from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';

const USDA_API_KEY = process.env['USDA_API_KEY'] || '';
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

interface NutrientTotals {
  calories: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbs: number;
  fiber: number;
  sugar: number;
  protein: number;
  vitaminD: number;
  calcium: number;
  iron: number;
  potassium: number;
}

interface IngredientMatch {
  ingredientName: string;
  quantity: number;
  unit: string;
  matched: boolean;
  usdaFood: string | null;
  fdcId: number | null;
  gramsUsed: number;
  nutrients: Partial<NutrientTotals>;
  error?: string;
}

const NUTRIENT_ID_MAP: Record<number, keyof NutrientTotals> = {
  1008: 'calories',
  1003: 'protein',
  1004: 'totalFat',
  1258: 'saturatedFat',
  1257: 'transFat',
  1253: 'cholesterol',
  1093: 'sodium',
  1005: 'totalCarbs',
  1079: 'fiber',
  1063: 'sugar',
  1114: 'vitaminD',
  1087: 'calcium',
  1089: 'iron',
  1092: 'potassium',
};

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  ml: 1,
  l: 1000,
  piece: 100,
  slice: 30,
  clove: 5,
  bunch: 150,
  pinch: 0.5,
  each: 100,
};

function unitToGrams(quantity: number, unit: string): number {
  const qty = isNaN(quantity) || quantity <= 0 ? 0 : quantity;
  const key = unit.toLowerCase().replace(/s$/, '');
  const factor = UNIT_TO_GRAMS[key] ?? 100;
  return qty * factor;
}

async function searchUSDA(query: string): Promise<{ description: string; fdcId: number; nutrients: any[] } | null> {
  if (!USDA_API_KEY) throw ApiError.internal('USDA_API_KEY is not configured');

  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=${USDA_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw ApiError.internal(`USDA API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  const foods = data.foods ?? [];
  if (foods.length === 0) return null;

  const preferred = foods.find((f: any) =>
    f.dataType === 'Survey (FNDDS)' || f.dataType === 'SR Legacy'
  );
  const best = preferred || foods[0];

  return {
    description: best.description,
    fdcId: best.fdcId,
    nutrients: best.foodNutrients ?? [],
  };
}

function extractNutrientsPer100g(foodNutrients: any[]): Partial<NutrientTotals> {
  const result: Partial<NutrientTotals> = {};
  for (const fn of foodNutrients) {
    const id = fn.nutrientId ?? fn.nutrientNumber;
    const numId = typeof id === 'string' ? parseInt(id) : id;
    const key = NUTRIENT_ID_MAP[numId];
    if (key && fn.value !== undefined) {
      result[key] = fn.value;
    }
  }
  return result;
}

function scaleNutrients(per100g: Partial<NutrientTotals>, grams: number): Partial<NutrientTotals> {
  const factor = grams / 100;
  const scaled: Partial<NutrientTotals> = {};
  for (const [key, val] of Object.entries(per100g)) {
    scaled[key as keyof NutrientTotals] = Math.round((val as number) * factor * 100) / 100;
  }
  return scaled;
}

function emptyTotals(): NutrientTotals {
  return {
    calories: 0, totalFat: 0, saturatedFat: 0, transFat: 0,
    cholesterol: 0, sodium: 0, totalCarbs: 0, fiber: 0,
    sugar: 0, protein: 0, vitaminD: 0, calcium: 0, iron: 0, potassium: 0,
  };
}

export async function analyzeRecipe(recipeId: string) {
  if (!USDA_API_KEY) throw ApiError.internal('USDA_API_KEY is not configured. Please add it to your environment secrets.');

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!recipe) throw ApiError.notFound('Recipe');
  if (recipe.ingredients.length === 0) {
    throw ApiError.badRequest('Recipe has no ingredients to analyze');
  }

  const totals = emptyTotals();
  const matches: IngredientMatch[] = [];

  for (const ing of recipe.ingredients) {
    const grams = unitToGrams(Number(ing.quantity), ing.unit);
    const match: IngredientMatch = {
      ingredientName: ing.ingredientName,
      quantity: Number(ing.quantity),
      unit: ing.unit,
      matched: false,
      usdaFood: null,
      fdcId: null,
      gramsUsed: grams,
      nutrients: {},
    };

    try {
      const result = await searchUSDA(ing.ingredientName);
      if (result) {
        match.matched = true;
        match.usdaFood = result.description;
        match.fdcId = result.fdcId;
        const per100g = extractNutrientsPer100g(result.nutrients);
        const scaled = scaleNutrients(per100g, grams);
        match.nutrients = scaled;

        for (const [key, val] of Object.entries(scaled)) {
          totals[key as keyof NutrientTotals] += val as number;
        }
      } else {
        match.error = 'No match found in USDA database';
      }
    } catch (err: any) {
      match.error = err.message || 'Failed to search USDA';
    }

    matches.push(match);
  }

  for (const key of Object.keys(totals) as (keyof NutrientTotals)[]) {
    totals[key] = Math.round(totals[key] * 100) / 100;
  }

  const servingsPerRecipe = recipe.servings || 1;

  const nutrition = await prisma.recipeNutrition.upsert({
    where: { recipeId },
    create: {
      recipeId,
      servingSize: `1/${servingsPerRecipe} of recipe`,
      servingsPerRecipe,
      calories: totals.calories,
      totalFat: totals.totalFat,
      saturatedFat: totals.saturatedFat,
      transFat: totals.transFat,
      cholesterol: totals.cholesterol,
      sodium: totals.sodium,
      totalCarbs: totals.totalCarbs,
      fiber: totals.fiber,
      sugar: totals.sugar,
      protein: totals.protein,
      vitaminD: totals.vitaminD,
      calcium: totals.calcium,
      iron: totals.iron,
      potassium: totals.potassium,
      ingredientMatchesJson: JSON.stringify(matches),
      analyzedAt: new Date(),
    },
    update: {
      servingSize: `1/${servingsPerRecipe} of recipe`,
      servingsPerRecipe,
      calories: totals.calories,
      totalFat: totals.totalFat,
      saturatedFat: totals.saturatedFat,
      transFat: totals.transFat,
      cholesterol: totals.cholesterol,
      sodium: totals.sodium,
      totalCarbs: totals.totalCarbs,
      fiber: totals.fiber,
      sugar: totals.sugar,
      protein: totals.protein,
      vitaminD: totals.vitaminD,
      calcium: totals.calcium,
      iron: totals.iron,
      potassium: totals.potassium,
      ingredientMatchesJson: JSON.stringify(matches),
      analyzedAt: new Date(),
    },
  });

  return {
    ...serializeNutrition(nutrition),
    ingredientMatches: matches,
  };
}

export async function getNutrition(recipeId: string) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) throw ApiError.notFound('Recipe');

  const nutrition = await prisma.recipeNutrition.findUnique({
    where: { recipeId },
  });

  if (!nutrition) return null;

  let ingredientMatches: any[] = [];
  if (nutrition.ingredientMatchesJson) {
    try {
      ingredientMatches = JSON.parse(nutrition.ingredientMatchesJson);
    } catch {
      ingredientMatches = [];
    }
  }

  return {
    ...serializeNutrition(nutrition),
    ingredientMatches,
  };
}

export async function deleteNutrition(recipeId: string) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) throw ApiError.notFound('Recipe');

  const existing = await prisma.recipeNutrition.findUnique({ where: { recipeId } });
  if (!existing) throw ApiError.notFound('Nutrition data');

  await prisma.recipeNutrition.delete({ where: { recipeId } });
}

function serializeNutrition(n: any) {
  return {
    id: n.id,
    recipeId: n.recipeId,
    servingSize: n.servingSize,
    servingsPerRecipe: n.servingsPerRecipe,
    calories: Number(n.calories),
    totalFat: Number(n.totalFat),
    saturatedFat: Number(n.saturatedFat),
    transFat: Number(n.transFat),
    cholesterol: Number(n.cholesterol),
    sodium: Number(n.sodium),
    totalCarbs: Number(n.totalCarbs),
    fiber: Number(n.fiber),
    sugar: Number(n.sugar),
    protein: Number(n.protein),
    vitaminD: Number(n.vitaminD),
    calcium: Number(n.calcium),
    iron: Number(n.iron),
    potassium: Number(n.potassium),
    analyzedAt: n.analyzedAt,
  };
}
