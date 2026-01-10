import test from "node:test";
import assert from "node:assert/strict";
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
    withEntrypoint(args) {
      calls.push(["withEntrypoint", args]);
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

test("scanRepositoryWithClient builds container definition", async () => {
  const fakeRepo = buildFakeRepo();
  const output = await scanRepositoryWithClient(fakeRepo, "https://example.com/repo.git");

  assert.equal(output.readme, "README content");
  assert.ok(output.tree.includes("README.md"));
  assert.ok(fakeRepo.calls.find(([name]) => name === "from"));
});

test("repository scanner uses injected dagger client factory", async () => {
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

  assert.ok(called);
  assert.equal(output.readme, "README content");
});
