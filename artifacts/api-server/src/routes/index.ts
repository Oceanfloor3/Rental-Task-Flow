import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userRouter from "./user";
import tasksRouter from "./tasks";
import walletRouter from "./wallet";
import referralsRouter from "./referrals";
import notificationsRouter from "./notifications";
import withdrawalRouter from "./withdrawal";
import helpcenterRouter from "./helpcenter";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userRouter);
router.use(tasksRouter);
router.use(walletRouter);
router.use(referralsRouter);
router.use(notificationsRouter);
router.use(withdrawalRouter);
router.use(helpcenterRouter);
router.use(adminRouter);

export default router;
