/**
 * Shared Athena helpers for LWAI proxy functions.
 *
 * Handles STS role assumption, Athena client creation, query execution, and polling.
 */

import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  type ResultSet
} from '@aws-sdk/client-athena';

const COACHBOT_ROLE_ARN = process.env.COACHBOT_ROLE_ARN!;
const ATHENA_DATABASE = process.env.ATHENA_DATABASE!;
const ATHENA_OUTPUT = process.env.ATHENA_OUTPUT!;

/**
 * Assume the CoachBot IAM role and return an Athena client with temporary credentials.
 */
export async function createAthenaClient(): Promise<AthenaClient> {
  const sts = new STSClient({ region: 'us-east-1' });
  const assumed = await sts.send(
    new AssumeRoleCommand({
      RoleArn: COACHBOT_ROLE_ARN,
      RoleSessionName: 'lwai-proxy'
    })
  );

  const creds = assumed.Credentials;
  if (!creds?.AccessKeyId || !creds?.SecretAccessKey || !creds?.SessionToken) {
    throw new Error('Failed to assume role');
  }

  return new AthenaClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretAccessKey,
      sessionToken: creds.SessionToken
    }
  });
}

/**
 * Execute an Athena query, poll until complete, and return the result set.
 * Throws on timeout or query failure.
 */
export async function executeAthenaQuery(athena: AthenaClient, query: string): Promise<ResultSet> {
  const execution = await athena.send(
    new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: { Database: ATHENA_DATABASE },
      ResultConfiguration: { OutputLocation: ATHENA_OUTPUT }
    })
  );

  const executionId = execution.QueryExecutionId;
  if (!executionId) {
    throw new Error('Failed to start query');
  }

  // Poll until query completes (max 15 seconds)
  const maxAttempts = 30;
  let state = 'RUNNING';
  let attempts = 0;

  while ((state === 'RUNNING' || state === 'QUEUED') && attempts < maxAttempts) {
    await sleep(500);
    attempts++;

    const status = await athena.send(
      new GetQueryExecutionCommand({ QueryExecutionId: executionId })
    );
    state = status.QueryExecution?.Status?.State ?? 'FAILED';
  }

  if (state !== 'SUCCEEDED') {
    const finalStatus = await athena.send(
      new GetQueryExecutionCommand({ QueryExecutionId: executionId })
    );
    const reason = finalStatus.QueryExecution?.Status?.StateChangeReason ?? 'unknown';
    throw new Error(`Query ${state.toLowerCase()}: ${reason}`);
  }

  const results = await athena.send(new GetQueryResultsCommand({ QueryExecutionId: executionId }));

  return results.ResultSet ?? { Rows: [] };
}

/**
 * Sanitize an email for use in Athena SQL (escape single quotes).
 */
export function sanitizeEmail(email: string): string {
  return email.replace(/'/g, "''");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
