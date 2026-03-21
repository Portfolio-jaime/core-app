import { Controller, Get, Param, Query } from '@nestjs/common';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private exercisesService: ExercisesService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.exercisesService.findAll(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exercisesService.findOne(id);
  }
}
