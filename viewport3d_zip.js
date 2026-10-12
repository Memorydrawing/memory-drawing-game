import { unzip, unzipSync } from 'fflate';

const MODEL = /\.(glb|gltf|obj|stl)$/i;
const SUPPORTED = /\.(zip|glb|gltf|obj|stl|bin|png|jpe?g|webp)$/i;
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

async function extractArchive(data, prefix, depth, budget) {
  if (depth > 8) throw new Error('This ZIP contains too many levels of nested archives (maximum 8).');
  const allowed = new Set();
  // Check every archive's directory before allocating files. The budget is shared
  // across all levels, including the sizes of nested ZIPs themselves.
  unzipSync(data, {filter(entry) {
    if (!SUPPORTED.test(entry.name) || /(^|\/)(__MACOSX|\.[^/]*)(\/|$)/.test(entry.name)) return false;
    budget.bytes += entry.originalSize;
    budget.files++;
    if (budget.bytes > MAX_EXTRACTED) throw new Error('The extracted model files exceed 250 MB. Try a smaller model.');
    if (budget.files > 2000) throw new Error('This ZIP contains too many model files (maximum 2000).');
    allowed.add(entry.name);
    return false;
  }});
  const extracted = await new Promise((resolve, reject) => {
    unzip(data, {filter: entry => allowed.has(entry.name)}, (error, result) => error ? reject(error) : resolve(result));
  });
  const files = [];
  const types = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gltf: 'model/gltf+json', glb: 'model/gltf-binary'};
  for (const [path, bytes] of Object.entries(extracted)) {
    const relativePath = normalizePath(prefix + path);
    if (/\.zip$/i.test(path)) {
      // Give each inner archive a separate virtual folder so companion paths
      // remain associated with their model even when filenames repeat.
      files.push(...await extractArchive(bytes, relativePath.replace(/\.zip$/i, '') + '/', depth + 1, budget));
    } else {
      const name = relativePath.split('/').pop();
      const file = new File([bytes], name, {type: types[name.split('.').pop().toLowerCase()] || 'application/octet-stream'});
      file.archivePath = relativePath;
      files.push(file);
    }
  }
  return files;
}

export async function prepareModelFiles(files) {
  const archives = files.filter(file => /\.zip$/i.test(file.name));
  if (!archives.length) return files;
  if (archives.length !== 1 || files.length !== 1) throw new Error('Select one ZIP archive at a time.');
  const archive = archives[0];
  if (archive.size > MAX_ARCHIVE) throw new Error('This ZIP is too large. Choose an archive under 100 MB.');
  const data = new Uint8Array(await archive.arrayBuffer());
  if (data.byteLength > MAX_ARCHIVE) throw new Error('This ZIP is too large. Choose an archive under 100 MB.');
  try {
    const prepared = await extractArchive(data, '', 0, {bytes: 0, files: 0});
    if (!modelFiles(prepared).length) throw new Error('No GLB, glTF, OBJ, or STL model was found inside the ZIP or its nested archives.');
    return prepared;
  } catch (error) {
    if (/exceed|No GLB|too many/.test(error.message)) throw error;
    throw new Error('Could not unpack this ZIP. Use a standard, unencrypted ZIP archive.');
  }
}
