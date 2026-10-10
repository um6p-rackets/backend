import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { configuration } from "../../libs/common/src/config/configuration";

config({ path: "apps/auth-service/.env.development" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: configuration().database.url },
});