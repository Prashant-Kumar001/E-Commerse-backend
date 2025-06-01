import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRE } from "../utils/constants.js";
import AppError from "./appError.js";
function generateToken(payload) {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
  } catch (error) {
    throw new AppError("Error in generating token", 500);
  }
}

const calculateGrowthRate = (current, previous, type) => {
  if (previous === 0 && current > 0)
    return { rate: 100, change: current, note: `${type} started this month` };
  if (previous === 0 && current === 0)
    return { rate: 0, change: 0, note: `No ${type} in either month` };
  const change = current - previous;
  const rate = ((change / previous) * 100).toFixed(2);
  return {
    rate: `${rate}`,
    change,
    note: change > 0 ? "Increase" : change < 0 ? "Decrease" : "No change",
  };
};

export const calculatePercentage = (thisMonth, lastMonth) => {
  if (lastMonth === 0) return thisMonth * 100;
  const percent = (thisMonth / lastMonth) * 100;
  return Number(percent.toFixed(0));
};

const getDateRanges = () => {
  const today = new Date();
  const ranges = {
    currentMonth: {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    },
    previousMonth: {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    },
    lastSixMonths: [],
  };

  for (let i = 0; i < 6; i++) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() - i + 1,
      0,
      23,
      59,
      59,
      999
    );
    ranges.lastSixMonths.push({
      start: monthStart,
      end: i === 0 ? today : monthEnd,
      monthName: monthStart.toLocaleString("default", { month: "long" }),
      year: monthStart.getFullYear(),
    });
  }

  return ranges;
};

const getLastMonth = (range = 12) => {
  const today = new Date();
  const lastMonths = [];
  for (let i = 0; i < range; i++) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() - i + 1,
      0,
      23,
      59,
      59,
      999
    );
    lastMonths.push({
      start: monthStart,
      end: i === 0 ? today : monthEnd,
      monthName: monthStart.toLocaleString("default", { month: "long" }),
      year: monthStart.getFullYear(),
    });
  }

  return lastMonths;
};

export { generateToken, calculateGrowthRate, getDateRanges, getLastMonth };
