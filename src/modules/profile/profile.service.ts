import type { ProfileRepository } from '../../db/repositories/profile.repository.js';
import { serializeProfile } from './profile.helper.js';
import type { UpsertProfileInput } from './profile.validator.js';

export function createProfileService(profileRepository: ProfileRepository) {
  return {
    async get(guestId: string) {
      const profile = await profileRepository.find(guestId);
      return profile ? serializeProfile(profile) : null;
    },

    async upsert(guestId: string, input: UpsertProfileInput) {
      // Round to the stored precision so the response matches what a later read returns.
      const profile = await profileRepository.upsert(guestId, {
        ...input,
        heightCm: Math.round(input.heightCm * 10) / 10,
        weightKg: Math.round(input.weightKg * 10) / 10,
      });
      return serializeProfile(profile);
    },
  };
}
