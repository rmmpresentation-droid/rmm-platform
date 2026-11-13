const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Additional participants are stored as a JSON string in the prototype's existing extra field.
export function parseAdditionalNetworkers(value) {
  if (value === undefined || value === '') return [];
  try {
    const ids = JSON.parse(value);
    if (!Array.isArray(ids) || ids.length > 10 || ids.some(id => typeof id !== 'string' || !uuid.test(id)) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length) return null;
    return ids.map(id => id.toLowerCase());
  } catch { return null; }
}
