import { Test } from '@nestjs/testing';
import { MealsService } from './meals.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  mealLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  habitLog: { upsert: jest.fn() },
};

describe('MealsService', () => {
  let service: MealsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MealsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(MealsService);
    jest.clearAllMocks();
  });

  it('create recalculates mealsWithProtein in habit_log', async () => {
    mockPrisma.mealLog.create.mockResolvedValue({ id: '1', date: new Date('2026-03-19'), proteinG: 35 });
    mockPrisma.mealLog.aggregate.mockResolvedValue({ _count: { id: 2 } });
    mockPrisma.habitLog.upsert.mockResolvedValue({});
    await service.create('user-1', {
      date: '2026-03-19',
      mealType: 'lunch',
      description: 'pollo',
      proteinG: 35,
    });
    expect(mockPrisma.habitLog.upsert).toHaveBeenCalled();
  });

  it('delete recalculates mealsWithProtein in habit_log', async () => {
    mockPrisma.mealLog.delete.mockResolvedValue({ date: new Date('2026-03-19'), proteinG: 35 });
    mockPrisma.mealLog.aggregate.mockResolvedValue({ _count: { id: 1 } });
    mockPrisma.habitLog.upsert.mockResolvedValue({});
    await service.remove('meal-1', 'user-1');
    expect(mockPrisma.habitLog.upsert).toHaveBeenCalled();
  });
});
