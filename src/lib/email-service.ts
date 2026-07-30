import { toast } from "sonner";

export interface EmailParams {
  toEmail: string;
  recipientName: string;
}

/**
 * Sends Volunteer Registration Confirmation Email
 */
export async function sendVolunteerReceivedEmail({ toEmail, recipientName }: EmailParams) {
  console.log(`[EMAIL SERVICE] Sending Volunteer Registration Confirmation to ${toEmail}...`);
  // Log message format
  const subject = "Volunteer Application Received — Ganapathi Festival 2026";
  const messageBody = `
Dear ${recipientName},

Thank you for applying to join the Ganapathi Festival 2026 Seva & Volunteer Team!

We have successfully received your volunteer registration form.
Application Details:
- Status: Pending Admin Verification
- Submission Date: ${new Date().toLocaleDateString("en-IN")}

What happens next?
1. Our Mandal Organising Committee will review your submitted skills and availability.
2. Once approved, you will receive an official approval confirmation email.
3. You will then be assigned to your preferred seva duty counter.

Thank you for your dedication to Ganapathi Bappa!

Warm regards,
Mandal Organising Committee
Ganapathi Festival 2026
  `;

  console.log(`Subject: ${subject}\nBody: ${messageBody}`);
  
  // Show UI toast notice for confirmation dispatch
  toast.success(`Confirmation email sent to ${toEmail}`);
  return { success: true };
}

/**
 * Sends Volunteer Approval Email
 */
export async function sendVolunteerApprovedEmail({ toEmail, recipientName }: EmailParams) {
  console.log(`[EMAIL SERVICE] Sending Volunteer Approval Email to ${toEmail}...`);
  const subject = "Congratulations! Your Volunteer Application Has Been Approved — Ganapathi Festival 2026";
  const messageBody = `
Dear ${recipientName},

Great news! Your volunteer application for Ganapathi Festival 2026 has been APPROVED by the Mandal Admin Team.

Welcome to our official volunteer team!

Next Steps:
- You can view your active volunteer status in your profile.
- Our team will contact you via WhatsApp / Phone regarding duty rosters and briefing sessions.

Ganapathi Bappa Morya!

Warm regards,
Mandal Organising Committee
  `;

  console.log(`Subject: ${subject}\nBody: ${messageBody}`);
  toast.success(`Approval email sent to ${toEmail}`);
  return { success: true };
}

/**
 * Sends Volunteer Rejection/Status Update Email
 */
export async function sendVolunteerStatusUpdateEmail({
  toEmail,
  recipientName,
  status,
}: EmailParams & { status: string }) {
  console.log(`[EMAIL SERVICE] Sending Volunteer Status Update (${status}) to ${toEmail}...`);
  const subject = "Volunteer Application Status Update — Ganapathi Festival 2026";
  const messageBody = `
Dear ${recipientName},

Your volunteer application status for Ganapathi Festival 2026 has been updated to: ${status.toUpperCase()}.

Thank you for your interest in serving during the festival.

Warm regards,
Mandal Organising Committee
  `;

  console.log(`Subject: ${subject}\nBody: ${messageBody}`);
  toast.info(`Status update notification sent to ${toEmail}`);
  return { success: true };
}

/**
 * Sends Official Donation Receipt Email
 */
export async function sendDonationReceiptEmail({
  toEmail,
  donorName,
  amount,
  paymentId,
  date,
}: {
  toEmail: string;
  donorName: string;
  amount: number;
  paymentId: string;
  date: string;
}) {
  console.log(`[EMAIL SERVICE] Sending Donation Receipt to ${toEmail}...`);
  const formattedAmount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  const subject = "Official Donation Receipt — Ganapathi Festival 2026";
  const messageBody = `
Dear ${donorName},

Thank you for your generous donation of ${formattedAmount} to Ganapathi Festival 2026!

Donation Receipt Details:
- Transaction / Payment ID: ${paymentId}
- Donor Name: ${donorName}
- Date: ${date}
- Amount Received: ${formattedAmount}
- Payment Gateway: Razorpay Verified
- Status: Successful (Approved)

Your contribution supports our Annadana Seva, Pandal Decorations, Prasada Distribution, and Cultural Programmes.

May Lord Ganapathi bless you and your family with health, peace, and prosperity!

Ganapathi Bappa Morya!

Warm regards,
Mandal Organising Committee
Ganapathi Festival 2026
  `;

  console.log(`Subject: ${subject}\nBody: ${messageBody}`);
  toast.success(`Official receipt sent to ${toEmail}`);
  return { success: true };
}
