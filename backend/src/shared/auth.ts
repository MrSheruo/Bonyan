import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer } from "better-auth/plugins";
import { db } from "@/db/db.js";
import * as schema from "@/db/schema.js";

const BASE_URL =
  process.env.BETTER_AUTH_URL ||
  process.env.BETTER_AUTH_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || "bonyan-nh26.onrender.com"}`
    : "http://localhost:8080");

const IS_SECURE_CONTEXT = BASE_URL.startsWith("https://");

const RAW_TRUSTED_ORIGINS: string[] = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
  "https://bonyan-pi.vercel.app",
]
  .filter((v): v is string => Boolean(v && v.length > 0))
  .map((o) => o.replace(/\/+$/, ""));

export const auth = betterAuth({
  baseURL: BASE_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    cookie: {
      sameSite: "none",
      secure: IS_SECURE_CONTEXT,
      httpOnly: true,
    },
  },

  trustedOrigins: RAW_TRUSTED_ORIGINS,

  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  user: {
    additionalFields: {
      budget: { type: "number", required: false, defaultValue: 0 },
      maritalStatus: { type: "string", required: false },
      phone: { type: "string", required: false },
    },
  },

  plugins: [admin(), bearer()],
});
