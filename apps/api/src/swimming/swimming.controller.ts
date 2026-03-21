import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { SwimmingService } from './swimming.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('swimming')
export class SwimmingController {
  constructor(private swimmingService: SwimmingService) {}

  @Get()
  findAll(@Req() req: any, @Query('month') month?: string) {
    return this.swimmingService.findAll(req.user.userId, month);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.swimmingService.create(req.user.userId, dto);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.swimmingService.getStats(req.user.userId);
  }

  @Get('plan')
  getPlan(@Query('week') week = '1') {
    return this.swimmingService.getPlan(Number(week));
  }
}
