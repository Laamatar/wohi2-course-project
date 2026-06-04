const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { ValidationError, ConflictError, UnauthorizedError, ForbiddenError } = require('../lib/errors');
const SECRET = process.env.JWT_SECRET;
const CAPTCHAKEY = process.env.RECAPTCHA_SECRET_KEY;

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
    try {

        const { email, password, name, captchaToken } = req.body;

        if (!captchaToken) {
            throw new ValidationError("CAPTCHA is required");
        }

        if (!email || !password || !name) {
            throw new ValidationError("email, password and name are required");
        }

        const captchaResponse = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    secret: CAPTCHAKEY,
                    response: captchaToken
                })
            }
        );

        const captchaData = await captchaResponse.json();
        console.log("CAPTCHA TOKEN:", captchaToken);

        console.log("CAPTCHA RESPONSE STATUS:", captchaResponse.status);

        console.log("CAPTCHA RESPONSE:", captchaData);
        if (!captchaData.success) {
            throw new ValidationError("CAPTCHA verification failed");
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new ConflictError("Email already registered");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });

        const token = jwt.sign(
            { userId: user.id },
            SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            message: "User registered successfully",
            token
        });

    } catch (err) {
        next(err);
    }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            throw new ValidationError("email and password are required");
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            throw new ForbiddenError("Invalid credentials");
        }

        const token = jwt.sign(
            { userId: user.id },
            SECRET,
            { expiresIn: "1h" }
        );

        res.json({ token });

    } catch (err) {
        next(err);
    }
});


module.exports = router;