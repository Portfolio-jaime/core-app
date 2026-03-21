import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SwimmingService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, month?: string) {
    const where: any = { userId };
    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.date = {
        gte: new Date(year, m - 1, 1),
        lt: new Date(year, m, 1),
      };
    }
    return this.prisma.swimmingSession.findMany({ where, orderBy: { date: 'desc' } });
  }

  async create(userId: string, dto: any) {
    return this.prisma.swimmingSession.create({
      data: { ...dto, userId, date: new Date(dto.date) },
    });
  }

  async getStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const agg = await this.prisma.swimmingSession.aggregate({
      where: { userId, date: { gte: monday } },
      _sum: { totalMeters: true },
    });
    const sessions = await this.prisma.swimmingSession.findMany({
      where: { userId, date: { gte: monday } },
    });
    return {
      weekMeters: Number(agg._sum.totalMeters ?? 0),
      sessionCount: sessions.length,
    };
  }

  async getPlan(week: number) {
    return this.prisma.workoutPlan.findMany({
      where: {
        weekNumber: week,
        activityType: {
          in: [
            'swimming_technique',
            'swimming_cardio',
            'swimming_easy',
            'swimming_long',
          ] as any,
        },
      },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}
