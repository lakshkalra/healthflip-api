export function serializeGuest(guest: { createdAt: Date; id: string }) {
  return {
    createdAt: guest.createdAt.toISOString(),
    id: guest.id,
  };
}
