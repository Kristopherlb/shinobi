import { connect } from "@dagger.io/dagger";
import { ToolResultSchema } from "../agent/state.js";

async function scanRepository(client, repoUrl) {
  const repo = client
    .container()
    .from("alpine/git:2.45.2")
    .withExec(["git", "clone", "--depth", "1", repoUrl, "/repo"]);

  const readmeFile = repo.file("/repo/README.md");
  const readme = await readmeFile.contents().catch(() => "");

  const tree = await repo
    .withExec(["sh", "-c", "cd /repo && find . -maxdepth 3 -type f -print | sort"])
    .stdout();

  return ToolResultSchema.parse({
    readme,
    tree
  });
}

export async function runScan(repoUrl) {
  return connect(async (client) => scanRepository(client, repoUrl));
}
