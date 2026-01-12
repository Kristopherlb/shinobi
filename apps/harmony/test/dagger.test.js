import { describe, it, expect } from 'vitest';
import {
  scanRepositoryWithClient,
  createRepositoryScanner
} from "../src/dagger/scan-repo.js";

function buildFakeRepo() {
  const calls = [];
  const repo = {
    calls,
    container() {
      calls.push(["container"]);
      return repo;
    },
    from(image) {
      calls.push(["from", image]);
      return repo;
    },
    withExec(args) {
      calls.push(["withExec", args]);
      return repo;
    },
    file(path) {
      calls.push(["file", path]);
      return {
        contents: async () => "README content"
      };
    },
    async stdout() {
      calls.push(["stdout"]);
      return "./README.md\n./src/index.js";
    }
  };

  return repo;
}

describe("dagger", () => {
  it("scanRepositoryWithClient builds container definition", async () => {
    const fakeRepo = buildFakeRepo();
    const output = await scanRepositoryWithClient(fakeRepo, "https://example.com/repo.git");

    expect(output.readme).toBe("README content");
    expect(output.tree.includes("README.md")).toBe(true);
    expect(fakeRepo.calls.find(([name]) => name === "from")).toBeDefined();
  });

  it("repository scanner uses injected dagger client factory", async () => {
    let called = false;
    const fakeRepo = buildFakeRepo();
    const daggerClientFactory = {
      withClient: async (callback) => {
        called = true;
        return callback(fakeRepo);
      }
    };
    const scan = createRepositoryScanner({ daggerClientFactory });
    const output = await scan("https://example.com/repo.git");

    expect(called).toBe(true);
    expect(output.readme).toBe("README content");
  });
});
