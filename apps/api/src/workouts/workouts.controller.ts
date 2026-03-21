import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('week') week?: string,
  ) {
    return this.workoutsService.findAll(req.user.userId, date, week ? Number(week) : undefined);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.workoutsService.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.workoutsService.update(id, req.user.userId, dto);
  }

  @Get('plan')
  getPlan(@Query('week') week = '1') {
    return this.workoutsService.getPlan(Number(week));
  }
}
