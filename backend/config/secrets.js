import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

/**
 * Loads configuration secrets from AWS Systems Manager (SSM) Parameter Store
 * under /apleshahar/ and populates process.env.
 * Falls back silently to local environment variables if SSM is unreachable or credentials are absent.
 */
export async function loadSecrets() {
  const pathPrefix = process.env.SSM_PARAM_PREFIX || '/apleshahar/';
  try {
    const command = new GetParametersByPathCommand({
      Path: pathPrefix,
      WithDecryption: true,
      Recursive: true,
    });
    const response = await ssmClient.send(command);
    if (response.Parameters && response.Parameters.length > 0) {
      for (const param of response.Parameters) {
        // Converts parameter name like /apleshahar/db_password to DB_PASSWORD
        const key = param.Name.replace(pathPrefix, '').toUpperCase();
        process.env[key] = param.Value;
      }
      console.log(`[Secrets] Loaded ${response.Parameters.length} parameters from AWS SSM Parameter Store (${pathPrefix}).`);
    } else {
      console.log(`[Secrets] No SSM parameters found at ${pathPrefix}, retaining local environment.`);
    }
  } catch (err) {
    console.warn(`[Secrets] AWS SSM Parameter Store fetch bypassed (${err.message}). Using local environment.`);
  }
}
