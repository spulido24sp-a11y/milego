import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export class LocalProvider {
  async upload(filePath, buffer) {
    const fullPath = join(UPLOAD_DIR, filePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return `/uploads/${filePath}`;
  }

  async delete(filePath) {
    const fullPath = join(UPLOAD_DIR, filePath);
    if (existsSync(fullPath)) await unlink(fullPath);
  }

  async getUrl(filePath) {
    return `/uploads/${filePath}`;
  }
}
