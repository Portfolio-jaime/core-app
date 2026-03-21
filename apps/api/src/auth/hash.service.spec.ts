import { Test } from '@nestjs/testing';
import { HashService } from './hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [HashService],
    }).compile();
    service = module.get(HashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hash() should return a bcrypt hash', async () => {
    const hash = await service.hash('mypassword');
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('compare() should return true for matching password', async () => {
    const hash = await service.hash('correct');
    expect(await service.compare('correct', hash)).toBe(true);
  });

  it('compare() should return false for wrong password', async () => {
    const hash = await service.hash('correct');
    expect(await service.compare('wrong', hash)).toBe(false);
  });
});
