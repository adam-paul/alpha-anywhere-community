/**
 * Profile API endpoint
 *
 * PATCH - Update current user's profile
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import { getEvaluator } from '$lib/server/evals';
import type { RequestHandler } from './$types';

type ProfileField = 'bio' | 'location';

export const PATCH: RequestHandler = async ({ request, locals, platform }) => {
  // Must be authenticated
  if (!locals.user) {
    error(401, 'Not authenticated');
  }

  if (!platform?.env?.DB) {
    error(503, 'Database not available');
  }

  const db = createDbClient(platform.env.DB);
  const userId = locals.user.id;

  // Parse and validate request body
  const body = await request.json();
  const { bio, location, interests } = body;

  // Validate interests is an array of strings if provided
  if (interests !== undefined) {
    if (!Array.isArray(interests) || !interests.every((i) => typeof i === 'string')) {
      error(400, 'Interests must be an array of strings');
    }
  }

  // Moderate free-text fields before writing. `interests` is an enum list,
  // no moderation needed.
  const evaluator = getEvaluator();
  const fieldsToModerate: Array<{ name: ProfileField; value: string }> = [];
  if (typeof bio === 'string' && bio.trim().length > 0) {
    fieldsToModerate.push({ name: 'bio', value: bio.trim() });
  }
  if (typeof location === 'string' && location.trim().length > 0) {
    fieldsToModerate.push({ name: 'location', value: location.trim() });
  }

  for (const field of fieldsToModerate) {
    const decision = await evaluator.moderate(field.value, 'about_me');
    if (decision.status === 'flagged') {
      const primary = decision.categories[0];
      await db.moderation.createEvent({
        user_id: userId,
        source: 'about_me',
        category: primary.category,
        subcategory: primary.subcategory,
        severity: decision.severity ?? 'medium',
        detected_by: decision.detectedBy === 'none' ? 'gemini' : decision.detectedBy,
        confidence: primary.confidence,
        flagged_content: field.value,
        detection_details: JSON.stringify({ gemini: decision.gemini, openai: decision.openai }),
        latency_ms: decision.latencyMs
      });
      return json(
        {
          error: 'moderation_rejected',
          field: field.name,
          category: primary.category,
          message: decision.userMessage
        },
        { status: 400 }
      );
    }
    if (decision.status === 'unavailable') {
      return json(
        {
          error: 'moderation_unavailable',
          field: field.name,
          message: decision.userMessage
        },
        { status: 503 }
      );
    }
  }

  // Update the profile
  const updatedProfile = await db.profiles.upsert(userId, {
    bio: bio ?? undefined,
    location: location ?? undefined,
    interests: interests ?? undefined
  });

  return json({
    success: true,
    profile: {
      bio: updatedProfile.bio,
      location: updatedProfile.location,
      interests: updatedProfile.interests ? JSON.parse(updatedProfile.interests) : []
    }
  });
};
