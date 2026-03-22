import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        heightCm: true,
        birthDate: true,
        conditionNotes: true,
        proteinGoalG: true,
        waterGoalMl: true,
        weightGoalKg: true,
        programStartDate: true,
        createdAt: true,
      },
    });
  }

  async updateMe(userId: string, dto: any) {
    // Strip sensitive fields — never allow client to overwrite credentials
    const { password, passwordHash, refreshTokenHash, ...allowed } = dto;
    return this.prisma.user.update({ where: { id: userId }, data: allowed });
  }

  async onboard(userId: string, dto: {
    name?: string;
    heightCm?: number;
    age?: number;
    birthDate?: string;
    weightKg?: number;
    currentWeightKg?: number;
    weightGoalKg?: number;
    waterGoalMl?: number;
    proteinGoalG?: number;
    condition?: string;
    conditionNotes?: string;
    programStartDate?: string;
  }) {
    // Normalize field aliases from frontend
    const currentWeightKg = dto.currentWeightKg ?? dto.weightKg;
    const conditionNotes = dto.conditionNotes ?? dto.condition;

    // Auto-calculate protein goal: bodyWeight × 1.6 (standard lean-mass protocol)
    const proteinGoalG = dto.proteinGoalG ?? (currentWeightKg ? Math.round(currentWeightKg * 1.6) : undefined);

    // programStartDate defaults to today if not provided
    const startDate = dto.programStartDate ? new Date(dto.programStartDate) : new Date();

    const updateData: any = {
      ...(dto.name && { name: dto.name }),
      ...(dto.heightCm && { heightCm: dto.heightCm }),
      ...(conditionNotes && { conditionNotes }),
      ...(dto.weightGoalKg && { weightGoalKg: dto.weightGoalKg }),
      ...(dto.waterGoalMl && { waterGoalMl: dto.waterGoalMl }),
      ...(proteinGoalG !== undefined && { proteinGoalG }),
      programStartDate: startDate,
      ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
    };

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Create initial body measurement if weight was provided
    if (currentWeightKg !== undefined) {
      await this.prisma.bodyMeasurement.create({
        data: {
          userId,
          date: startDate,
          weightKg: currentWeightKg,
          energyLevel: 5,
          backPainLevel: 0,
        },
      });
    }

    return user;
  }

  getOnboardingQuestions() {
    return [
      {
        key: 'heightCm',
        label: '¿Cuál es tu altura?',
        type: 'number',
        unit: 'cm',
        placeholder: '178',
        required: false,
      },
      {
        key: 'birthDate',
        label: '¿Cuál es tu fecha de nacimiento?',
        type: 'date',
        required: false,
      },
      {
        key: 'currentWeightKg',
        label: '¿Cuál es tu peso actual?',
        type: 'number',
        unit: 'kg',
        placeholder: '102',
        required: true,
      },
      {
        key: 'weightGoalKg',
        label: '¿Cuál es tu peso objetivo?',
        type: 'number',
        unit: 'kg',
        placeholder: '90',
        required: true,
      },
      {
        key: 'waterGoalMl',
        label: '¿Cuánta agua quieres tomar al día?',
        type: 'number',
        unit: 'ml',
        placeholder: '2000',
        default: 2000,
        required: false,
      },
      {
        key: 'conditionNotes',
        label: '¿Tienes alguna condición médica o nota relevante?',
        type: 'text',
        placeholder: 'Ej: dolor de espalda, alergia a...',
        required: false,
      },
      {
        key: 'programStartDate',
        label: '¿Cuándo quieres iniciar tu programa de 12 semanas?',
        type: 'date',
        required: true,
      },
    ];
  }

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Current week + phase calculation from programStartDate
    let currentWeek: number | null = null;
    let currentPhase: string | null = null;
    let todayWorkout: any = null;
    if (user?.programStartDate) {
      const start = new Date(user.programStartDate);
      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      currentWeek = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 12);
      currentPhase =
        currentWeek <= 4 ? 'adaptation' : currentWeek <= 8 ? 'fat_loss' : 'resistance';
      const dow = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
        today.getDay()
      ];
      todayWorkout = await this.prisma.workoutPlan.findFirst({
        where: { weekNumber: currentWeek, dayOfWeek: dow as any },
      });
    }

    // Today's habit log
    const habitLog = await this.prisma.habitLog.findFirst({
      where: { userId, date: new Date(todayStr) },
    });

    // Today's protein total
    const proteinAgg = await this.prisma.mealLog.aggregate({
      where: { userId, date: new Date(todayStr) },
      _sum: { proteinG: true },
    });

    // Weekly swimming meters (ISO week Mon–Sun)
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const metersAgg = await this.prisma.swimmingSession.aggregate({
      where: { userId, date: { gte: monday, lte: today } },
      _sum: { totalMeters: true },
    });

    // Latest body weight
    const latestBody = await this.prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    // Rolling 7-day habit score history
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    const habitHistory = await this.prisma.habitLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, score: true },
    });
    const habitMap = new Map(
      habitHistory.map((h) => [h.date.toISOString().split('T')[0], h.score]),
    );
    const weeklyScores = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return habitMap.get(d.toISOString().split('T')[0]) ?? null;
    });

    return {
      latestWeight: latestBody?.weightKg ?? null,
      weightGoalKg: user?.weightGoalKg ?? 95,
      todayWaterMl: habitLog?.waterMl ?? 0,
      waterGoalMl: user?.waterGoalMl ?? 2000,
      todayProteinG: Number(proteinAgg._sum.proteinG ?? 0),
      proteinGoalG: user?.proteinGoalG ?? 157,
      todayScore: habitLog?.score ?? 0,
      weeklyScores,
      todayWorkout: todayWorkout
        ? {
            type: (todayWorkout as any).activityType,
            description: (todayWorkout as any).description,
            durationMin: (todayWorkout as any).durationMin,
          }
        : null,
      weekMeters: Number(metersAgg._sum.totalMeters ?? 0),
      currentWeek,
      currentPhase,
    };
  }
}
