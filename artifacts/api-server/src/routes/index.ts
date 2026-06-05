import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import tasksRouter from "./tasks";
import walletRouter from "./wallet";
import referralsRouter from "./referrals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(userRouter);
router.use(tasksRouter);
router.use(walletRouter);
router.use(referralsRouter);

export default router;
