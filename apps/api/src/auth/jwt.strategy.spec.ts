import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

const mockConfigService = {
  get: (key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret';
    return undefined;
  },
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    strategy = module.get(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('validate() should return sub and email from payload', async () => {
    const payload = { sub: 'user-uuid-123', email: 'test@test.com' };
    const result = await strategy.validate(payload);
    expect(result).toEqual({ userId: 'user-uuid-123', email: 'test@test.com' });
  });
});
