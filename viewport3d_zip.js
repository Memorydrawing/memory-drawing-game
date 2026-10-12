import { unzip, unzipSync } from 'fflate';

const MODEL = /\.(glb|gltf|obj|stl)$/i;
const SUPPORTED = /\.(glb|gltf|obj|stl|bin|png|jpe?g|webp)$/i;
const MAX_ARCHIVE = 100 * 1024 * 1024;
const MAX_EXTRACTED = 250 * 1024 * 1024;

export const modelFiles = files => files.filter(file => MODEL.test(file.name));
export const filePath = file => file.archivePath || file.name;
export function normalizePath(path) {
  const parts = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

export async function prepareModelFiles(files) {
  const archives = files.filter(file => /\.zip$/i.test(file.name));
  if (!archives.length) return files;
  if (archives.length !== 1 || files.length !== 1) throw new Error('Select one ZIP archive at a time.');
  const archive = archives[0];
  if (archive.size > MAX_ARCHIVE) throw new Error('This ZIP is too large. Choose an archive under 100 MB.');
  const data = new Uint8Array(await archive.arrayBuffer());
  if (data.byteLength > MAX_ARCHIVE) throw new Error('This ZIP is too large. Choose an archive under 100 MB.');
  const allowed = new Set();
  let total = 0;
  try {
    // Read the directory before allocating extracted files; skip metadata and unrelated content.
    unzipSync(data, {filter(entry) {
      if (!SUPPORTED.test(entry.name) || /(^|\/)(__MACOSX|\.[^/]*)(\/|$)/.test(entry.name)) return false;
      total += entry.originalSize;
      if (total > MAX_EXTRACTED) throw new Error('The extracted model files exceed 250 MB. Try a smaller model.');
      allowed.add(entry.name);
      return false;
    }});
    if (![...allowed].some(path => MODEL.test(path))) throw new Error('No GLB, glTF, OBJ, or STL model was found inside the ZIP.');
    const extracted = await new Promise((resolve, reject) => {
      unzip(data, {filter: entry => allowed.has(entry.name)}, (error, result) => error ? reject(error) : resolve(result));
    });
    const types = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gltf: 'model/gltf+json', glb: 'model/gltf-binary'};
    return Object.entries(extracted).map(([path, bytes]) => {
      const name = path.replace(/\\/g, '/').split('/').pop();
      const file = new File([bytes], name, {type: types[name.split('.').pop().toLowerCase()] || 'application/octet-stream'});
      file.archivePath = normalizePath(path);
      return file;
    });
  } catch (error) {
    if (/exceed|No GLB/.test(error.message)) throw error;
    throw new Error('Could not unpack this ZIP. Use a standard, unencrypted ZIP archive.');
  }
}
