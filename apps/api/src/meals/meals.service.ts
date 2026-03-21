import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MealsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, date?: string) {
    return this.prisma.mealLog.findMany({
      where: { userId, ...(date && { date: new Date(date) }) },
      orderBy: { date: 'desc' },
    });
  }

  async create(userId: string, dto: any) {
    const meal = await this.prisma.mealLog.create({
      data: { ...dto, userId, date: new Date(dto.date), proteinG: Number(dto.proteinG) },
    });
    await this.recalculateMealsWithProtein(userId, meal.date);
    return meal;
  }

  async update(id: string, userId: string, dto: any) {
    // userId in WHERE enforces users can only update their own meals
    const meal = await this.prisma.mealLog.update({ where: { id, userId }, data: dto });
    await this.recalculateMealsWithProtein(userId, meal.date);
    return meal;
  }

  async remove(id: string, userId: string) {
    // userId in WHERE enforces users can only delete their own meals
    const meal = await this.prisma.mealLog.delete({ where: { id, userId } });
    await this.recalculateMealsWithProtein(userId, meal.date);
    return meal;
  }

  async getSummary(userId: string, date: string) {
    const agg = await this.prisma.mealLog.aggregate({
      where: { userId, date: new Date(date) },
      _sum: { proteinG: true, caloriesKcal: true },
    });
    return {
      proteinG: Number(agg._sum.proteinG ?? 0),
      caloriesKcal: Number(agg._sum.caloriesKcal ?? 0),
    };
  }

  // Auto-compute meals_with_protein: count meals where protein_g >= 15
  private async recalculateMealsWithProtein(userId: string, date: Date) {
    const agg = await this.prisma.mealLog.aggregate({
      where: { userId, date, proteinG: { gte: 15 } },
      _count: { id: true },
    });
    const count = agg._count.id;
    await this.prisma.habitLog.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, mealsWithProtein: count, score: 0 },
      update: { mealsWithProtein: count },
    });
  }
}
