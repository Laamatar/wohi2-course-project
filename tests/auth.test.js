const { resetDb, registerAndLogin, createQuestion, request, app, prisma } = require("./helpers");
const bcrypt = require("bcrypt");


beforeEach(resetDb);

it("registers, hashes password & returns token", async () => {
    const res = await request(app).post("/api/auth/register")
    .send({email: "a@test.io", password: "pw12345", name:"A"});
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    const user = await prisma.user.findUnique({where:{email: "a@test.io"}});
    expect(user.password).not.toBe("pw12345");
    const comparison = await bcrypt.compare("pw12345", user.password);
    expect(comparison).toBe(true);
});

it("returns 403 when editing someone else's post", async () => {
  const aliceToken = await registerAndLogin("alice@test.io", "Alice");
  const question = await createQuestion(aliceToken, { question: "Alice's question" });

  const bobToken = await registerAndLogin("bob@test.io", "Bob");
  const res = await request(app).put(`/api/questions/${question.id}`)
    .set("Authorization", `Bearer ${bobToken}`)
    .send({ question: "hijacked", answer: "x" });

  expect(res.status).toBe(403);

  const after = await prisma.question.findUnique({ where: { id: question.id } });
  expect(after.question).toBe("Alice's question");  // unchanged
});
