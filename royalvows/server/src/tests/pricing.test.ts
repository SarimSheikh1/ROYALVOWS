import { test } from "node:test";
import assert from "node:assert/strict";
import { price, transitions } from "../pricing.js";
const v = { rental: 10001, capacity: 100, taxBps: 175 };
const p = {
  name: "Pearl",
  perHead: 333,
  decor: 1234,
  minGuests: 10,
  maxGuests: 200,
};
test("calculates integer minor units and rounds configured tax once", () => {
  const x = price(v, p, 11);
  assert.equal(x.catering, 3663);
  assert.equal(x.tax, 261);
  assert.equal(x.total, 15159);
  assert.equal(x.discount, 0);
});
test("rejects fractional, below-package and over-capacity guests", () => {
  for (const n of [9, 101, 10.5, NaN]) assert.throws(() => price(v, p, n));
});
test("zero tax does not invent a jurisdiction rate", () =>
  assert.equal(price({ ...v, taxBps: 0 }, p, 10).tax, 0));
test("completed and cancelled bookings cannot reopen; cancellation precedes completion", () => {
  assert.deepEqual(transitions.Completed, []);
  assert.deepEqual(transitions.Cancelled, []);
  assert.equal(transitions["In Progress"].includes("Cancelled"), false);
  assert.ok(transitions.Confirmed.includes("Cancelled"));
});
test("configured discounts apply before tax and catering override is authoritative", () => {
  const x = price(v, p, 10, { addons: 1500, discount: 2000, menuPerHead: 400 });
  assert.equal(x.catering, 4000);
  assert.equal(x.discount, 2000);
  assert.equal(x.tax, 258);
  assert.equal(x.total, 14993);
});
test("negative rates and excessive discounts are rejected", () => {
  assert.throws(() => price(v, p, 10, { discount: 999999 }));
  assert.throws(() => price({ ...v, rental: -1 }, p, 10));
});
