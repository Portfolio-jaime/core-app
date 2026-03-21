import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MealsService } from './meals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private mealsService: MealsService) {}

  @Get()
  findAll(@Req() req: any, @Query('date') date?: string) {
    return this.mealsService.findAll(req.user.userId, date);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.mealsService.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.mealsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.mealsService.remove(id, req.user.userId);
  }

  @Get('summary')
  getSummary(@Req() req: any, @Query('date') date: string) {
    return this.mealsService.getSummary(req.user.userId, date);
  }
}
