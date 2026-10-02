import { randomBytes } from 'node:crypto';

import type { GuestRepository } from '../../db/repositories/guest.repository.js';
import { hashSessionToken } from '../../shared/auth/guest-auth.js';
import { notFound } from '../../shared/errors.js';
import { serializeGuest } from './guest.helper.js';

export function createGuestService(guestRepository: GuestRepository) {
  return {
    async createGuest() {
      const accessToken = randomBytes(32).toString('base64url');
      const guest = await guestRepository.createGuestWithSession(hashSessionToken(accessToken));

      return {
        accessToken,
        guest: serializeGuest(guest),
      };
    },

    async getGuest(guestId: string) {
      const guest = await guestRepository.findById(guestId);

      if (!guest) {
        throw notFound('Guest');
      }

      return serializeGuest(guest);
    },
  };
}
