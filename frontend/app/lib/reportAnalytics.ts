import { AnalyticsRange, MealType, ReportRow } from "./api";

export type DateFilterMode = "quick" | "custom";

export type TrendGranularity = "hour" | "day" | "month";

export type ChartPoint = {
  label: string;
  count: number;
};

export type DistributionPoint = {
  name: string;
  value: number;
  type: MealType;
  fill: string;
};

export type DepartmentPoint = {
  department: string;
  count: number;
};

export const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: "#f59e0b",
  lunch: "#10b981",
  dinner: "#6366f1",
  other: "#94a3b8",
};

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

export function getQuickDateRange(range: AnalyticsRange): { start: string; end: string } {
  const now = new Date();

  switch (range) {
    case "week":
      return {
        start: toLocalDateString(startOfWeek(now)),
        end: toLocalDateString(endOfWeek(now)),
      };
    case "month":
      return {
        start: toLocalDateString(startOfMonth(now)),
        end: toLocalDateString(endOfMonth(now)),
      };
    case "year":
      return {
        start: toLocalDateString(startOfYear(now)),
        end: toLocalDateString(endOfYear(now)),
      };
    default:
      return {
        start: toLocalDateString(now),
        end: toLocalDateString(now),
      };
  }
}

export function getEffectiveDateRange(
  mode: DateFilterMode,
  quickRange: AnalyticsRange,
  customStart: string,
  customEnd: string,
): { start: string; end: string } | null {
  if (mode === "quick") {
    return getQuickDateRange(quickRange);
  }

  if (!customStart || !customEnd) {
    return null;
  }

  return { start: customStart, end: customEnd };
}

export function getTrendGranularity(
  mode: DateFilterMode,
  quickRange: AnalyticsRange,
  start: string,
  end: string,
): TrendGranularity {
  if (mode === "quick") {
    if (quickRange === "today") {
      return "hour";
    }

    if (quickRange === "year") {
      return "month";
    }

    return "day";
  }

  if (start === end) {
    return "hour";
  }

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000);

  return diffDays > 62 ? "month" : "day";
}

function parseRowDateTime(row: ReportRow): Date {
  const [day, month, year] = row.meal_date.split("/").map(Number);
  const [hours, minutes, seconds] = row.served_at.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function buildTrendData(
  rows: ReportRow[],
  granularity: TrendGranularity,
  start: string,
  end: string,
): ChartPoint[] {
  const buckets = new Map<string, number>();

  if (granularity === "hour") {
    for (let hour = 0; hour < 24; hour += 1) {
      buckets.set(`${String(hour).padStart(2, "0")}:00`, 0);
    }

    rows.forEach((row) => {
      const date = parseRowDateTime(row);
      const key = `${String(date.getHours()).padStart(2, "0")}:00`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
  } else if (granularity === "day") {
    const cursor = parseIsoDate(start);
    const endDate = parseIsoDate(end);

    while (cursor <= endDate) {
      const key = `${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    rows.forEach((row) => {
      const date = parseRowDateTime(row);
      const key = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    });
  } else {
    MONTH_LABELS.forEach((label) => buckets.set(label, 0));

    rows.forEach((row) => {
      const date = parseRowDateTime(row);
      const key = MONTH_LABELS[date.getMonth()];
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
  }

  return Array.from(buckets.entries()).map(([label, count]) => ({ label, count }));
}

export function buildDistributionData(byType: Record<MealType, number>): DistributionPoint[] {
  return (["breakfast", "lunch", "dinner", "other"] as MealType[])
    .map((type) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: byType[type] ?? 0,
      type,
      fill: MEAL_TYPE_COLORS[type],
    }))
    .filter((item) => item.value > 0);
}

export function buildTopDepartments(rows: ReportRow[], limit = 8): DepartmentPoint[] {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const department = row.department || "Unknown";
    counts.set(department, (counts.get(department) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function formatDateRangeLabel(start: string, end: string): string {
  if (start === end) {
    return start;
  }

  return `${start} → ${end}`;
}
