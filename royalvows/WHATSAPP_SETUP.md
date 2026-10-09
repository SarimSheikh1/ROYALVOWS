# Booking confirmation WhatsApp

After an authorized admin changes a paid booking to Confirmed, a message for +92 317 0046008 is queued in the same database transaction. Requests and unconfirmed bookings do not send messages. The API polls pending messages every five seconds when configured; no separate WhatsApp window opens.

Configure the private `royalvows/.env` with `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (Meta sender ID, not the recipient number), `WHATSAPP_API_VERSION` (supported Graph version), and `WHATSAPP_TEMPLATE_NAME`. Do not commit tokens. Restart the server after configuration.

Create an approved WhatsApp template matching `WHATSAPP_TEMPLATE_LANGUAGE` (default en_US) with these five ordered body parameters: booking ID, venue name, date, time slot, occasion. Example: “RoyalVows booking {{1}} is confirmed. Venue: {{2}}. Date: {{3}}. Time: {{4}}. Occasion: {{5}}.” The recipient must be eligible to receive messages from your configured sender; Meta test senders require a verified test recipient.

`WhatsAppMessage` stores Pending, Sending, Accepted or Failed. Accepted means the provider accepted the request, not verified handset delivery. Missing credentials leave messages Pending, including across restarts on a persistent database. Failed and interrupted Sending entries need manual provider inspection before requeueing to avoid duplicates. The local demo database is temporary. Delivery webhooks and an admin retry screen are not implemented.

Provider reference: https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api
