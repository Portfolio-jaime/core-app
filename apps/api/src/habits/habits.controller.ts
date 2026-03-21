import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private habitsService: HabitsService) {}

  @Get()
  findByDate(@Req() req: any, @Query('date') date: string) {
    return this.habitsService.findByDate(req.user.userId, date);
  }

  @Post()
  upsert(@Req() req: any, @Body() dto: any) {
    return this.habitsService.upsert(req.user.userId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.habitsService.update(id, req.user.userId, dto);
  }

  @Get('weekly')
  getWeekly(@Req() req: any) {
    return this.habitsService.getWeekly(req.user.userId);
  }
}
