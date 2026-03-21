import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXERCISES = [
  {
    name: 'Bird Dog',
    description: 'Estabiliza el core profundo sin comprimir la columna.',
    instructions: [
      'Ponte en cuatro apoyos con manos bajo hombros y rodillas bajo caderas.',
      'Extiende brazo derecho + pierna izquierda.',
      'Mantén columna neutra y espera 3-5 segundos.',
      'Regresa lentamente y cambia de lado.',
    ],
    musclesWorked: ['transverso abdominal', 'glúteos', 'paravertebrales'],
    safeForL5s1: true,
  },
  {
    name: 'Dead Bug',
    description: 'Activa el transverso abdominal, el músculo estabilizador de la columna.',
    instructions: [
      'Acuéstate boca arriba con brazos arriba y rodillas a 90°.',
      'Baja brazo derecho y pierna izquierda lentamente.',
      'Mantén espalda baja pegada al suelo durante todo el movimiento.',
      'Regresa y cambia de lado.',
    ],
    musclesWorked: ['transverso abdominal', 'recto abdominal'],
    safeForL5s1: true,
  },
  {
    name: 'Glute Bridge',
    description: 'Fortalece glúteos reduciendo carga en la zona lumbar.',
    instructions: [
      'Acuéstate boca arriba con rodillas dobladas y pies en el suelo.',
      'Sube la cadera apretando glúteos.',
      'Mantén 2-3 segundos en la posición alta.',
      'Baja lentamente.',
    ],
    musclesWorked: ['glúteo mayor', 'isquiotibiales', 'core'],
    safeForL5s1: true,
  },
  {
    name: 'Side Plank',
    description: 'Fortalece el core lateral que estabiliza L5-S1.',
    instructions: [
      'Apóyate en el codo y en el pie lateral.',
      'Mantén el cuerpo recto como una tabla.',
      'Activa el abdomen durante todo el tiempo.',
    ],
    musclesWorked: ['oblicuos', 'cuadrado lumbar', 'glúteo medio'],
    safeForL5s1: true,
  },
  {
    name: 'Hip Thrust',
    description: 'Fortalece glúteos para proteger la zona lumbar.',
    instructions: [
      'Apoya la espalda en un banco con pies en el suelo.',
      'Sube la cadera apretando glúteos en la posición alta.',
      'Mantén espalda neutra durante el movimiento.',
    ],
    musclesWorked: ['glúteo mayor', 'isquiotibiales'],
    safeForL5s1: true,
  },
  {
    name: 'Face Pull',
    description: 'Fortalece espalda alta mejorando postura.',
    instructions: [
      'Usa polea con cuerda a nivel de cara.',
      'Tira hacia la cara abriendo los codos.',
      'Aprieta las escápulas al final del movimiento.',
    ],
    musclesWorked: ['trapecio medio', 'romboides', 'deltoides posterior'],
    safeForL5s1: true,
  },
  {
    name: 'Farmer Carry',
    description: 'Desarrolla estabilidad real del core caminando con carga.',
    instructions: [
      'Toma dos mancuernas con palmas hacia adentro.',
      'Camina erecto con pecho arriba y abdomen activo.',
      'Mantén hombros hacia atrás durante el recorrido.',
    ],
    musclesWorked: ['core', 'trapecio', 'antebrazos', 'piernas'],
    safeForL5s1: true,
  },
];

// Base weekly schedule — same structure each week, volumes scale by phase
const WEEKLY_BASE = [
  {
    dayOfWeek: 'monday',
    activityType: 'core',
    durationMin: 25,
    description: 'Bird Dog 3×8, Dead Bug 3×10, Glute Bridge 3×12, Side Plank 3×30s',
    targetMeters: null,
  },
  {
    dayOfWeek: 'tuesday',
    activityType: 'swimming_technique',
    durationMin: 35,
    description: '4 calentamiento + 8 libre + 4 espalda + 4 tabla',
    targetMeters: 500,
  },
  {
    dayOfWeek: 'wednesday',
    activityType: 'strength',
    durationMin: 25,
    description: 'Hip Thrust 3×12, Face Pull 3×12, Farmer Carry 3×30s',
    targetMeters: null,
  },
  {
    dayOfWeek: 'thursday',
    activityType: 'swimming_cardio',
    durationMin: 35,
    description: '4 calentamiento + 10 libre + 6 espalda',
    targetMeters: 500,
  },
  {
    dayOfWeek: 'friday',
    activityType: 'swimming_easy',
    durationMin: 25,
    description: '8 libre suave + 4 espalda',
    targetMeters: 300,
  },
  {
    dayOfWeek: 'saturday',
    activityType: 'swimming_long',
    durationMin: 45,
    description: '4 calentamiento + 12 libre + 6 espalda + 4 tabla',
    targetMeters: 650,
  },
  {
    dayOfWeek: 'sunday',
    activityType: 'rest',
    durationMin: 20,
    description: 'Descanso activo: caminar 20 min o estiramientos',
    targetMeters: null,
  },
];

// Volume scales by phase: adaptation × 1.0, fat_loss × 1.4, resistance × 1.8
const PHASE_SCALE: Record<string, number> = {
  adaptation: 1.0,
  fat_loss: 1.4,
  resistance: 1.8,
};

const PHASES: Array<{
  phase: 'adaptation' | 'fat_loss' | 'resistance';
  weeks: number[];
}> = [
  { phase: 'adaptation', weeks: [1, 2, 3, 4] },
  { phase: 'fat_loss', weeks: [5, 6, 7, 8] },
  { phase: 'resistance', weeks: [9, 10, 11, 12] },
];

async function main() {
  console.log('🌱 Seeding exercises...');
  for (const ex of EXERCISES) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {},
      create: ex,
    });
  }
  console.log(`   ✓ ${EXERCISES.length} exercises upserted`);

  console.log('🌱 Seeding 12-week workout plan...');
  await prisma.workoutPlan.deleteMany();

  let count = 0;
  for (const { phase, weeks } of PHASES) {
    for (const week of weeks) {
      for (const day of WEEKLY_BASE) {
        const scale = PHASE_SCALE[phase];
        const meters = day.targetMeters ? Math.round(day.targetMeters * scale) : null;
        await prisma.workoutPlan.create({
          data: {
            weekNumber: week,
            dayOfWeek: day.dayOfWeek as any,
            activityType: day.activityType as any,
            durationMin: day.durationMin,
            description: day.description,
            monthPhase: phase as any,
            targetMeters: meters,
          },
        });
        count++;
      }
    }
  }
  console.log(`   ✓ ${count} workout plan rows created (12 weeks × 7 days)`);
  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
