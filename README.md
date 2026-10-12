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

The reference and one compact control panel form a centered workspace. The panel
groups Model, Camera, and Lighting controls; a Help button opens the full
instructions. Model filenames sit above the red outlined viewport, and light /
background color pickers share one row.

- Upload a ZIP directly, or one GLB, glTF, OBJ, or STL model. ZIP files are
  unpacked locally, including ZIPs inside other ZIPs, nested folders, and glTF
  companion files. If an
  archive contains several models, a dropdown lets you choose one. Standard,
  unencrypted ZIPs up to 100 MB (250 MB of extracted model files) are supported.
  For loose glTF files, select their `.bin` and texture
  files in the same selection. GLB is the simplest single-file option.
- Drag with one finger to orbit, pinch to zoom, or move two fingers to pan.
  Mouse controls are left-drag, scroll, and right-drag respectively.
- **Reset View** fits the model back into the frame.
- **Lens** selects a 15, 24, 35, 50, 85, or 135 mm full-frame-equivalent view,
  using the center crop for the square viewport. Lens changes refit the model
  by adjusting camera distance: wider lenses view it from closer up; longer
  lenses from farther away. These are ideal perspective lenses without barrel
  distortion or depth-of-field blur.
- **Random Orientation** gives the model a random 3D orientation, including tilt,
  and fits it back into the frame.
- Roll the **Lighting** sphere with one finger to move the light around the
  model. Swipes continue around the full sphere, including the back, top, and
  underside. The sphere preview shows the current direction relative to your
  view. You can also use arrow keys when the sphere is focused.
- Choose **Light color** and adjust **Brightness** from 0–200%. **Reset Light**
  restores a white light above and in front of your current view. A gentle fixed
  fill keeps the model visible when the key light is dimmed or behind it.
- Choose **Background color** with the same color picker to change the viewport
  background.
- **Randomize Lighting** picks a new light direction, color, and brightness
  (30–200%) and updates the sphere and controls to match.
- OBJ/STL use a neutral material; glTF/GLB retain supported materials/textures.
  Draco/Meshopt-compressed geometry and KTX2 textures are not supported yet.
- Imports are local, are not uploaded, and are not retained after reload.

The experiment deliberately has no timer or automatic interval changes.
For development, use `npm ci`, `npm run build:3d`, and `npm test`. Commit the
generated `viewport3d.bundle.js` and its legal notice after changing the viewport
source. See `vendor/README.md` for dependency and license details.

### Contour Study experiment

**Experimental → Contour Study** copies the 3D viewport controls into a separate
exercise. A matching viewport on the left shows black lines on white for the
visible outer contour and the main light's form-shadow boundary. It shares the
same model and camera, updating after orbiting, importing, lens changes, random
orientation, and light changes. The original 3D Viewport remains available.

The line pass uses depth-tested visible surface normals and a light-facing mask,
then extracts silhouette and light/shadow transitions on the GPU. Hidden surfaces
do not draw through the model. Cast shadows, texture markings, and drawing/scoring
are outside this first experiment.

**Light-side planes** adds selected plane changes across the light, with a
broader and more sensitive range of detection. **Plane detail** tunes the minimum plane angle, proximity
to shadow, and light-value difference. Lower values keep only stronger, darker
plane changes; higher values include more detail. Disabling the option restores
the contour and form-shadow-only view.
Surface-normal filtering removes small scan noise, and a binary gap-closing pass
produces connected, strengthened black strokes with no gray shader output.

## License

### Quick-sketch experiment

**Experimental → Quick-sketch** implements the setup phase only: seconds per pose
(1–3600), number of randomized pose changes (1–1000), and a reference dropdown.
Basic 3D forms is the initial reference key; Bargue plates and the future 3D model
library are disabled placeholders. Choose **Add your own 3D model** to select
GLB, glTF, OBJ, STL, or ZIP files using the shared nested archive preparation.
Multiple models get a chooser, and companion files remain associated with the
selected model. This step prepares files; model parsing/rendering belongs to the
future active phase.

Start validates the setup and switches to an active-phase placeholder, retaining
settings and files in memory. Edit setup restores the form without losing them.
Reloading clears uploads. Timed randomization and review are not implemented yet.
Run `npm run build:quick-sketch` after changing its source.
