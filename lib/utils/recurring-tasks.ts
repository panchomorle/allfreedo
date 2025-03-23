import { RecurrenceRule } from "../types";

// Function to parse a cron-like string into a RecurrenceRule object
export function parseRecurrenceRule(ruleString: string): RecurrenceRule | null {
  try {
    return JSON.parse(ruleString);
  } catch (e) {
    console.error("Error parsing recurrence rule:", e);
    return null;
  }
}

// Convert a RecurrenceRule to a human-readable string
export function recurrenceRuleToString(rule: RecurrenceRule): string {
  if (!rule) return "Invalid rule";
  
  const { frequency, interval } = rule;
  
  switch (frequency) {
    case "daily":
      return interval === 1 ? "Daily" : `Every ${interval} days`;
    
    case "weekly":
      if (interval === 1) {
        if (rule.byDay && rule.byDay.length > 0) {
          if (rule.byDay.length === 7) return "Every day";
          
          const days = rule.byDay.map(formatDay).join(", ");
          return `Weekly on ${days}`;
        }
        return "Weekly";
      } else {
        if (rule.byDay && rule.byDay.length > 0) {
          const days = rule.byDay.map(formatDay).join(", ");
          return `Every ${interval} weeks on ${days}`;
        }
        return `Every ${interval} weeks`;
      }
    
    case "monthly":
      if (interval === 1) {
        if (rule.byMonthDay && rule.byMonthDay.length > 0) {
          const days = rule.byMonthDay.join(", ");
          return `Monthly on day${rule.byMonthDay.length > 1 ? "s" : ""} ${days}`;
        }
        return "Monthly";
      } else {
        if (rule.byMonthDay && rule.byMonthDay.length > 0) {
          const days = rule.byMonthDay.join(", ");
          return `Every ${interval} months on day${rule.byMonthDay.length > 1 ? "s" : ""} ${days}`;
        }
        return `Every ${interval} months`;
      }
    
    case "yearly":
      if (interval === 1) {
        if (rule.byMonth && rule.byMonth.length > 0) {
          const months = rule.byMonth.map(formatMonth).join(", ");
          return `Yearly in ${months}`;
        }
        return "Yearly";
      } else {
        if (rule.byMonth && rule.byMonth.length > 0) {
          const months = rule.byMonth.map(formatMonth).join(", ");
          return `Every ${interval} years in ${months}`;
        }
        return `Every ${interval} years`;
      }
    
    default:
      return "Custom schedule";
  }
}

// Helper to format day names
function formatDay(day: string): string {
  const days: Record<string, string> = {
    MO: "Monday",
    TU: "Tuesday",
    WE: "Wednesday",
    TH: "Thursday",
    FR: "Friday",
    SA: "Saturday",
    SU: "Sunday",
  };
  
  return days[day] || day;
}

// Helper to format month names
function formatMonth(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  return months[month - 1] || String(month);
}

// Function to calculate the next occurrence date
export function getNextOccurrenceDate(rule: RecurrenceRule, fromDate: Date = new Date()): Date {
  const nextDate = new Date(fromDate);
  
  switch (rule.frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + rule.interval);
      break;
      
    case "weekly":
      if (rule.byDay && rule.byDay.length > 0) {
        // Find the next occurrence of one of the specified days
        const currentDay = nextDate.getDay();
        const daysMap: Record<string, number> = {
          SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
        };
        
        // Convert byDay strings to day numbers
        const specifiedDays = rule.byDay.map(d => daysMap[d]).sort((a, b) => a - b);
        
        // Find the next day that's in the specified days
        let nextDayFound = false;
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          if (specifiedDays.includes(checkDay)) {
            nextDate.setDate(nextDate.getDate() + i);
            nextDayFound = true;
            break;
          }
        }
        
        // If no next day found (unlikely), default to adding the interval in weeks
        if (!nextDayFound) {
          nextDate.setDate(nextDate.getDate() + (rule.interval * 7));
        }
      } else {
        nextDate.setDate(nextDate.getDate() + (rule.interval * 7));
      }
      break;
      
    case "monthly":
      if (rule.byMonthDay && rule.byMonthDay.length > 0) {
        // Current day of month
        const currentDay = nextDate.getDate();
        
        // Find the next occurrence of one of the specified days
        const specifiedDays = [...rule.byMonthDay].sort((a, b) => a - b);
        
        // Try to find a day in the current month
        let nextDayFound = false;
        for (const day of specifiedDays) {
          if (day > currentDay) {
            nextDate.setDate(day);
            nextDayFound = true;
            break;
          }
        }
        
        // If no day found in current month, move to the first specified day in the next month
        if (!nextDayFound) {
          nextDate.setMonth(nextDate.getMonth() + rule.interval);
          nextDate.setDate(specifiedDays[0]);
        }
      } else {
        nextDate.setMonth(nextDate.getMonth() + rule.interval);
      }
      break;
      
    case "yearly":
      if (rule.byMonth && rule.byMonth.length > 0) {
        const currentMonth = nextDate.getMonth() + 1; // JavaScript months are 0-indexed
        
        // Find the next occurrence of one of the specified months
        const specifiedMonths = [...rule.byMonth].sort((a, b) => a - b);
        
        // Try to find a month in the current year
        let nextMonthFound = false;
        for (const month of specifiedMonths) {
          if (month > currentMonth) {
            nextDate.setMonth(month - 1); // Convert back to 0-indexed
            nextMonthFound = true;
            break;
          }
        }
        
        // If no month found in current year, move to the first specified month in the next year
        if (!nextMonthFound) {
          nextDate.setFullYear(nextDate.getFullYear() + rule.interval);
          nextDate.setMonth(specifiedMonths[0] - 1); // Convert back to 0-indexed
        }
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + rule.interval);
      }
      break;
  }
  
  return nextDate;
} 