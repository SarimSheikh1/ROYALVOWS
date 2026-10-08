import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGuestCsv, exportGuestCsv } from "../client/src/guest-csv.js";
test("guest CSV preserves quoted commas, quotes and multiline fields", () => {
  const guests = [
    { name: "Ali, Sara", table: 'Table "A"' },
    { name: "Family\nGuest", table: "" },
  ];
  assert.deepEqual(parseGuestCsv(exportGuestCsv(guests)), guests);
});
test("guest CSV validates header, shape, quotes and guest limits", () => {
  for (const text of [
    "a,b\nx,y",
    'name,table\n"Ali,A',
    "name,table\nA,B,C",
    "name,table\n,B",
    'name,table\n"A"x,B',
  ])
    assert.throws(() => parseGuestCsv(text));
  assert.throws(() =>
    parseGuestCsv("name,table\n" + Array(2001).fill("Ali,A").join("\n")),
  );
  assert.deepEqual(parseGuestCsv("\uFEFFname,table\r\nAli,A\r\n"), [
    { name: "Ali", table: "A" },
  ]);
});
test("guest export neutralizes spreadsheet formulas including leading whitespace", () => {
  for (const name of ['=HYPERLINK("x")', " +1", "@A", "-1", "\t=1"])
    assert.equal(
      parseGuestCsv(exportGuestCsv([{ name, table: "" }]))[0].name[0],
      "'",
    );
});
