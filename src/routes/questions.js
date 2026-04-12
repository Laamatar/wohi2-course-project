const express = require('express');
const router = express.Router();

const questions = require("../data/questions");

//GET /api/questions, /api/questions?keyword=http
router.get("/", (req, res) => {
    const {keyword} = req.query;
    if(!keyword){
        res.json(questions);
    }
    const filteredQuestions = questions.filter(q=>q.keywords.includes(keyword));
    res.json(filteredQuestions);
})

//GET /api/questions/:qId
router.get("/:qId", (req, res) =>{
    const questionId = Number(req.params.qId);
    const question = questions.find(q=>q.id == questionId);
    if(!question){
        return res.status(404).json({msg: "Question not found"});
    }

    res.json(question);
})

//POST /api/questions
router.post("/", (req, res) =>{
    const {question, answer, keywords} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "question and answer are required"});
    }

    const existingIds = questions.map(q=>q.id);
    const maxId = Math.max(...existingIds);

    const newQuestion = {
        id: questions.length ? maxId + 1 : 1,
        question, answer,
        keywords: Array.isArray(keywords) ? keywords : []
    }

    questions.push(newQuestion);
    res.status(201).json(newQuestion);
})

//PUT /api/questions/:qId
router.put("/:qId", (req, res) =>{
    const questionId = Number(req.params.qId);
    const questionEntry = questions.find(q=>q.id == questionId);
    if(!questionEntry){
        return res.status(404).json({msg: "Question not found"});
    }

    const {question, answer, keywords} = req.body;
    if(!question || !answer){
        return res.status(400).json({msg: "question and answer are required"});
    }

    questionEntry.question = question;
    questionEntry.answer = answer;
    questionEntry.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(questionEntry);
})

//DELETE /api/questions/:qId
router.delete("/:qId", (req, res) =>{
    const questionId = Number(req.params.qId);
    const questionIndex = questions.findIndex(q=>q.id == questionId);

    if(questionIndex == -1){
        return res.status(404).json({msg: "Question not found"})
    }
    const deletedQuestion = questions.splice(questionIndex, 1);
    res.json({
        msg: "Question deleted successfully",
        question: deletedQuestion
    })
})

module.exports = router;