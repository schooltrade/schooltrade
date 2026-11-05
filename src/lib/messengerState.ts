export interface TimelineEntry { id: string; created_at: string }

export function mergeTimeline<T extends TimelineEntry>(current: T[], incoming: T[]): T[] {
  const byId = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function matchesMessage(content: string, query: string): boolean {
  return content.toLocaleLowerCase('he').includes(query.trim().toLocaleLowerCase('he'));
}