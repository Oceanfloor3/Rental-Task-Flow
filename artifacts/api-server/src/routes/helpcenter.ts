import { Router, type IRouter } from "express";
import { db, helpCenterTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { GetHelpCenterResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

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

router.get("/admin/help-center", requireAdmin, async (req, res): Promise<void> => {
  const contacts = await db
    .select()
    .from(helpCenterTable)
    .orderBy(asc(helpCenterTable.sortOrder));

  res.json(
    contacts.map((c) => ({
      id: c.id,
      platform: c.platform,
      handle: c.handle,
      url: c.url,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
    })),
  );
});

router.put("/admin/help-center/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const { platform, handle, url, isActive, sortOrder } = req.body as {
    platform?: string;
    handle?: string;
    url?: string;
    isActive?: boolean;
    sortOrder?: number;
  };

  const updateData: Record<string, unknown> = {};
  if (platform !== undefined) updateData.platform = platform;
  if (handle !== undefined) updateData.handle = handle;
  if (url !== undefined) updateData.url = url;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  const [updated] = await db
    .update(helpCenterTable)
    .set(updateData)
    .where(eq(helpCenterTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json({
    id: updated.id,
    platform: updated.platform,
    handle: updated.handle,
    url: updated.url,
    isActive: updated.isActive,
    sortOrder: updated.sortOrder,
  });
});

export default router;
