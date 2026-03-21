import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { BodyService } from './body.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('body')
export class BodyController {
  constructor(private bodyService: BodyService) {}

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.bodyService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.bodyService.findAll(req.user.userId);
  }

  @Get('trend')
  getTrend(@Req() req: any) {
    return this.bodyService.getTrend(req.user.userId);
  }
}
