import { createHash } from 'node:crypto';

import type { FastifyReply, FastifyRequest } from 'fastify';

import type { GuestRepository } from '../../db/repositories/guest.repository.js';
import { unauthorized } from '../errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    guest: { id: string } | null;
  }
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createGuestAuth(guestRepository: GuestRepository) {
  return async function requireGuest(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const token = parseBearerToken(request.headers.authorization);

    if (!token) {
      throw unauthorized();
    }

    const guest = await guestRepository.findActiveGuestByTokenHash(hashSessionToken(token));

    if (!guest) {
      throw unauthorized();
    }

    request.guest = { id: guest.id };
  };
}

function parseBearerToken(header: string | undefined): string | null {
  const match = /^Bearer (.+)$/.exec(header ?? '');
  return match?.[1] ?? null;
}
