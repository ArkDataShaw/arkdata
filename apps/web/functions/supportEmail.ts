import { base44 } from "@/api/base44Client";

export async function sendSupportEmail(userEmail, message) {
  try {
    const result = await base44.integrations.Core.SendEmail({
      to: "noahmonks2@mail.com",
      subject: `Support Request from ${userEmail}`,
      body: `
Support Request

User Email: ${userEmail}
Phone: (512)621-9833

Message:
${message}

---
This message was sent from the Ark Data support form.
      `.trim(),
      from_name: "Ark Data Support"
    });
    
    return { status: "success", message: "Support email sent" };
  } catch (error) {
    console.error("Support email error:", error);
    throw error;
  }
}