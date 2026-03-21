import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { SwimmingModule } from './swimming/swimming.module';
import { MealsModule } from './meals/meals.module';
import { HabitsModule } from './habits/habits.module';
import { BodyModule } from './body/body.module';
import { ExercisesModule } from './exercises/exercises.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkoutsModule,
    SwimmingModule,
    MealsModule,
    HabitsModule,
    BodyModule,
    ExercisesModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
