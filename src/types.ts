
export interface UserProfile {
  age: number;
  weight: number; // in kg
  height: number; // in cm
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal: 'lose' | 'maintain' | 'gain';
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foodItems?: string[];
}

export interface Meal {
  id: string;
  name: string;
  timestamp: number;
  nutrition: NutritionData;
  type: 'breakfast' | 'morning_snack' | 'lunch' | 'evening_snack' | 'dinner';
  imageUrl?: string;
  composition?: string;
}

export interface WeightLog {
  date: string; // YYYY-MM-DD
  weight: number;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  dailyBudget: number;
}

export interface Reminder {
  id: string;
  time: string; // HH:mm
  label: string;
  enabled: boolean;
}
