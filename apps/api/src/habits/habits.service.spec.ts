import { Test } from '@nestjs/testing';
import { HabitsService } from './habits.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn().mockResolvedValue({ waterGoalMl: 2000 }) },
  habitLog: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('HabitsService', () => {
  let service: HabitsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [HabitsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(HabitsService);
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ waterGoalMl: 2000 });
  });

  describe('calculateScore', () => {
    it('returns 100 when all habits complete', () => {
      const score = service.calculateScore({
        waterMl: 2000,
        waterGoalMl: 2000,
        mealsWithProtein: 4,
        trained: true,
        lowCarbDinner: true,
        sleepHours: 7,
        mindfulness: true,
        supplementation: true,
      });
      expect(score).toBe(100);
    });

    it('returns 0 when nothing is done', () => {
      const score = service.calculateScore({
        waterMl: 0,
        waterGoalMl: 2000,
        mealsWithProtein: 0,
        trained: false,
        lowCarbDinner: false,
        sleepHours: 6,
        mindfulness: false,
        supplementation: false,
      });
      expect(score).toBe(0);
    });

    it('returns 25 for water + trained only', () => {
      const score = service.calculateScore({
        waterMl: 2000,
        waterGoalMl: 2000,
        mealsWithProtein: 0,
        trained: true,
        lowCarbDinner: false,
        sleepHours: 6,
        mindfulness: false,
        supplementation: false,
      });
      expect(score).toBe(25); // 10 (water) + 15 (trained)
    });
  });

  it('upsert calls prisma with calculated score', async () => {
    mockPrisma.habitLog.upsert.mockResolvedValue({ id: '1', score: 25 });
    await service.upsert('user-1', {
      date: '2026-03-19',
      waterMl: 2000,
      mealsWithProtein: 0,
      trained: true,
      lowCarbDinner: false,
      sleepHours: 6,
      mindfulness: false,
      supplementation: false,
    });
    expect(mockPrisma.habitLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ score: 25 }) }),
    );
  });
});
