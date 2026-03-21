import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findAll(muscleGroup?: string) {
    return this.prisma.exercise.findMany({
      where: muscleGroup
        ? { musclesWorked: { has: muscleGroup } }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.exercise.findUnique({ where: { id } });
  }
}
