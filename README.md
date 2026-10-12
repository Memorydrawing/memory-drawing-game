# Artist Trainer

by Sawyer Wall

Artist Trainer is a small browser game where you try to memorize and recreate randomly generated shapes.

## Running the Game

1. Open `index.html` in any modern web browser. No build step or server is required—just open the file directly.
2. The menu provides buttons for **Tutorial**, **Drills**, **Scenarios**, and **About**. The Drills menu combines memorization and dexterity exercises and includes a search bar and tag filter dropdown.

## Basic Controls

- **Time (sec)** – How long the shape stays visible before you draw.
- **Sides** – The number of sides of the polygon (or pick *Point* or *Line Segment*).
- **Size** – Small, Medium, or Big shapes.
- **Grid** – Show an optional grid on the canvas.
- **Point-to-Point / Freehand** – Toggle how you draw. Point-to-point lets you place dots; freehand lets you draw with the pointer.
  In freehand mode, once you release your line a tone plays indicating how close your drawing was to the hidden shape.
- **Highest/Lowest/Left-most/Right-most** – When checked, these reference points of the shape will remain visible while you draw.
- **New Shape** – Generate a new random shape.
- **Previous Shape** – View the last shape again.
- **Retry Shape** – Try drawing the current shape again.

When you are done drawing, the original shape is revealed so you can compare.

## Dependencies

The existing drawing drills use HTML5 and JavaScript. **Experimental → 3D Viewport**
uses a bundled copy of Three.js and needs a browser with WebGL 2 support.
It opens directly from `viewport3d.html`, with no server or CDN required.

### 3D Viewport experiment

- Upload a ZIP directly, or one GLB, glTF, OBJ, or STL model. ZIP files are
  unpacked locally, including nested folders and glTF companion files. If an
  archive contains several models, a dropdown lets you choose one. Standard,
  unencrypted ZIPs up to 100 MB (250 MB of extracted model files) are supported.
  For loose glTF files, select their `.bin` and texture
  files in the same selection. GLB is the simplest single-file option.
- Drag with one finger to orbit, pinch to zoom, or move two fingers to pan.
  Mouse controls are left-drag, scroll, and right-drag respectively.
- **Reset View** fits the model back into the frame.
- OBJ/STL use a neutral material; glTF/GLB retain supported materials/textures.
  Draco/Meshopt-compressed geometry and KTX2 textures are not supported yet.
- Imports are local, are not uploaded, and are not retained after reload.

The experiment deliberately has no timer, randomization, or lighting controls.
For development, use `npm ci`, `npm run build:3d`, and `npm test`. Commit the
generated `viewport3d.bundle.js` and its legal notice after changing the viewport
source. See `vendor/README.md` for dependency and license details.

## License



