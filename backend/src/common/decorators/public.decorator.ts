import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication. The global JwtAuthGuard
 * checks for this metadata and short-circuits — this way "protected by
 * default" is the platform's posture, and a route is public only by an
 * explicit, greppable annotation, never by omission.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
