import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

/**
 * Safely read a file, returning null if it doesn't exist or isn't readable.
 */
export async function safeReadFile(
  filePath: string,
  maxBytes?: number,
): Promise<string | null> {
  try {
    await access(filePath, constants.R_OK);
    const content = await readFile(filePath, 'utf-8');
    if (maxBytes && content.length > maxBytes) {
      return content.slice(0, maxBytes);
    }
    return content;
  } catch {
    return null;
  }
}

/**
 * Check if a path exists and is readable.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
