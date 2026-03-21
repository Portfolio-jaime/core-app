import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, date?: string, week?: number) {
    let dateFilter: any = {};
    if (date) {
      dateFilter = { date: new Date(date) };
    } else if (week) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { programStartDate: true },
      });
      if (user?.programStartDate) {
        const start = new Date(user.programStartDate);
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        dateFilter = { date: { gte: weekStart, lte: weekEnd } };
      }
    }
    return this.prisma.workoutLog.findMany({
      where: { userId, ...dateFilter },
      orderBy: { date: 'desc' },
    });
  }

  async create(userId: string, dto: any) {
    return this.prisma.workoutLog.create({
      data: { ...dto, userId, date: new Date(dto.date) },
    });
  }

  async update(id: string, userId: string, dto: any) {
    // userId in WHERE enforces that users can only update their own logs
    return this.prisma.workoutLog.update({ where: { id, userId }, data: dto });
  }

  async getPlan(week: number) {
    return this.prisma.workoutPlan.findMany({
      where: { weekNumber: week },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}
