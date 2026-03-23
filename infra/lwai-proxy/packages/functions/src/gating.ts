import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Resource } from 'sst';
import { createAthenaClient, executeAthenaQuery, sanitizeEmail } from './athena';

const WEEKLY_THRESHOLD = parseInt(process.env.WEEKLY_THRESHOLD ?? '300', 10);

import type { GatingResponse } from '@alpha/shared/types';

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
    const athena = await createAthenaClient();

    const safeEmail = sanitizeEmail(email);
    const query = `
      SELECT COALESCE(SUM(active_minutes), 0) as total_minutes
      FROM daily_learning_metrics
      WHERE email = '${safeEmail}'
        AND date >= date_trunc('week', current_date)
    `;

    const resultSet = await executeAthenaQuery(athena, query);

    const rows = resultSet.Rows ?? [];
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
