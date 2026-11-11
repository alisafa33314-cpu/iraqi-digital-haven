import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import {
  normalizeOrderQuery,
  orderNumber,
  matchesOrderNumber,
  filterOrdersByNumber,
} from "./order-search";

const ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

describe("order number search", () => {
  test("the shown order number is the first 8 characters, uppercase, with #", () => {
    assert.equal(orderNumber(ID), "#A1B2C3D4");
  });

  test("an empty or # only query keeps every order", () => {
    assert.equal(normalizeOrderQuery(""), "");
    assert.equal(normalizeOrderQuery("   "), "");
    assert.equal(normalizeOrderQuery("#"), "");
    assert.equal(filterOrdersByNumber([{ id: ID }], "").length, 1);
    assert.equal(filterOrdersByNumber([{ id: ID }], "#").length, 1);
  });

  test("typing the shown number finds the order, with or without # and in any case", () => {
    assert.equal(matchesOrderNumber(ID, "A1B2C3D4"), true);
    assert.equal(matchesOrderNumber(ID, "a1b2c3d4"), true);
    assert.equal(matchesOrderNumber(ID, "#A1B2C3D4"), true);
    assert.equal(matchesOrderNumber(ID, "#a1b2c3"), true);
  });

  test("typing the full id with or without dashes finds the order", () => {
    assert.equal(matchesOrderNumber(ID, ID), true);
    assert.equal(matchesOrderNumber(ID, ID.replace(/-/g, "")), true);
  });

  test("a number that belongs to no order matches nothing", () => {
    assert.equal(matchesOrderNumber(ID, "ZZZZZZZZ"), false);
    assert.equal(filterOrdersByNumber([{ id: ID }], "#00000000").length, 0);
  });

  test("only the matching orders are returned", () => {
    const rows = [{ id: ID }, { id: "ffffffff-1111-2222-3333-444455556666" }];
    assert.deepEqual(filterOrdersByNumber(rows, "#A1B2C3D4").map((r) => r.id), [ID]);
  });
});
