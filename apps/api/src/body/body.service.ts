import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BodyService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: any) {
    return this.prisma.bodyMeasurement.create({
      data: {
        ...dto,
        userId,
        date: new Date(dto.date),
        weightKg: Number(dto.weightKg),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async getTrend(userId: string) {
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    return this.prisma.bodyMeasurement.findMany({
      where: { userId, date: { gte: twelveWeeksAgo } },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        weightKg: true,
        waistCm: true,
        backPainLevel: true,
        energyLevel: true,
      },
    });
  }
}
