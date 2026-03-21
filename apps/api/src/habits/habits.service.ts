import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  calculateScore(data: {
    waterMl: number;
    waterGoalMl: number;
    mealsWithProtein: number;
    trained: boolean;
    lowCarbDinner: boolean;
    sleepHours: number | null;
    mindfulness: boolean;
    supplementation: boolean;
  }): number {
    return (
      (data.waterMl >= data.waterGoalMl ? 10 : 0) +
      (data.mealsWithProtein >= 4 ? 15 : 0) +
      (data.trained ? 15 : 0) +
      (data.lowCarbDinner ? 20 : 0) +
      ((data.sleepHours ?? 0) >= 7 ? 15 : 0) +
      (data.mindfulness ? 15 : 0) +
      (data.supplementation ? 10 : 0)
    );
  }

  async findByDate(userId: string, date: string) {
    return this.prisma.habitLog.findFirst({ where: { userId, date: new Date(date) } });
  }

  async upsert(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // Strip mealsWithProtein — it is auto-computed by MealsService, never accepted from client
    const { mealsWithProtein: _excluded, date: rawDate, ...habitFields } = dto;
    const date = new Date(rawDate);
    const score = this.calculateScore({
      ...habitFields,
      mealsWithProtein: 0,
      waterGoalMl: user?.waterGoalMl ?? 2000,
    });
    return this.prisma.habitLog.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...habitFields, score },
      update: { ...habitFields, score },
    });
  }

  async update(id: string, userId: string, dto: any) {
    const current = await this.prisma.habitLog.findFirst({ where: { id, userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // Strip mealsWithProtein — auto-computed only
    const { mealsWithProtein: _excluded, ...habitFields } = dto;
    const merged = { ...current, ...habitFields };
    const score = this.calculateScore({
      ...merged,
      mealsWithProtein: (current as any)?.mealsWithProtein ?? 0,
      waterGoalMl: user?.waterGoalMl ?? 2000,
    });
    return this.prisma.habitLog.update({
      where: { id, userId },
      data: { ...habitFields, score },
    });
  }

  async getWeekly(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    return this.prisma.habitLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, score: true },
    });
  }
}
