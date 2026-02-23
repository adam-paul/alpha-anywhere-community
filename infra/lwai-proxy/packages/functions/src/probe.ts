/**
 * LWAI Probe Endpoint
 *
 * Checks whether a student exists in the LWAI/CoachBot database (Athena).
 * Used to determine gating source: if a student has any historical data
 * in daily_learning_metrics, they're an LWAI student.
 *
 * GET /probe?email=student@example.com
 * Returns: { email, exists: boolean }
 */

import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Resource } from 'sst';
import { createAthenaClient, executeAthenaQuery, sanitizeEmail } from './athena';

interface ProbeResponse {
  email: string;
  exists: boolean;
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
    const athena = await createAthenaClient();

    const safeEmail = sanitizeEmail(email);
    const query = `
      SELECT 1 FROM daily_learning_metrics
      WHERE email = '${safeEmail}'
      LIMIT 1
    `;

    const resultSet = await executeAthenaQuery(athena, query);

    // First row is headers. If there's a second row, the student exists.
    const rows = resultSet.Rows ?? [];
    const exists = rows.length > 1;

    const response: ProbeResponse = { email, exists };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Probe query error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal error'
      } satisfies ErrorResponse)
    };
  }
};
