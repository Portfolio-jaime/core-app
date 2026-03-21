import { Test } from '@nestjs/testing';
import { SwimmingService } from './swimming.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  swimmingSession: { findMany: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
  workoutPlan: { findMany: jest.fn() },
};

describe('SwimmingService', () => {
  let service: SwimmingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SwimmingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(SwimmingService);
    jest.clearAllMocks();
  });

  it('findAll scopes by userId', async () => {
    mockPrisma.swimmingSession.findMany.mockResolvedValue([]);
    await service.findAll('user-1');
    expect(mockPrisma.swimmingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('getStats returns weekly meters', async () => {
    mockPrisma.swimmingSession.aggregate.mockResolvedValue({ _sum: { totalMeters: 1500 } });
    mockPrisma.swimmingSession.findMany.mockResolvedValue([{}, {}]);
    const stats = await service.getStats('user-1');
    expect(stats.weekMeters).toBe(1500);
  });
});
