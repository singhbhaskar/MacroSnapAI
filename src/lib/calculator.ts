
import { UserProfile } from "../types";

export function calculateDailyBudget(profile: UserProfile): number {
  const { age, weight, height, gender, activityLevel, goal } = profile;

  // Mifflin-St Jeor Equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };

  let tdee = bmr * activityMultipliers[activityLevel];

  if (goal === 'lose') tdee -= 500;
  if (goal === 'gain') tdee += 500;

  return Math.round(tdee);
}

export function splitBudgetIntoMeals(total: number) {
  return {
    breakfast: Math.round(total * 0.20),
    morning_snack: Math.round(total * 0.10),
    lunch: Math.round(total * 0.30),
    evening_snack: Math.round(total * 0.10),
    dinner: Math.round(total * 0.30),
  };
}

export function calculateMacroTargets(profile: UserProfile, dailyBudget: number) {
  // Indians often have a "thin-fat" phenotype, requiring higher relative protein 
  // and controlled carbs to manage metabolic health.
  
  // Protein: 1.2g - 1.5g per kg is better for body composition than the basic 0.8-1g
  const proteinGrams = Math.round(profile.weight * 1.3);
  const proteinCalories = proteinGrams * 4;

  // Fat: 25-30% of total calories
  const fatCalories = dailyBudget * 0.25;
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs: Remainder of budget
  const carbCalories = dailyBudget - proteinCalories - fatCalories;
  const carbGrams = Math.round(carbCalories / 4);

  return {
    protein: proteinGrams,
    carbs: carbGrams,
    fat: fatGrams
  };
}
