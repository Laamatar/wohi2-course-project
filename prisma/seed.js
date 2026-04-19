const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    question: "What is HTTP?",
    answer:
      "HTTP is the foundation of communication on the web. It defines how clients and servers exchange data.",
    keywords: ["http", "web"],
  },
  {
    question: "What are REST APIs?",
    answer:
      "REST is an architectural style that uses standard HTTP methods like GET, POST, PUT, and DELETE.",
    keywords: ["http", "api"],
  },
  {
    question: "What is Node.js used for?",
    answer:
      "Node.js allows you to run JavaScript on the server using a non-blocking, event-driven architecture.",
    keywords: ["javascript", "backend"],
  },
  {
    question: "What are databases used for?",
    answer:
      "Databases store and organize data. Common types include relational databases like PostgreSQL and MySQL.",
    keywords: ["database", "backend"],
  },
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

