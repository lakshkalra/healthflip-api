import type { ProfileRecord } from '../../db/repositories/profile.repository.js';
import type { UserProfileContext } from '../../shared/ai/ai-provider.js';

/** The profile fields AI prompts receive. */
export function toProfileContext(profile: ProfileRecord): UserProfileContext {
  return {
    activityLevel: profile.activityLevel,
    age: profile.age,
    heightCm: profile.heightCm,
    name: profile.name,
    sex: profile.sex,
    weightKg: profile.weightKg,
  };
}

export function serializeProfile(profile: ProfileRecord) {
  return {
    activityLevel: profile.activityLevel,
    age: profile.age,
    heightCm: profile.heightCm,
    name: profile.name,
    sex: profile.sex,
    updatedAt: profile.updatedAt.toISOString(),
    weightKg: profile.weightKg,
  };
}
