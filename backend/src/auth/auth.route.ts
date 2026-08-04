import express, { type Request, type Response, type NextFunction } from "express"

const authRouter = express.Router();

authRouter.post("/register", (req: Request, res: Response) => {
    const userData = req.body

    console.log(userData);

    res.send(JSON.stringify(userData))

})


export default authRouter;