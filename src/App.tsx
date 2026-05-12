/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  History, 
  User, 
  Bell, 
  Camera, 
  Image as ImageIcon,
  Upload,
  Keyboard, 
  X, 
  Check, 
  UtensilsCrossed, 
  Flame, 
  Trophy,
  ChevronRight,
  Settings as SettingsIcon,
  Trash2,
  Sparkles,
  Search,
  TrendingUp,
  Scale,
  Edit2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { cn, formatNumber } from './lib/utils';
import { calculateDailyBudget, splitBudgetIntoMeals, calculateMacroTargets } from './lib/calculator';
import { scanMealImage, estimateNutritionFromText } from './services/geminiService';
import type { UserProfile, Meal, DayLog, Reminder, NutritionData, WeightLog } from './types';

// --- Default Data ---
const DEFAULT_PROFILE: UserProfile = {
  age: 30,
  weight: 75,
  height: 175,
  gender: 'male',
  activityLevel: 'moderately_active',
  goal: 'maintain'
};

const DEFAULT_REMINDERS: Reminder[] = [
  { id: '1', time: '08:00', label: 'Breakfast', enabled: true },
  { id: '2', time: '13:00', label: 'Lunch', enabled: true },
  { id: '3', time: '19:00', label: 'Dinner', enabled: true }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile' | 'reminders' | 'trends'>('home');
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('macrosnap_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });
  const [meals, setMeals] = useState<Meal[]>(() => {
    const saved = localStorage.getItem('macrosnap_meals');
    return saved ? JSON.parse(saved) : [];
  });
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => {
    const saved = localStorage.getItem('macrosnap_weight_logs');
    return saved ? JSON.parse(saved) : [{ date: format(new Date(), 'yyyy-MM-dd'), weight: DEFAULT_PROFILE.weight }];
  });
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('macrosnap_reminders');
    return saved ? JSON.parse(saved) : DEFAULT_REMINDERS;
  });
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    localStorage.setItem('macrosnap_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('macrosnap_meals', JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem('macrosnap_weight_logs', JSON.stringify(weightLogs));
  }, [weightLogs]);

  useEffect(() => {
    localStorage.setItem('macrosnap_reminders', JSON.stringify(reminders));
  }, [reminders]);

  const dailyBudget = calculateDailyBudget(profile);
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayMeals = meals.filter(m => format(m.timestamp, 'yyyy-MM-dd') === todayDate);
  
  const consumedCalories = todayMeals.reduce((acc, m) => acc + m.nutrition.calories, 0);
  const consumedProtein = todayMeals.reduce((acc, m) => acc + m.nutrition.protein, 0);
  const consumedCarbs = todayMeals.reduce((acc, m) => acc + m.nutrition.carbs, 0);
  const consumedFat = todayMeals.reduce((acc, m) => acc + m.nutrition.fat, 0);

  const budgetSplit = splitBudgetIntoMeals(dailyBudget);
  const macroTargets = calculateMacroTargets(profile, dailyBudget);

  const addMeal = (mealData: Omit<Meal, 'id' | 'timestamp'>, overrideTimestamp?: number) => {
    if (editingMeal) {
      setMeals(meals.map(m => m.id === editingMeal.id ? { 
        ...m, 
        ...mealData, 
        timestamp: overrideTimestamp ?? m.timestamp 
      } : m));
      setEditingMeal(null);
    } else {
      const newMeal: Meal = {
        ...mealData,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: overrideTimestamp ?? Date.now()
      };
      setMeals([newMeal, ...meals]);
    }
    setIsLoggingMeal(false);
  };

  const deleteMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-brand-secondary text-zinc-100 relative shadow-2xl shadow-emerald-500/5">
      {/* Header */}
      <header className="p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-brand-primary tracking-tight leading-none mb-1">
              MacroSnap
            </h1>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              AI Nutrition Assistant
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-10 h-10 rounded-full bg-brand-zinc-900 border border-brand-zinc-800 flex items-center justify-center hover:scale-105 transition-transform"
          >
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center font-bold text-brand-primary text-xs">AI</div>
          </button>
        </div>

        {activeTab === 'home' && (
          <div className="grid grid-cols-2 gap-3">
            {/* Calories Card - Bento Style */}
            <div className="col-span-2 bento-card flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                <h3 className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Calories Remaining</h3>
                {consumedCalories > dailyBudget ? (
                  <span className="bg-rose-500/10 text-rose-500 text-[10px] font-bold px-2 py-0.5 rounded tracking-tighter">OVER BUDGET</span>
                ) : consumedCalories > dailyBudget * 0.9 ? (
                  <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded tracking-tighter">NEAR LIMIT</span>
                ) : (
                  <span className="bg-brand-primary/10 text-brand-primary text-[10px] font-bold px-2 py-0.5 rounded tracking-tighter">ON TARGET</span>
                )}
              </div>
              
              <div className="flex items-baseline gap-2 mt-2">
                <span className={cn("text-5xl font-black tabular-nums font-display leading-none", consumedCalories > dailyBudget ? "text-rose-500" : "text-zinc-100")}>
                  {formatNumber(Math.max(0, dailyBudget - consumedCalories))}
                </span>
                <span className="text-xs font-medium text-zinc-500 italic">kcal left of {formatNumber(dailyBudget)}</span>
              </div>

              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (consumedCalories / dailyBudget) * 100)}%` }}
                  className={cn("h-full shadow-[0_0_10px_rgba(16,185,129,0.4)]", consumedCalories > dailyBudget ? "bg-rose-500 shadow-rose-500/40" : "bg-brand-primary")}
                />
              </div>
            </div>

            {/* Prescribed Meals Targets */}
            <div className="col-span-2 bento-card p-4">
              <h3 className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest mb-3">Today's Targets</h3>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(budgetSplit).map(([type, target]) => {
                   const consumed = todayMeals.filter(m => m.type === type).reduce((acc, m) => acc + m.nutrition.calories, 0);
                   const percent = Math.min(100, (consumed / target) * 100);
                   return (
                     <div key={type} className="flex flex-col items-center">
                       <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mb-1">
                         <div 
                           className={cn("h-full", percent > 100 ? "bg-rose-500" : "bg-emerald-500")} 
                           style={{ width: `${percent}%` }} 
                         />
                       </div>
                       <span className="text-[8px] font-black uppercase text-zinc-500 truncate w-full text-center">
                         {type.replace('_', ' ')}
                       </span>
                       <span className="text-[10px] font-bold text-zinc-300">{target}</span>
                     </div>
                   );
                })}
              </div>
            </div>

            {/* Quick Macro Breakdown */}
            <div className="col-span-1 bento-card p-4">
              <h3 className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest mb-3">Macros (Indian Opt.)</h3>
              <div className="space-y-3">
                <SimpleMacro label="Protein" value={consumedProtein} max={macroTargets.protein} color="bg-blue-500" />
                <SimpleMacro label="Carbs" value={consumedCarbs} max={macroTargets.carbs} color="bg-yellow-500" />
                <SimpleMacro label="Fat" value={consumedFat} max={macroTargets.fat} color="bg-rose-500" />
              </div>
            </div>

            {/* Quick Stats / Goal Info */}
            <div className={cn(
              "col-span-1 rounded-3xl p-5 flex flex-col justify-between shadow-lg transition-all",
              consumedCalories > dailyBudget 
                ? "bg-rose-500 text-zinc-950 shadow-rose-500/10" 
                : "bg-brand-primary text-zinc-950 shadow-brand-primary/10"
            )}>
              <div className="flex justify-between items-start">
                <h3 className="uppercase text-[10px] font-black tracking-widest opacity-60">Status</h3>
                <Trophy className="w-4 h-4 opacity-40" />
              </div>
              <div className="mt-4">
                <div className="text-xl font-black leading-none">
                  {consumedCalories > dailyBudget 
                    ? "Warning" 
                    : (consumedProtein > profile.weight * 2 && consumedCarbs > profile.weight * 4) 
                      ? "Full Fuel" 
                      : "Healthy"}
                </div>
                <p className="text-[10px] font-bold opacity-80 leading-tight mt-1">
                  {consumedCalories > dailyBudget 
                    ? "You've exceeded your daily calorie goal." 
                    : consumedProtein < profile.weight * 1.5 
                      ? "Focus on hitting your protein target!" 
                      : "You're doing great! Keep it up."}
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="p-6 pt-0">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mt-4">
                <h2 className="text-lg font-display font-bold text-zinc-100 uppercase tracking-widest opacity-60">Today's Log</h2>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-bold text-brand-primary flex items-center gap-1 uppercase tracking-wider"
                >
                  History <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {todayMeals.length === 0 ? (
                  <div className="p-8 text-center bento-card border-dashed border-brand-zinc-700">
                    <UtensilsCrossed className="w-10 h-10 text-brand-zinc-800 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm font-medium">Log your first meal to start</p>
                  </div>
                ) : (
                  todayMeals.slice(0, 3).map(meal => (
                    <MealCard 
                      key={meal.id} 
                      meal={meal} 
                      onDelete={deleteMeal} 
                      onView={(m) => setSelectedMeal(m)}
                    />
                  ))
                )}
                
                {/* Manual entry quick link */}
                <button 
                  onClick={() => setIsLoggingMeal(true)}
                  className="w-full py-4 bg-brand-zinc-800 border border-brand-zinc-700 rounded-2xl text-xs font-bold text-zinc-400 hover:bg-brand-zinc-700 transition-colors uppercase tracking-widest mt-2"
                >
                  + Quick Manual Entry
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
             <motion.div 
               key="history"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-6 pb-20"
             >
                <h2 className="text-2xl font-display font-bold text-zinc-100 mb-6">Journal History</h2>
                {meals.length === 0 ? (
                  <p className="text-zinc-500 text-center py-12">No entries yet</p>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(
                      meals.reduce((acc, meal) => {
                        const date = format(meal.timestamp, 'yyyy-MM-dd');
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(meal);
                        return acc;
                      }, {} as Record<string, Meal[]>)
                    )
                    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                    .map(([date, dateMeals]) => (
                      <div key={date} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary">
                            {format(new Date(date), 'EEEE, MMM do')}
                            {date === format(new Date(), 'yyyy-MM-dd') && " (Today)"}
                          </h3>
                          <div className="flex-1 h-px bg-brand-zinc-800" />
                          <span className="text-[10px] font-bold text-zinc-500">
                            {dateMeals.reduce((sum, m) => sum + m.nutrition.calories, 0)} kcal
                          </span>
                        </div>
                        <div className="space-y-3">
                          {dateMeals.map(meal => (
                            <MealCard 
                              key={meal.id} 
                              meal={meal} 
                              onDelete={deleteMeal} 
                              onEdit={(m) => {
                                setEditingMeal(m);
                                setIsLoggingMeal(true);
                              }} 
                              onView={(m) => setSelectedMeal(m)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </motion.div>
          )}

          {activeTab === 'trends' && (
            <TrendsSection meals={meals} weightLogs={weightLogs} budget={dailyBudget} />
          )}

          {activeTab === 'profile' && (
            <ProfileSection profile={profile} setProfile={setProfile} weightLogs={weightLogs} setWeightLogs={setWeightLogs} />
          )}

          {activeTab === 'reminders' && (
            <RemindersSection reminders={reminders} setReminders={setReminders} />
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-brand-zinc-900 shadow-2xl shadow-black/80 border-t border-brand-zinc-800/50 p-4 px-4 flex justify-between items-center z-40 rounded-t-[2.5rem]">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={UtensilsCrossed} label="Bento" />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="Logs" />
        
        {/* FAB */}
        <div className="relative -top-8 scale-110">
          <button 
            onClick={() => {
              setEditingMeal(null);
              setIsLoggingMeal(true);
            }}
            className="w-14 h-14 rounded-2xl bg-brand-primary text-brand-secondary shadow-lg shadow-brand-primary/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        <NavButton active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} icon={TrendingUp} label="Trends" />
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={SettingsIcon} label="Config" />
      </nav>

      {/* Meal Detail View */}
      <AnimatePresence>
        {selectedMeal && (
          <MealDetailOverlay 
            meal={selectedMeal} 
            onClose={() => setSelectedMeal(null)}
            onEdit={(m) => {
              setSelectedMeal(null);
              setEditingMeal(m);
              setIsLoggingMeal(true);
            }}
            onDelete={(id) => {
              deleteMeal(id);
              setSelectedMeal(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Meal Log Overaly */}
      <AnimatePresence>
        {isLoggingMeal && (
          <MealLoggerOverlay 
            onClose={() => {
              setIsLoggingMeal(false);
              setEditingMeal(null);
            }} 
            onSave={addMeal}
            scanning={scanning}
            setScanning={setScanning}
            editingMeal={editingMeal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MacroMini({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <div className={cn("w-1.5 h-6 rounded-full", color)} />
        <span className="text-lg font-display font-bold leading-none">{Math.round(value)}g</span>
      </div>
    </div>
  );
}

function BudgetCard({ label, budget, consumed }: { label: string, budget: number, consumed: number }) {
  const percentage = (consumed / budget) * 100;
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">{label}</span>
        <span className={cn(
          "text-xs font-bold px-2 py-0.5 rounded-full",
          percentage > 100 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
        )}>
          {formatNumber(budget)}
        </span>
      </div>
      <div className="text-xl font-display font-bold text-slate-800">
        {formatNumber(consumed)} <span className="text-xs text-slate-400">kcal</span>
      </div>
      <div className="mt-3 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", percentage > 100 ? "bg-rose-400" : "bg-emerald-400")}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

function SimpleMacro({ label, value, max, color }: { label: string, value: number, max: number, color: string }) {
  const percentage = (value / max) * 100;
  const isExceeded = value > max;
  const isNear = !isExceeded && percentage > 85;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{label}</span>
          {isExceeded && <span className="text-[8px] bg-rose-500/20 text-rose-500 font-black px-1 rounded">EXCEEDED</span>}
          {isNear && <span className="text-[8px] bg-amber-500/20 text-amber-500 font-black px-1 rounded">NEAR</span>}
        </div>
        <span className="text-[10px] font-black">{Math.round(value)}g / {Math.round(max)}g</span>
      </div>
      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-500", isExceeded ? "bg-rose-500" : color)} style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
    </div>
  );
}

function MealCard({ meal, onDelete, onEdit, onView }: { meal: Meal, onDelete: (id: string) => void, onEdit?: (meal: Meal) => void, onView: (meal: Meal) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onView(meal)}
      className="p-4 rounded-3xl bg-brand-zinc-900 border border-brand-zinc-800 flex gap-4 group cursor-pointer hover:border-brand-primary/50 transition-all"
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {meal.imageUrl ? (
          <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
        ) : (
          <UtensilsCrossed className="w-6 h-6 text-brand-zinc-700" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-zinc-100 truncate pr-2">{meal.name}</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              {meal.type.replace('_', ' ')} • {format(meal.timestamp, 'h:mm a')}
            </p>
          </div>
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {onEdit && (
              <button 
                onClick={() => onEdit(meal)}
                className="text-brand-zinc-700 hover:text-brand-primary transition-colors p-1"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => onDelete(meal.id)}
              className="text-brand-zinc-700 hover:text-rose-500 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-brand-primary" />
            <span className="text-xs font-black tabular-nums">{meal.nutrition.calories} <span className="text-[10px] text-zinc-500 font-medium tracking-tight">KCAL</span></span>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-black text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded uppercase">{meal.nutrition.protein}g P</span>
            <span className="text-[10px] font-black text-zinc-400 bg-brand-zinc-800 px-2 py-0.5 rounded uppercase">{meal.nutrition.carbs}g C</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MealDetailOverlay({ meal, onClose, onEdit, onDelete }: { meal: Meal, onClose: () => void, onEdit: (m: Meal) => void, onDelete: (id: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg max-h-[85vh] bg-brand-zinc-900 rounded-[2.5rem] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-start shrink-0">
          <div className="space-y-1">
             <span className="text-[10px] font-black uppercase text-brand-primary tracking-widest">
               {meal.type.replace('_', ' ')}
             </span>
             <h2 className="text-2xl font-display font-black text-zinc-100 line-clamp-1">{meal.name}</h2>
             <p className="text-xs text-zinc-500 font-bold">{format(meal.timestamp, 'EEEE, MMMM do • h:mm a')}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit(meal)}
              className="p-3 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-brand-primary transition-all active:scale-95"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-3 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {meal.imageUrl && (
            <div className="w-full h-48 rounded-3xl overflow-hidden bg-brand-zinc-800 shrink-0">
              <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
            </div>
          )}

          {meal.composition && (
            <div className="bento-card p-4 bg-zinc-800/30 border-zinc-800">
              <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-brand-primary" />
                Meal Composition
              </h4>
              <p className="text-sm font-medium text-zinc-300 leading-relaxed italic">
                "{meal.composition}"
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bento-card p-4 flex flex-col items-center justify-center bg-brand-primary/5 border-brand-primary/20">
              <Flame className="w-6 h-6 text-brand-primary mb-2" />
              <span className="text-2xl font-display font-black text-zinc-100">{meal.nutrition.calories}</span>
              <span className="text-[10px] font-black uppercase text-zinc-500">Calories</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center p-2 rounded-xl bg-zinc-800/50">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Protein</span>
                <span className="text-sm font-black text-blue-400">{meal.nutrition.protein}g</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-zinc-800/50">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Carbs</span>
                <span className="text-sm font-black text-yellow-400">{meal.nutrition.carbs}g</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-zinc-800/50">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Fat</span>
                <span className="text-sm font-black text-rose-400">{meal.nutrition.fat}g</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onDelete(meal.id)}
            className="w-full p-4 rounded-2xl bg-rose-500/10 text-rose-500 text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Meal Entry
          </button>
        </div>

        {/* Bottom spacer for home indicator on mobile */}
        <div className="h-4 bg-brand-zinc-900 shrink-0" />
      </motion.div>
    </motion.div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: React.ElementType, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        active ? "opacity-100 scale-110" : "opacity-40 hover:opacity-70"
      )}
    >
      <Icon className={cn("w-6 h-6", active ? "text-brand-primary" : "text-zinc-500")} />
      <span className={cn(
        "text-[8px] font-black uppercase tracking-[0.2em]",
        active ? "text-brand-primary" : "text-zinc-500"
      )}>{label}</span>
    </button>
  );
}

import React from 'react';

function MealLoggerOverlay({ onClose, onSave, scanning, setScanning, editingMeal }: { onClose: () => void, onSave: (meal: Omit<Meal, 'id' | 'timestamp'>, t?: number) => void, scanning: boolean, setScanning: (s: boolean) => void, editingMeal?: Meal | null }) {
  const [mode, setMode] = useState<'options' | 'manual' | 'camera'>(editingMeal ? 'manual' : 'options');
  const [image, setImage] = useState<string | null>(editingMeal?.imageUrl || null);
  const [estimating, setEstimating] = useState(false);
  const [manualData, setManualData] = useState({
    name: editingMeal?.name || '',
    type: editingMeal?.type || 'breakfast' as Meal['type'],
    calories: editingMeal?.nutrition.calories.toString() || '',
    protein: editingMeal?.nutrition.protein.toString() || '',
    carbs: editingMeal?.nutrition.carbs.toString() || '',
    fat: editingMeal?.nutrition.fat.toString() || '',
    composition: editingMeal?.composition || '',
    quantity: '1',
    unit: 'grams',
    date: editingMeal ? format(editingMeal.timestamp, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  });

  const handleAIEstimate = async () => {
    if (!manualData.name || !manualData.quantity) return;
    setEstimating(true);
    try {
      const result = await estimateNutritionFromText(manualData.name, Number(manualData.quantity), manualData.unit);
      setManualData(prev => ({
        ...prev,
        calories: result.calories.toString(),
        protein: result.protein.toString(),
        carbs: result.carbs.toString(),
        fat: result.fat.toString()
      }));
    } catch (err) {
      alert("AI estimation failed. Please try manual entry.");
    } finally {
      setEstimating(false);
    }
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const originalBase64 = reader.result as string;
      setScanning(true);
      try {
        const compressedBase64 = await compressImage(originalBase64);
        setImage(compressedBase64);
        const aiResult = await scanMealImage(compressedBase64);
        setManualData(prev => ({
          ...prev,
          name: aiResult.description || 'AI Scanned Meal',
          calories: aiResult.calories.toString(),
          protein: aiResult.protein.toString(),
          carbs: aiResult.carbs.toString(),
          fat: aiResult.fat.toString(),
          composition: aiResult.composition || aiResult.foodItems?.join(', ') || '',
          quantity: '1',
          unit: 'serving'
        }));
        setMode('manual');
        // Photo is kept in view state for review but won't be passed to onSave
      } catch (err) {
        alert("Could not analyze image. Switching to manual input.");
        setMode('manual');
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-brand-secondary/80 backdrop-blur-md z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 overflow-hidden"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-brand-zinc-900 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl flex flex-col max-h-full sm:max-h-[90vh]"
      >
        {/* Sticky Header */}
        <div className="p-8 pb-4 flex justify-between items-center bg-brand-zinc-900 z-20 shrink-0">
          <h3 className="text-2xl font-display font-medium text-zinc-100">
            {mode === 'options' ? "Log your meal" : "Meal Details"}
          </h3>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-brand-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-100 transition-colors active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 custom-scrollbar">
          {scanning ? (
            <div className="py-12 text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-brand-primary rounded-3xl animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-brand-primary" />
                </div>
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-1 bg-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10"
                />
              </div>
              <h3 className="text-xl font-display font-bold text-zinc-100 mb-2">Analyzing...</h3>
              <p className="text-zinc-500 text-sm">Gemini AI is scanning your meal</p>
            </div>
          ) : mode === 'options' ? (
            <div className="space-y-6 pb-6">
              <div className="grid grid-cols-1 gap-3">
              <LoggerOption 
                icon={Camera} 
                title="Snap Photo" 
                desc="Use camera to analyze meal"
                color="bg-brand-primary"
                onClick={() => document.getElementById('camera-input-snap')?.click()}
              />
              <LoggerOption 
                icon={Upload} 
                title="Upload Photo" 
                desc="Choose from your device"
                color="bg-blue-500"
                onClick={() => document.getElementById('camera-input-upload')?.click()}
              />
              <LoggerOption 
                icon={Keyboard} 
                title="Manual Entry" 
                desc="Input details manually"
                color="bg-brand-zinc-800"
                onClick={() => setMode('manual')}
              />
            </div>
            <input 
              id="camera-input-snap" 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={handleCameraCapture}
            />
            <input 
              id="camera-input-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleCameraCapture}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-display font-bold text-zinc-100">Details</h3>
              {image && (
                <button 
                  onClick={() => setImage(null)}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Photo Section */}
            <div className="relative group">
              {image ? (
                <div className="w-full h-40 rounded-3xl overflow-hidden bg-brand-zinc-800 relative">
                  <img src={image} alt="Meal" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      type="button"
                      onClick={() => document.getElementById('manual-snap-input')?.click()}
                      className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white hover:bg-brand-primary/20 transition-all flex flex-col items-center gap-1"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="text-[8px] font-black uppercase">Snap</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => document.getElementById('manual-upload-input')?.click()}
                      className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white hover:bg-blue-500/20 transition-all flex flex-col items-center gap-1"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[8px] font-black uppercase">Upload</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => document.getElementById('manual-snap-input')?.click()}
                    className="h-32 border-2 border-dashed border-brand-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-500 hover:text-brand-primary hover:border-brand-primary/50 transition-all gap-2"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Snap Photo</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => document.getElementById('manual-upload-input')?.click()}
                    className="h-32 border-2 border-dashed border-brand-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-500 hover:text-blue-500 hover:border-blue-500/50 transition-all gap-2"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Upload Photo</span>
                  </button>
                </div>
              )}
              <input 
                id="manual-snap-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const compressed = await compressImage(reader.result as string);
                      setImage(compressed);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <input 
                id="manual-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const compressed = await compressImage(reader.result as string);
                      setImage(compressed);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>

            <div className="space-y-4">
               <InputGroup label="Date" value={manualData.date} onChange={val => setManualData({...manualData, date: val})} type="date" />
               <InputGroup label="Meal Name" value={manualData.name} onChange={val => setManualData({...manualData, name: val})} placeholder="e.g. Sushi Platter" />
               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block">Composition / Details</label>
                 <textarea 
                   className="w-full bg-brand-zinc-800 border border-brand-zinc-700/50 rounded-2xl p-4 font-bold text-zinc-100 focus:ring-1 focus:ring-brand-primary outline-none placeholder:text-zinc-700 text-xs min-h-[80px]"
                   value={manualData.composition}
                   onChange={e => setManualData({...manualData, composition: e.target.value})}
                   placeholder="e.g. 2 eggs, toast, butter"
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <InputGroup label="Quantity" value={manualData.quantity} onChange={val => setManualData({...manualData, quantity: val})} type="number" placeholder="1" />
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block">Unit</label>
                    <select 
                      className="w-full bg-brand-zinc-800 border-none rounded-2xl p-4 font-bold text-zinc-100 focus:ring-1 focus:ring-brand-primary outline-none appearance-none cursor-pointer"
                      value={manualData.unit}
                      onChange={e => setManualData({...manualData, unit: e.target.value})}
                    >
                      <option value="grams">Grams</option>
                      <option value="bowl">Bowl</option>
                      <option value="tablespoon">Tablespoon</option>
                      <option value="teaspoon">Teaspoon</option>
                      <option value="serving">Serving</option>
                      <option value="cup">Cup</option>
                    </select>
                  </div>
               </div>

               <button 
                 onClick={handleAIEstimate}
                 disabled={estimating || !manualData.name}
                 className="w-full bg-brand-zinc-800 border border-brand-zinc-700 py-3 rounded-2xl flex items-center justify-center gap-2 text-brand-primary hover:bg-brand-zinc-700 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
               >
                 {estimating ? (
                   <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                 ) : (
                   <Sparkles className="w-4 h-4" />
                 )}
                 AI Estimate Macros
               </button>

               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block">Type</label>
                    <select 
                      className="w-full bg-brand-zinc-800 border-none rounded-2xl p-4 font-bold text-zinc-100 focus:ring-1 focus:ring-brand-primary outline-none appearance-none cursor-pointer"
                      value={manualData.type}
                      onChange={e => setManualData({...manualData, type: e.target.value as Meal['type']})}
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="morning_snack">Morning Snack</option>
                      <option value="lunch">Lunch</option>
                      <option value="evening_snack">Evening Snack</option>
                      <option value="dinner">Dinner</option>
                    </select>
                  </div>
                  <InputGroup label="Calories" value={manualData.calories} onChange={val => setManualData({...manualData, calories: val})} type="number" placeholder="kcal" />
               </div>
               <div className="grid grid-cols-3 gap-3">
                  <InputGroup label="Pro (g)" value={manualData.protein} onChange={val => setManualData({...manualData, protein: val})} type="number" />
                  <InputGroup label="Carb (g)" value={manualData.carbs} onChange={val => setManualData({...manualData, carbs: val})} type="number" />
                  <InputGroup label="Fat (g)" value={manualData.fat} onChange={val => setManualData({...manualData, fat: val})} type="number" />
               </div>
            </div>
            <button 
              onClick={() => {
                onSave({
                  name: manualData.name || 'Untitled Meal',
                  type: manualData.type,
                  nutrition: {
                    calories: Number(manualData.calories) || 0,
                    protein: Number(manualData.protein) || 0,
                    carbs: Number(manualData.carbs) || 0,
                    fat: Number(manualData.fat) || 0
                  },
                  composition: manualData.composition
                  // Note: imageUrl is intentionally omitted to avoid storing large photos
                }, new Date(manualData.date + 'T' + format(editingMeal?.timestamp || new Date(), 'HH:mm:ss')).getTime());
                setImage(null);
              }}
              disabled={!manualData.name || !manualData.calories}
              className="w-full bg-brand-primary text-brand-secondary font-black py-4 rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 uppercase tracking-widest text-xs"
            >
              Log Entry
            </button>
          </div>
        )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function LoggerOption({ icon: Icon, title, desc, color, onClick }: { icon: React.ElementType, title: string, desc: string, color: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-6 p-5 rounded-3xl bg-brand-zinc-800/50 hover:bg-brand-zinc-800 transition-all text-left border border-brand-zinc-800 group"
    >
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-950 p-3", color)}>
        <Icon className="w-full h-full" />
      </div>
      <div>
        <h4 className="text-base font-bold text-zinc-100">{title}</h4>
        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">{desc}</p>
      </div>
    </button>
  );
}

function ProfileSection({ profile, setProfile, weightLogs, setWeightLogs }: { profile: UserProfile, setProfile: (p: UserProfile) => void, weightLogs: WeightLog[], setWeightLogs: (l: WeightLog[]) => void }) {
  const [newWeight, setNewWeight] = useState(profile.weight.toString());

  const logWeight = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existingIndex = weightLogs.findIndex(l => l.date === today);
    const weightNum = Number(newWeight);
    
    if (existingIndex > -1) {
      const updated = [...weightLogs];
      updated[existingIndex].weight = weightNum;
      setWeightLogs(updated);
    } else {
      setWeightLogs([{ date: today, weight: weightNum }, ...weightLogs]);
    }
    
    setProfile({ ...profile, weight: weightNum });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-end">
        <h2 className="text-4xl font-display font-black text-zinc-100 leading-tight">Config</h2>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Current Weight</p>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-brand-primary" />
            <span className="text-2xl font-display font-black text-zinc-100">{profile.weight} kg</span>
          </div>
        </div>
      </div>
      
      {/* Weight Quick Log */}
      <div className="bento-card p-5 border-brand-primary/20 bg-brand-primary/5">
        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-2">Daily Weigh-In</label>
        <div className="flex gap-2">
          <input 
            type="number" 
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            className="flex-1 bg-brand-zinc-900 border border-brand-zinc-800 rounded-xl p-3 font-bold text-zinc-100 focus:ring-1 focus:ring-brand-primary outline-none"
            placeholder="Weight (kg)"
          />
          <button 
            onClick={logWeight}
            className="bg-brand-primary text-brand-secondary px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            Update
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="Age" value={profile.age} onChange={val => setProfile({...profile, age: Number(val)})} type="number" />
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Goal Weight (kg)</label>
            <input 
              type="number" 
              defaultValue={profile.weight - 5}
              className="w-full bg-brand-zinc-900 border border-brand-zinc-800 rounded-2xl p-4 font-bold text-zinc-100 focus:ring-1 focus:ring-brand-primary outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="Height (cm)" value={profile.height} onChange={val => setProfile({...profile, height: Number(val)})} type="number" />
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Gender</label>
            <select 
              className="w-full bg-brand-zinc-900 border border-brand-zinc-800 rounded-2xl p-4 font-bold text-zinc-100 focus:ring-1 focus:ring-brand-primary outline-none appearance-none"
              value={profile.gender}
              onChange={e => setProfile({...profile, gender: e.target.value as any})}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Activity Level</label>
          <select 
            className="w-full bg-brand-zinc-900 border border-brand-zinc-800 rounded-2xl p-4 font-bold text-zinc-100 focus:ring-1 focus:ring-brand-primary outline-none appearance-none"
            value={profile.activityLevel}
            onChange={e => setProfile({...profile, activityLevel: e.target.value as any})}
          >
            <option value="sedentary">Sedentary</option>
            <option value="lightly_active">Lightly Active</option>
            <option value="moderately_active">Moderately Active</option>
            <option value="very_active">Very Active</option>
            <option value="extra_active">Extra Active</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Your Goal</label>
          <div className="grid grid-cols-3 gap-2">
            {(['lose', 'maintain', 'gain'] as const).map(g => (
              <button 
                key={g}
                onClick={() => setProfile({...profile, goal: g})}
                className={cn(
                  "py-4 rounded-2xl font-black capitalize transition-all border text-xs tracking-widest",
                  profile.goal === g 
                    ? "bg-brand-primary text-brand-secondary border-brand-primary shadow-lg shadow-brand-primary/20" 
                    : "bg-brand-zinc-900 text-zinc-500 border-brand-zinc-800"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-brand-primary p-6 rounded-[2.5rem] text-zinc-950 shadow-xl shadow-brand-primary/10">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-5 h-5 opacity-40" />
          <h4 className="font-display font-black text-xs uppercase tracking-widest opacity-60">Daily Allowance</h4>
        </div>
        <div className="text-4xl font-display font-black leading-none pb-2 border-b border-zinc-950/10 mb-4">
          {formatNumber(calculateDailyBudget(profile))} <span className="text-xs uppercase font-black opacity-40">kcal</span>
        </div>
        <p className="text-[10px] font-bold opacity-60 leading-tight">
          This is your optimized calorie budget calculated using the Mifflin-St Jeor AI adjusted for your goal.
        </p>
      </div>
    </div>
  );
}

function RemindersSection({ reminders, setReminders }: { reminders: Reminder[], setReminders: (r: Reminder[]) => void }) {
  const toggleReminder = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateTime = (id: string, time: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, time } : r));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <h2 className="text-4xl font-display font-black text-zinc-100 leading-tight">Alerts</h2>
      
      <div className="space-y-3">
        {reminders.map(reminder => (
          <div key={reminder.id} className={cn(
            "p-5 rounded-3xl transition-all border flex items-center justify-between",
            reminder.enabled ? "bg-brand-zinc-900 border-brand-zinc-800 shadow-sm" : "bg-black/20 border-transparent opacity-40"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl",
                reminder.enabled ? "bg-brand-primary/10 text-brand-primary" : "bg-zinc-800 text-zinc-600"
              )}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-100 text-sm tracking-tight">{reminder.label}</h4>
                <input 
                  type="time" 
                  value={reminder.time}
                  onChange={e => updateTime(reminder.id, e.target.value)}
                  className="text-xs font-black text-zinc-500 bg-transparent border-none p-0 focus:ring-0 cursor-pointer uppercase"
                />
              </div>
            </div>
            <button 
              onClick={() => toggleReminder(reminder.id)}
              className={cn(
                "w-12 h-7 rounded-full relative transition-all duration-300",
                reminder.enabled ? "bg-brand-primary" : "bg-zinc-800"
              )}
            >
              <div className={cn(
                "absolute top-1 w-5 h-5 rounded-full bg-zinc-950 transition-all shadow-sm",
                reminder.enabled ? "left-6" : "left-1"
              )} />
            </button>
          </div>
        ))}
        
        <button 
          onClick={() => alert("Notification permissions required for native alerts.")}
          className="w-full py-4 rounded-2xl bg-brand-zinc-900 border border-brand-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-widest hover:text-zinc-100 transition-colors"
        >
          Manage External Notifications
        </button>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, type = "text", placeholder = "" }: { label: string, value: any, onChange: (val: string) => void, type?: string, placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{label}</label>
      <input 
        type={type} 
        value={value} 
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-brand-zinc-900 border border-brand-zinc-800 rounded-2xl p-4 font-bold text-zinc-100 focus:ring-1 focus:ring-brand-primary outline-none placeholder:text-zinc-700"
      />
    </div>
  );
}

function TrendsSection({ meals, weightLogs, budget }: { meals: Meal[], weightLogs: WeightLog[], budget: number }) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), i);
    return format(d, 'yyyy-MM-dd');
  }).reverse();

  const trendData = last7Days.map(date => {
    const dayMeals = meals.filter(m => format(m.timestamp, 'yyyy-MM-dd') === date);
    const totalCals = dayMeals.reduce((acc, m) => acc + m.nutrition.calories, 0);
    const totalProt = dayMeals.reduce((acc, m) => acc + m.nutrition.protein, 0);
    const totalCarb = dayMeals.reduce((acc, m) => acc + m.nutrition.carbs, 0);
    const totalFat = dayMeals.reduce((acc, m) => acc + m.nutrition.fat, 0);
    return {
      name: format(new Date(date), 'MMM d'),
      calories: totalCals,
      protein: totalProt,
      carbs: totalCarb,
      fat: totalFat,
      budget: budget
    };
  });

  const weightData = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-7).map(l => ({
    name: format(new Date(l.date), 'MMM d'),
    weight: l.weight
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <h2 className="text-4xl font-display font-black text-zinc-100 leading-tight">Insight</h2>

      {/* Calorie Chart */}
      <div className="bento-card p-5 h-64 flex flex-col">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Calorie Intake (Last 7 Days)</h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]}>
                {trendData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.calories > budget ? '#f43f5e' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macro Trend Chart */}
      <div className="bento-card p-5 h-64 flex flex-col">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Macro Trends (g)</h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ fontSize: '10px' }}
              />
              <Line type="monotone" dataKey="protein" stroke="#3b82f6" strokeWidth={2} dot={false} name="Protein" />
              <Line type="monotone" dataKey="carbs" stroke="#eab308" strokeWidth={2} dot={false} name="Carbs" />
              <Line type="monotone" dataKey="fat" stroke="#f43f5e" strokeWidth={2} dot={false} name="Fat" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weight Chart */}
      <div className="bento-card p-5 h-64 flex flex-col">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Weight Trend (kg)</h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={['auto', 'auto']} stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Bento Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bento-card p-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase">Avg Calories</p>
          <p className="text-2xl font-display font-black text-zinc-100">
            {formatNumber(Math.round(trendData.reduce((acc, d) => acc + d.calories, 0) / 7))} 
          </p>
          <p className="text-[10px] text-zinc-500">kcal / day</p>
        </div>
        <div className="bento-card p-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase">Weight Diff</p>
          <p className="text-2xl font-display font-black text-zinc-100">
            {weightData.length > 1 ? (weightData[weightData.length - 1].weight - weightData[0].weight).toFixed(1) : '0.0'}
          </p>
          <p className="text-[10px] text-zinc-500">kg this week</p>
        </div>
      </div>
    </div>
  );
}

