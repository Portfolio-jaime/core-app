import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  habitLog: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
  mealLog: { aggregate: jest.fn().mockResolvedValue({ _sum: { proteinG: 0 } }) },
  swimmingSession: { aggregate: jest.fn().mockResolvedValue({ _sum: { totalMeters: 0 } }) },
  workoutPlan: { findFirst: jest.fn().mockResolvedValue(null) },
  bodyMeasurement: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(UsersService);
    jest.clearAllMocks();
    mockPrisma.habitLog.findMany.mockResolvedValue([]);
    mockPrisma.habitLog.findFirst.mockResolvedValue(null);
    mockPrisma.mealLog.aggregate.mockResolvedValue({ _sum: { proteinG: 0 } });
    mockPrisma.swimmingSession.aggregate.mockResolvedValue({ _sum: { totalMeters: 0 } });
    mockPrisma.workoutPlan.findFirst.mockResolvedValue(null);
    mockPrisma.bodyMeasurement.findFirst.mockResolvedValue(null);
  });

  it('findMe returns user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: '1', name: 'Jaime', email: 'j@j.com' });
    const result = await service.findMe('1');
    expect(result).toHaveProperty('name', 'Jaime');
  });

  it('getStats returns null currentWeek when programStartDate is null', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1',
      programStartDate: null,
      waterGoalMl: 2000,
      proteinGoalG: 157,
      weightGoalKg: 95,
    });
    const stats = await service.getStats('1');
    expect(stats.currentWeek).toBeNull();
    expect(stats.currentPhase).toBeNull();
    expect(stats.todayWorkout).toBeNull();
  });

  it('onboard saves profile and creates body measurement', async () => {
    const user = { id: 'u1', waterGoalMl: 2000, proteinGoalG: 157 };
    mockPrisma.user.update.mockResolvedValue({ ...user, programStartDate: new Date() });
    mockPrisma.bodyMeasurement.create.mockResolvedValue({ id: 'b1' });
    await service.onboard('u1', {
      heightCm: 180,
      birthDate: '1990-01-01',
      currentWeightKg: 102,
      weightGoalKg: 90,
      waterGoalMl: 2500,
      programStartDate: '2026-03-20',
    });
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockPrisma.bodyMeasurement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ weightKg: 102 }) }),
    );
  });

  it('onboard auto-calculates proteinGoalG when not provided', async () => {
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.bodyMeasurement.create.mockResolvedValue({});
    await service.onboard('u1', {
      currentWeightKg: 100,
      programStartDate: '2026-03-20',
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proteinGoalG: 160 }), // 100 * 1.6
      }),
    );
  });
});
