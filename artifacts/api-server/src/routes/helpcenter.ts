import { Router, type IRouter } from "express";
import { db, helpCenterTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { GetHelpCenterResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/help-center", async (req, res): Promise<void> => {
  const contacts = await db
    .select()
    .from(helpCenterTable)
    .where(eq(helpCenterTable.isActive, true))
    .orderBy(asc(helpCenterTable.sortOrder));

  res.json(
    GetHelpCenterResponse.parse(
      contacts.map((c) => ({
        id: c.id,
        platform: c.platform,
        handle: c.handle,
        url: c.url,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
      })),
    ),
  );
});

export default router;
