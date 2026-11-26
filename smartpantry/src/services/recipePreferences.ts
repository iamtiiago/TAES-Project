import { getActiveProfile, type HouseholdProfile } from '../db/db.ts';

export interface RecipePreferences {
  profileId: string;
  servings: number;
  diet: HouseholdProfile['diet'];
  allergies: string[];
  excludedIngredients: string[];
}

// Read at the start of each search or AI request, rather than caching a profile
// when the application starts. A profile switch then applies to the next request.
export async function getActiveRecipePreferences(): Promise<RecipePreferences> {
  const profile = await getActiveProfile();
  if (!profile) {
    throw new Error('Configura um perfil antes de pesquisar ou pedir sugestões.');
  }

  return {
    profileId: profile.id,
    servings: profile.servings,
    diet: profile.diet,
    allergies: [...profile.allergies],
    excludedIngredients: [...profile.excludedIngredients],
  };
}
