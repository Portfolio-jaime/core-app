import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashService } from './hash.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets injected per-call via ConfigService
  ],
  controllers: [AuthController],
  providers: [AuthService, HashService, JwtStrategy, JwtRefreshStrategy],
  exports: [HashService],
})
export class AuthModule {}
