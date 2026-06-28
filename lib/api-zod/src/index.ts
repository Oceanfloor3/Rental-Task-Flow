export * from "./generated/api";

import { z } from "zod/v4";

export const ChangePinBody = z.object({
  currentPin: z.string().optional(),
  newPin: z.string(),
});

export const ChangePinResponse = z.object({
  success: z.boolean(),
  message: z.string(),
});
