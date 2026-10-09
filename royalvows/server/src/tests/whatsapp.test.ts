import { test } from "node:test";
import assert from "node:assert/strict";
import { sendWhatsApp, whatsappConfig } from "../whatsapp.js";
const config = { token: "test-token", phoneId: "123456", version: "v23.0", template: "booking_confirmed", language: "en_US" };
test("WhatsApp is disabled until provider configuration is complete", () => {
  assert.equal(whatsappConfig({}), null);
  assert.equal(whatsappConfig({ WHATSAPP_ACCESS_TOKEN: "x", WHATSAPP_PHONE_NUMBER_ID: "123" }), null);
});
test("confirmation uses configured recipient and ordered template details", async () => {
  const details = ["booking-1", "Emerald Palace", "2026-11-16", "Lunch", "Walima"];
  const mock = (async (url, options) => {
    assert.equal(url, "https://graph.facebook.com/v23.0/123456/messages");
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.to, "923170046008");
    assert.equal(payload.type, "template");
    assert.deepEqual(payload.template.components[0].parameters.map((p: {text: string}) => p.text), details);
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), { status: 200 });
  }) as typeof fetch;
  assert.equal(await sendWhatsApp("923170046008", details, config, mock), "wamid.test");
});
test("provider rejection is not reported as success", async () => {
  const mock = (async () => new Response("{}", {status:403})) as typeof fetch;
  await assert.rejects(sendWhatsApp("923170046008", ["booking"], config, mock), /HTTP 403/);
});
