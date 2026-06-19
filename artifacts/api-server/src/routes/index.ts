import { Router, type IRouter } from "express";
import healthRouter from "./health";
import modulesRouter from "./modules";
import lessonsRouter from "./lessons";
import progressRouter from "./progress";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(modulesRouter);
router.use(lessonsRouter);
router.use(progressRouter);
router.use(statsRouter);

export default router;
