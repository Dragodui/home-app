export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function deepSnakeToCamel<T = any>(data: unknown): T {
  if (data === null || data === undefined) return data as T;
  if (data instanceof Date) return data as T;
  if (Array.isArray(data)) return data.map(deepSnakeToCamel) as T;
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[snakeToCamel(key)] = deepSnakeToCamel(value);
    }
    return result as T;
  }
  return data as T;
}

export function deepCamelToSnake<T = any>(data: unknown): T {
  if (data === null || data === undefined) return data as T;
  if (data instanceof Date) return data as T;
  if (Array.isArray(data)) return data.map(deepCamelToSnake) as T;
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[camelToSnake(key)] = deepCamelToSnake(value);
    }
    return result as T;
  }
  return data as T;
}
