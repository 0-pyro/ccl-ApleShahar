import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const region = process.env.AWS_REGION || 'ap-south-1';
const TOPIC_ARN = process.env.SNS_TOPIC_ARN;

// Automatically uses IAM Instance Profile when running on EC2
const snsClient = new SNSClient({ region });

/**
 * Sends an alert when a new complaint is filed.
 * Gracefully no-ops if SNS_TOPIC_ARN is not configured.
 */
export async function sendComplaintAlert(complaint) {
  if (!TOPIC_ARN) {
    console.log(`[SNS:DevMode] New complaint in Ward ${complaint.ward} - "${complaint.prob_description}"`);
    return;
  }

  try {
    const subject = `[ApleShahar Alert] New Issue in Ward ${complaint.ward}`;
    const message = [
      `[ApleShahar] New Civic Issue Reported!`,
      `---------------------------------------`,
      `Ward: ${complaint.ward}`,
      `Type: ${complaint.issue_type || 'General'}`,
      `Description: ${complaint.prob_description}`,
      `Location Coords: ${complaint.location_coords || 'N/A'}`,
      `Reported At: ${new Date(complaint.created_at || Date.now()).toLocaleString()}`,
      `---------------------------------------`,
      `Access the authority portal to review and assign an ETA.`
    ].join('\n');

    await snsClient.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Subject: subject,
      Message: message,
    }));
    console.log(`[SNS] Alert dispatched for complaint #${complaint.id}`);
  } catch (err) {
    console.warn(`[SNS] Failed to send notification:`, err.message);
  }
}

/**
 * Sends an alert when a complaint is marked resolved.
 */
export async function sendResolutionAlert(complaint) {
  if (!TOPIC_ARN) return;

  try {
    const subject = `[ApleShahar Alert] Issue #${complaint.id} Resolved in Ward ${complaint.ward}`;
    const message = [
      `[ApleShahar] Civic Issue Resolved!`,
      `---------------------------------------`,
      `Complaint ID: #${complaint.id}`,
      `Ward: ${complaint.ward}`,
      `Resolution: ${complaint.resolve_description || 'Resolved by ward team'}`,
      `Resolved At: ${new Date().toLocaleString()}`,
      `---------------------------------------`,
      `Citizens can now verify resolution and submit satisfaction feedback.`
    ].join('\n');

    await snsClient.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Subject: subject,
      Message: message,
    }));
  } catch (err) {
    console.warn(`[SNS] Failed to send resolution notification:`, err.message);
  }
}
