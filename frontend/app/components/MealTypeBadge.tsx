import { MEAL_TYPE_LABELS, MealType } from "../lib/api";

const BADGE_STYLES: Record<MealType, string> = {
  breakfast: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  lunch: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  dinner: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function MealTypeBadge({ type }: { type?: MealType }) {
  const safeType: MealType = type ?? "other";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[safeType]}`}
    >
      {MEAL_TYPE_LABELS[safeType]}
    </span>
  );
}
