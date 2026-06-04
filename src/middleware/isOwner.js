const { NotFoundError, ForbiddenError } = require("../lib/errors");
const prisma = require("../lib/prisma");

async function isOwner(req, res, next) {
    try{
        const id = Number(req.params.qId);
        const role = req.user.role;
        if(role!=="editor" || role!=="admin"){
            throw new ForbiddenError("Only editors and admins can edit questions");
        }
        const question = await prisma.question.findUnique({
            where: {id},
            include: {keywords: true}
        });
        if (!question) {
            throw new NotFoundError("Question not found");
        }
        if(question.userId !== req.user.userId || role!=="admin") {
            throw new ForbiddenError("You can only modify your own questions");
        }

        req.question = question;
        next();
    } catch(err) {
        next(err);
    }
}

module.exports = isOwner;