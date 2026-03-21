import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: string) {
    return this.prisma.exercise.findMany({
      where: category ? { category: category as any } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.exercise.findUnique({ where: { id } });
  }
}
