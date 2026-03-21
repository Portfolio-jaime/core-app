import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'uuid-1',
  email: 'test@test.com',
  name: 'Test User',
  passwordHash: 'hashed-pw',
  refreshTokenHash: null,
  heightCm: null,
  birthDate: null,
  conditionNotes: null,
  proteinGoalG: 157,
  waterGoalMl: 2000,
  weightGoalKg: '95.0',
  programStartDate: null,
  createdAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('signed-token'),
};

const mockConfig = {
  get: (key: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return map[key];
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let hash: HashService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        HashService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AuthService);
    hash = module.get(HashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register()', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.register({ name: 'X', email: 'test@test.com', password: 'pw' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens when email is new', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.register({
        name: 'Test',
        email: 'new@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('login()', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@x.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(hash, 'compare').mockResolvedValue(false);
      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      jest.spyOn(hash, 'compare').mockResolvedValue(true);

      const result = await service.login({
        email: 'test@test.com',
        password: 'correct',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refreshTokens()', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.refreshTokens('uuid-1', 'some-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if no refreshTokenHash stored', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });
      await expect(
        service.refreshTokens('uuid-1', 'some-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens when refresh token is valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: 'stored-hash',
      });
      mockPrisma.user.update.mockResolvedValue(mockUser);
      jest.spyOn(hash, 'compare').mockResolvedValue(true);

      const result = await service.refreshTokens('uuid-1', 'valid-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});
