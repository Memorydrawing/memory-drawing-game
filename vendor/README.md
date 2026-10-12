# 3D viewport dependency

`viewport3d.bundle.js` bundles Three.js 0.186.1, its OrbitControls, and GLTF/OBJ/STL
loaders together with the viewport source. It is committed so GitHub Pages and
local HTML use do not require a build or a CDN. Three.js is MIT licensed; see
`THREE-LICENSE.txt` and the generated `viewport3d.bundle.js.LEGAL.txt`.

After changing `viewport3d.js` or `viewport3d_model.js`, run `npm ci` and
`npm run build:3d`, then commit the regenerated bundle and legal notice.

ZIP imports use fflate 0.8.2, also bundled locally. It is MIT licensed; see
`FFLATE-LICENSE.txt`.
