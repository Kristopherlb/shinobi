import { connect } from "@dagger.io/dagger";
import { ToolResultSchema } from "../agent/state.js";

export async function scanRepositoryWithClient(client, repoUrl) {
  console.error(`[Dagger] Cloning ${repoUrl}...`);
  const repo = client
    .container()
    .from("alpine/git:2.45.2")
    .withEntrypoint([]) 
    .withExec(["git", "clone", "--depth", "1", repoUrl, "/repo"]);

  console.error(`[Dagger] Fetching README...`);
  const readmeFile = repo.file("/repo/README.md");
  const readme = await readmeFile.contents().catch(() => "README not found or empty.");

  console.error(`[Dagger] Listing files...`);
  const tree = await repo
    .withExec(["sh", "-c", "cd /repo && find . -maxdepth 2 -not -path '*/.*'"])
    .stdout()
    .catch(() => "Error generating tree.");

  return ToolResultSchema.parse({
    readme,
    tree
  });
}

export function createDaggerClientFactory() {
  const host = process.env.DAGGER_HOST || "tcp://127.0.0.1:6060";
  return {
    withClient: async (callback) => {
      console.error(`[Dagger] Connecting to ${host}...`);
      let result;
      try {
        await connect(
          async (client) => {
            console.error(`[Dagger] Connected. Calling callback...`);
            result = await callback(client);
          },
          { host }
        );
        return result;
      } catch (err) {
        console.error(`[Dagger] Connection or execution error: ${err.message}`);
        throw err;
      }
    }
  };
}

export function createRepositoryScanner({ daggerClientFactory }) {
  return async function runScan(repoUrl) {
    return daggerClientFactory.withClient((client) =>
      scanRepositoryWithClient(client, repoUrl)
    );
  };
}
