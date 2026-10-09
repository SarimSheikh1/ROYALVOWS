import mongoose from "mongoose";

export const WhatsAppMessage = mongoose.model("WhatsAppMessage", new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  to: { type: String, required: true },
  details: { type: [String], required: true },
  status: { type: String, enum: ["Pending", "Sending", "Accepted", "Failed"], default: "Pending" },
  providerId: String,
  error: String,
}, { timestamps: true }));

export function whatsappConfig(env = process.env) {
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneId,
    WHATSAPP_API_VERSION: version, WHATSAPP_TEMPLATE_NAME: template } = env;
  if (!token || !phoneId || !version || !template) return null;
  if (!/^\d+$/.test(phoneId) || !/^v\d+\.\d+$/.test(version)) return null;
  return { token, phoneId, version, template, language: env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US" };
}

export async function sendWhatsApp(to: string, details: string[], config: NonNullable<ReturnType<typeof whatsappConfig>>, request = fetch) {
  const response = await request(`https://graph.facebook.com/${config.version}/${config.phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: "Bearer " + config.token, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template",
      template: { name: config.template, language: { code: config.language },
        components: [{ type: "body", parameters: details.map(text => ({ type: "text", text })) }] } }),
  });
  if (!response.ok) throw new Error("WhatsApp provider rejected request (HTTP " + response.status + ")");
  const body = await response.json();
  if (!body.messages?.[0]?.id) throw new Error("WhatsApp provider returned no message ID");
  return String(body.messages[0].id);
}

let running = false;
export async function dispatchWhatsApp() {
  const config = whatsappConfig();
  if (!config || running) return;
  running = true;
  try {
    for (let i = 0; i < 20; i++) {
      const message = await WhatsAppMessage.findOneAndUpdate({ status: "Pending" }, { $set: { status: "Sending" } }, { new: true, sort: { createdAt: 1 } });
      if (!message) break;
      try {
        const providerId = await sendWhatsApp(message.to, message.details, config);
        await WhatsAppMessage.updateOne({ _id: message._id }, { $set: { status: "Accepted", providerId } });
      } catch {
        // Do not automatically repeat an ambiguous network request: it may already have been accepted.
        await WhatsAppMessage.updateOne({ _id: message._id }, { $set: { status: "Failed", error: "Delivery request failed; inspect provider before retrying." } });
        console.error("WhatsApp confirmation request failed for booking " + message.booking);
      }
    }
  } finally { running = false; }
}
