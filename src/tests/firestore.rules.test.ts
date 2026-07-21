import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let env: RulesTestEnvironment;
const projectId = "picopals-local-test";
const valid = (uid = "alice") => ({
  ownerUid: uid,
  syncSchemaVersion: 1,
  saveSchemaVersion: 3,
  revision: 1,
  baseRevision: 0,
  deviceId: "device-alice-123",
  deviceName: "Browser",
  clientUpdatedAt: 1,
  serverUpdatedAt: 1,
  checksum: "abc",
  saveData: { schemaVersion: 3, pet: { id: "pet" }, game: { id: "main" } },
  appVersion: "3.0.0",
});
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => env.clearFirestore());
afterAll(async () => env.cleanup());
describe("Firestore Security Rules", () => {
  it("未登入不能讀取", () =>
    assertFails(
      getDoc(
        doc(
          env.unauthenticatedContext().firestore(),
          "users/alice/gameSaves/main",
        ),
      ),
    ));
  it("未登入不能寫入", () =>
    assertFails(
      setDoc(
        doc(
          env.unauthenticatedContext().firestore(),
          "users/alice/gameSaves/main",
        ),
        valid(),
      ),
    ));
  it("玩家 A 不能讀取玩家 B", () =>
    assertFails(
      getDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "users/bob/gameSaves/main",
        ),
      ),
    ));
  it("玩家 A 不能修改玩家 B", () =>
    assertFails(
      setDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "users/bob/gameSaves/main",
        ),
        valid("bob"),
      ),
    ));
  it("玩家只能寫入自己的存檔", () =>
    assertSucceeds(
      setDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "users/alice/gameSaves/main",
        ),
        valid(),
      ),
    ));
  it("錯誤 schema 被拒絕", () =>
    assertFails(
      setDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "users/alice/gameSaves/main",
        ),
        { ...valid(), saveSchemaVersion: 2 },
      ),
    ));
  it("缺少 revision 被拒絕", () => {
    const value = { ...valid() } as Record<string, unknown>;
    delete value.revision;
    return assertFails(
      setDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "users/alice/gameSaves/main",
        ),
        value,
      ),
    );
  });
  it("偽造 owner UID 被拒絕", () =>
    assertFails(
      setDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "users/alice/gameSaves/main",
        ),
        valid("mallory"),
      ),
    ));
});
