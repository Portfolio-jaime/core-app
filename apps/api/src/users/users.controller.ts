import { Controller, Get, Put, Post, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /** GET /users/me — current user profile */
  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findMe(req.user.userId);
  }

  /** PUT /users/me — update profile fields */
  @Put('me')
  updateMe(@Req() req: any, @Body() dto: any) {
    return this.usersService.updateMe(req.user.userId, dto);
  }

  /** GET /users/me/stats — dashboard stats aggregate */
  @Get('me/stats')
  getStats(@Req() req: any) {
    return this.usersService.getStats(req.user.userId);
  }

  /**
   * GET /users/me/onboarding/questions
   * Returns the ordered list of questions the frontend should display.
   */
  @Get('me/onboarding/questions')
  getOnboardingQuestions() {
    return this.usersService.getOnboardingQuestions();
  }

  /**
   * POST /users/me/onboarding
   * Saves onboarding answers, creates first body measurement,
   * auto-calculates protein goal, sets programStartDate.
   */
  @Post('me/onboarding')
  onboard(@Req() req: any, @Body() dto: any) {
    return this.usersService.onboard(req.user.userId, dto);
  }
}
