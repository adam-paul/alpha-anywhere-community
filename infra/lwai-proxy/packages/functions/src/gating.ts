import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand
} from '@aws-sdk/client-athena';
import { Resource } from 'sst';

const COACHBOT_ROLE_ARN = process.env.COACHBOT_ROLE_ARN!;
const ATHENA_DATABASE = process.env.ATHENA_DATABASE!;
const ATHENA_OUTPUT = process.env.ATHENA_OUTPUT!;
const WEEKLY_THRESHOLD = parseInt(process.env.WEEKLY_THRESHOLD ?? '300', 10);

interface GatingResponse {
  email: string;
  weekly_active_minutes: number;
  threshold: number;
  eligible: boolean;
}

interface ErrorResponse {
  error: string;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Validate API key
  const providedKey = event.headers['x-api-key'];
  if (providedKey !== Resource.ApiKey.value) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' } satisfies ErrorResponse)
    };
  }

  // Extract email from query params
  const email = event.queryStringParameters?.email;
  if (!email) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing email parameter' } satisfies ErrorResponse)
    };
  }

  try {
    // 1. Assume the Coachbot role
    console.log('Assuming role:', COACHBOT_ROLE_ARN);
    const sts = new STSClient({ region: 'us-east-1' });
    const assumed = await sts.send(
      new AssumeRoleCommand({
        RoleArn: COACHBOT_ROLE_ARN,
        RoleSessionName: 'lwai-gating-query'
      })
    );

    const creds = assumed.Credentials;
    if (!creds?.AccessKeyId || !creds?.SecretAccessKey || !creds?.SessionToken) {
      throw new Error('Failed to assume role');
    }
    console.log('Role assumed successfully');

    // 2. Create Athena client with temporary credentials
    const athena = new AthenaClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: creds.AccessKeyId,
        secretAccessKey: creds.SecretAccessKey,
        sessionToken: creds.SessionToken
      }
    });

    // 3. Query weekly active minutes
    // Escape single quotes in email to prevent SQL injection
    const safeEmail = email.replace(/'/g, "''");
    const query = `
      SELECT COALESCE(SUM(active_minutes), 0) as total_minutes
      FROM daily_learning_metrics
      WHERE email = '${safeEmail}'
        AND date >= date_trunc('week', current_date)
    `;
    console.log('Executing query:', query.trim());

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

    // 4. Poll until query completes (with timeout)
    const maxAttempts = 30; // 15 seconds max
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
      // Get the failure reason
      const finalStatus = await athena.send(
        new GetQueryExecutionCommand({ QueryExecutionId: executionId })
      );
      const reason = finalStatus.QueryExecution?.Status?.StateChangeReason ?? 'unknown';
      console.error('Athena query failed:', { state, reason });
      throw new Error(`Query ${state.toLowerCase()}: ${reason}`);
    }

    // 5. Get results
    const results = await athena.send(
      new GetQueryResultsCommand({ QueryExecutionId: executionId })
    );

    const rows = results.ResultSet?.Rows ?? [];
    // First row is headers, second row is data
    const totalMinutes = rows.length > 1 ? parseFloat(rows[1].Data?.[0]?.VarCharValue ?? '0') : 0;

    const response: GatingResponse = {
      email,
      weekly_active_minutes: totalMinutes,
      threshold: WEEKLY_THRESHOLD,
      eligible: totalMinutes >= WEEKLY_THRESHOLD
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Gating query error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal error'
      } satisfies ErrorResponse)
    };
  }
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
