import { PrismaClient } from "@prisma/client";

/** Single Prisma client for the process. */
export const db = new PrismaClient();
