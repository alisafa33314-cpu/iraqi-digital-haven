import { test } from "node:test";
import { strict as assert } from "node:assert";
import { languageDirection, resolveLanguage, translate } from "./index";
import { useLanguage } from "./index";
import { formatIQD } from "../data";

test("Arabic is the default and English switches to left-to-right", () => {
  assert.equal(resolveLanguage(null), "ar");
  assert.equal(resolveLanguage("en"), "en");
  assert.equal(languageDirection("en"), "ltr");
  assert.equal(languageDirection("ar"), "rtl");
});

test("English keeps order identifiers and numeric amounts unchanged", () => {
  assert.equal(translate("#A1B2C3D4", "en"), "#A1B2C3D4");
  assert.equal(translate("12345", "en"), "12345");
  assert.equal(translate("user@example.com", "en"), "user@example.com");
});

test("switching language keeps a 6000 IQD price in Iraqi dinars", () => {
  useLanguage.getState().setLanguage("en");
  assert.equal(formatIQD(6000), "6,000 IQD");
  useLanguage.getState().setLanguage("ar");
  assert.equal(formatIQD(6000), "٦٬٠٠٠ د.ع");
});