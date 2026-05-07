const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma")
const isOwner = require('../middleware/isOwner');
const authenticate = require('../middleware/auth');
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "public", "uploads"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const newName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
        cb(null, newName)
    }
})

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if(file.mimetype.startsWith("image")) {
            cb(null, true)
        } else {
            cb(new Error("Only images allowed"))
        }
    },
    limits: {fileSize: 5 * 1024 * 1024}
})

function formatQuestion(question) {
    return {
        ...question,
        keywords: question.keywords.map((k) => k.name),
        userName: question.user ? question.user.name : null,
        user: undefined,
    };
}

function formatAttempt(attempt, question) {
    return {
        id: attempt.id,
        correct: attempt.correct,
        submittedAnswer: attempt.answer,
        correctAnswer: question.answer,
        createdAt: attempt.createdAt
    };
}

router.use(authenticate);

//GET /api/questions, /api/questions?keyword=http&page=1&limit=5
router.get("/", async (req, res) => {
    const {keyword} = req.query;

    const where = keyword ? 
    { keywords: { some: { name: keyword } } } : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit)) || 5);
    const skip = (page - 1) * limit;

    const [filteredQuestions, total] = await Promise.all( [prisma.question.findMany({
        where, 
        include: {keywords: true, user: true },
        orderBy: { id:"asc"},
        skip,
        take: limit
    }), prisma.question.count({where})]);

    res.json({
        data: filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total/limit)
    })
});

//GET /api/questions/:qId
router.get("/:qId", async (req, res) =>{
    const questionId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: questionId},
        include: { keywords: true, user: true },
    });
    
    if(!question){
        return res.status(404).json({msg: "Question not found"});
    }

    res.json(formatQuestion(question));
})

//POST /api/questions
router.post("/", upload.single("image"), async (req, res) =>{
    const {question, answer, keywords} = req.body;

    const userId = req.user.userId;
    if(!question || !answer){
        return res.status(400).json({msg: "question and answer are required"});
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : []
    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;


    const newQuestion = await prisma.question.create({
        data : {
        question, answer, imageUrl, userId,
        keywords: {
            connectOrCreate: keywordsArray.map((kw)=> ({
                where: { name: kw }, create: { name:kw },
            })), },
        },
        include: { keywords: true },
    });

    res.status(201).json(formatQuestion(newQuestion));
})

//PUT /api/questions/:qId
router.put("/:qId", upload.single("image"), isOwner, async (req, res) =>{
    const questionId = Number(req.params.qId);

    const questionEntry = await prisma.question.findUnique({ where: { id: questionId }});

    if(!questionEntry){
        return res.status(404).json({msg: "Question not found"});
    }

    const {question, answer, keywords} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "question and answer are required"});
    }
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    
    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;

    const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
        question, answer, imageUrl,
        keywords: {
            set: [],
            connectOrCreate: keywordsArray.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
            })),
        },
        },
        include: { keywords: true, user: true  },
    });
    res.json(formatQuestion(updatedQuestion));
});


//DELETE /api/questions/:qId
router.delete("/:qId", isOwner, async (req, res) =>{
    const questionId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: { keywords: true, user: true  },
    });

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.attempt.deleteMany({
        where: { questionId },
    });

    await prisma.question.delete({ where: { id: questionId } });

    res.json({
        message: "Question deleted successfully",
        question: formatQuestion(question),
    });
});



//POST /api/questions/:qId/play
router.post("/:qId/play", async (req, res) =>{
    const questionId = Number(req.params.qId);

    const userId = req.user.userId;
    const questionEntry = await prisma.question.findUnique({ where: { id: questionId }});

    if(!questionEntry){
        return res.status(404).json({msg: "Question not found"});
    }

    const existingAttempt = await prisma.attempt.findUnique({
    where: {
        userId_questionId: {
            userId,
            questionId
        }
    }
    });

    if(existingAttempt){
        return res.status(400).json({
            msg: "You have already answered this question"
        });
    }

    const {answer} = req.body;
    if(!answer){
        return res.status(400).json({msg: "answer is required"});
    }

    var correct = false;
    if(answer == questionEntry.answer){
        correct = true;
    }


    const attempt = await prisma.attempt.create({
        data : {
            userId,
            questionId,
            answer,
            correct,
        }
    });

    res.status(201).json(formatAttempt(attempt, questionEntry));
});

module.exports = router;