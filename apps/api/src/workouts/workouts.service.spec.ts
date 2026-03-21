import { Test } from '@nestjs/testing';
import { WorkoutsService } from './workouts.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  workoutLog: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  workoutPlan: { findMany: jest.fn() },
  user: { findUnique: jest.fn() },
};

describe('WorkoutsService', () => {
  let service: WorkoutsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WorkoutsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(WorkoutsService);
    jest.clearAllMocks();
  });

  it('findAll scopes by userId', async () => {
    mockPrisma.workoutLog.findMany.mockResolvedValue([]);
    await service.findAll('user-1', '2026-03-19');
    expect(mockPrisma.workoutLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('getPlan returns workout plans for current week', async () => {
    mockPrisma.workoutPlan.findMany.mockResolvedValue([{ id: '1', weekNumber: 1 }]);
    const result = await service.getPlan(1);
    expect(result).toHaveLength(1);
  });
});
