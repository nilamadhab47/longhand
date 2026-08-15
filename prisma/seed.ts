import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { seedStarterTopic } from "../lib/seed-topic";

const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "aspirant@localhost";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "longhand";

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: SEED_EMAIL },
    create: { email: SEED_EMAIL, passwordHash },
    update: { passwordHash },
  });

  const noteId = await seedStarterTopic(user.id);
  const sections = await prisma.noteSection.findMany({
    where: { noteId },
    orderBy: { position: "asc" },
  });

  console.log(`Seeded ${SEED_EMAIL} / topic ${noteId} with ${sections.length} sections:`);
  for (const section of sections) {
    console.log(`  ${section.position} ${section.kind}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
