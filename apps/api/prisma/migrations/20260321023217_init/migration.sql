-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('core', 'strength', 'swimming_technique', 'swimming_cardio', 'swimming_easy', 'swimming_long', 'rest');

-- CreateEnum
CREATE TYPE "MonthPhase" AS ENUM ('adaptation', 'fat_loss', 'resistance');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'snack1', 'lunch', 'snack2', 'dinner');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('core', 'strength', 'swimming', 'mobility');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "heightCm" INTEGER,
    "birthDate" DATE,
    "conditionNotes" TEXT,
    "proteinGoalG" INTEGER NOT NULL DEFAULT 157,
    "waterGoalMl" INTEGER NOT NULL DEFAULT 2000,
    "weightGoalKg" DECIMAL(5,1) NOT NULL DEFAULT 95.0,
    "programStartDate" DATE,
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "ActivityType" NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swimming_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalLaps" INTEGER NOT NULL,
    "totalMeters" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "poolLengthM" INTEGER NOT NULL DEFAULT 25,
    "strokesJson" JSONB NOT NULL,
    "avgHrBpm" INTEGER,
    "notes" TEXT,

    CONSTRAINT "swimming_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "description" TEXT NOT NULL,
    "proteinG" DECIMAL(5,1) NOT NULL,
    "caloriesKcal" INTEGER,
    "isKeto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "meal_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "waterMl" INTEGER NOT NULL DEFAULT 0,
    "mealsWithProtein" INTEGER NOT NULL DEFAULT 0,
    "trained" BOOLEAN NOT NULL DEFAULT false,
    "lowCarbDinner" BOOLEAN NOT NULL DEFAULT false,
    "sleepHours" DECIMAL(3,1),
    "mindfulness" BOOLEAN NOT NULL DEFAULT false,
    "supplementation" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weightKg" DECIMAL(5,1) NOT NULL,
    "waistCm" DECIMAL(5,1),
    "energyLevel" INTEGER NOT NULL,
    "backPainLevel" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT[],
    "musclesWorked" TEXT[],
    "imageUrl" TEXT,
    "safeForL5s1" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "monthPhase" "MonthPhase" NOT NULL,
    "targetMeters" INTEGER,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "habit_logs_userId_date_key" ON "habit_logs"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_name_key" ON "exercises"("name");

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swimming_sessions" ADD CONSTRAINT "swimming_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
