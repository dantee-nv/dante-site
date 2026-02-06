import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const sesClient = new SESv2Client({});

const MAX_NAME_LENGTH = 100;
const MAX_SUBJECT_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  if (!event?.body) {
    return {};
  }

  let rawBody = event.body;
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, "base64").toString("utf8");
  }

  return JSON.parse(rawBody);
}

function toStringValue(value) {
  return typeof value === "string" ? value : "";
}

function readHoneypotValue(body) {
  const candidates = [body.website, body.contactPreference, body.company, body.url];

  for (const candidate of candidates) {
    const value = toStringValue(candidate).trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function validateInput(input) {
  if (!input.name || input.name.length > MAX_NAME_LENGTH) {
    return false;
  }

  if (!input.email || !EMAIL_PATTERN.test(input.email)) {
    return false;
  }

  if (!input.subject || input.subject.length > MAX_SUBJECT_LENGTH) {
    return false;
  }

  if (!input.message || input.message.length > MAX_MESSAGE_LENGTH) {
    return false;
  }

  return true;
}

function buildEmailBody(input, metadata) {
  return [
    "New contact form submission",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    "",
    "Message:",
    input.message,
    "",
    "Metadata:",
    `Submitted At: ${metadata.submittedAt}`,
    `Source IP: ${metadata.sourceIp}`,
    `User Agent: ${metadata.userAgent}`,
  ].join("\n");
}

export async function handler(event) {
  const fromEmail = process.env.SES_FROM_EMAIL;
  const toEmail = process.env.CONTACT_TO_EMAIL;

  if (!fromEmail || !toEmail) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "missing_environment_configuration",
        hasFromEmail: Boolean(fromEmail),
        hasToEmail: Boolean(toEmail),
      }),
    );
    return jsonResponse(500, { ok: false, message: "Failed to send message." });
  }

  let body;
  try {
    body = parseBody(event);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "warn",
        event: "invalid_json_payload",
        errorMessage: error instanceof Error ? error.message : String(error),
      }),
    );
    return jsonResponse(400, { ok: false, message: "Invalid input." });
  }

  const input = {
    name: toStringValue(body.name).trim(),
    email: toStringValue(body.email).trim().toLowerCase(),
    subject: toStringValue(body.subject).trim(),
    message: toStringValue(body.message).trim(),
    honeypot: readHoneypotValue(body),
  };

  if (!validateInput(input)) {
    return jsonResponse(400, { ok: false, message: "Invalid input." });
  }

  if (input.honeypot) {
    return jsonResponse(200, { ok: true, message: "Message sent." });
  }

  const metadata = {
    submittedAt: new Date().toISOString(),
    sourceIp: event?.requestContext?.http?.sourceIp || "unknown",
    userAgent: event?.headers?.["user-agent"] || event?.headers?.["User-Agent"] || "unknown",
  };

  const command = new SendEmailCommand({
    FromEmailAddress: fromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    ReplyToAddresses: [input.email],
    Content: {
      Simple: {
        Subject: {
          Data: `[dantenavarro.com] ${input.subject}`,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: buildEmailBody(input, metadata),
            Charset: "UTF-8",
          },
        },
      },
    },
  });

  try {
    await sesClient.send(command);
    return jsonResponse(200, { ok: true, message: "Message sent." });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "ses_send_failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      }),
    );
    return jsonResponse(500, { ok: false, message: "Failed to send message." });
  }
}
