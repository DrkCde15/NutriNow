import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import { AnalyticsClient, LEGAL_PAGES } from "../modules/product.js";

const textFiles = ["index.html", "app.js", "styles.css", "modules/product.js"];
const mojibakeMarkers = ["Ã", "Â", "â€¢", "â€“", "â€”", "â€", "�"];

test("frontend text files stay valid UTF-8 without mojibake markers", async () => {
  for (const file of textFiles) {
    const content = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    for (const marker of mojibakeMarkers) {
      assert.equal(content.includes(marker), false, `${file} contains ${marker}`);
    }
  }
});

test("app is loaded as an ES module and product module is copied by build", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const build = await readFile(new URL("../build-static.mjs", import.meta.url), "utf8");
  assert.match(index, /<script\s+type="module"\s+src="\.\/app\.js/);
  assert.match(build, /modules/);
});

test("legal pages expose SaaS compliance surfaces", () => {
  assert.deepEqual(Object.keys(LEGAL_PAGES).sort(), ["lgpd", "privacidade", "termos"]);
  for (const page of Object.values(LEGAL_PAGES)) {
    assert.ok(page.route.startsWith("/"));
    assert.ok(page.sections.length >= 5);
  }
});

test("analytics metadata removes sensitive fields", () => {
  const storage = new Map();
  const client = new AnalyticsClient({
    storage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    endpoint: () => "http://localhost/analytics/events",
    getToken: () => "",
    getUserId: () => null,
    fetchImpl: async () => ({ ok: true }),
  });

  const clean = client.cleanMetadata({
    title: "Dashboard",
    password: "secret",
    message: "private chat text",
    count: 2,
  });
  assert.deepEqual(clean, { title: "Dashboard", count: 2 });
});
