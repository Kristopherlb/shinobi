// tools/dagger/pipeline.ts
import { connect } from "@dagger.io/dagger";

/** Golden-path tasks: pnpm build → svc validate → tests → local up → package → techdocs */
export async function pipeline(env = "dev-us-east-1") {
  const client = await connect({});  // no direct AWS calls
  const src = client.host().directory(".", { include: ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "packages/**", "service.yml"] });

  const base = client.container().from("node:20")
    .withMountedDirectory("/workspace", src)
    .withWorkdir("/workspace")
    .withExec(["corepack", "enable"])
    .withExec(["pnpm", "install"]);

  await base.withExec(["pnpm", "build"]).sync();                 // build
  await base.withExec(["pnpm", "svc", "validate", "--env", env]).sync();  // validate (CLI):contentReference[oaicite:63]{index=63}
  await base.withExec(["pnpm", "test"]).sync();                  // unit/snapshot:contentReference[oaicite:64]{index=64}
  // Optional: local emulation when supported
  // await base.withExec(["pnpm", "svc", "local", "up", "--env", env]).sync();

  // TODO: package artifacts, techdocs generation (no direct cloud calls)
  client.close();
}
