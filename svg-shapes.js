export const svgShapeCatalog = {
  anatomy: {
    label: 'Anatomy',
    description: 'Outlines for features like ears, eyes, and noses.',
    shapes: [
      { id: 'ear_simple', name: 'Ear contour', src: 'assets/svg/anatomy/ear_simple.svg' },
      { id: 'eye_simple', name: 'Eye contour', src: 'assets/svg/anatomy/eye_simple.svg' },
      { id: 'nose_simple', name: 'Nose contour', src: 'assets/svg/anatomy/nose_simple.svg' },
      { id: 'mouth_simple', name: 'Mouth contour', src: 'assets/svg/anatomy/mouth_simple.svg' }
    ]
  },
  mastercopy: {
    label: 'Mastercopy',
    description: 'Bargue-style plates and master drawings.',
    shapes: [
      { id: 'bargue_plate_curve', name: 'Bargue plate curve', src: 'assets/svg/mastercopy/bargue_plate_curve.svg' },
      { id: 'classic_profile', name: 'Classic profile', src: 'assets/svg/mastercopy/classic_profile.svg' }
    ]
  }
};

export function getCategories() {
  return Object.entries(svgShapeCatalog).map(([key, value]) => ({ key, ...value }));
}

export function getShapesForCategory(key) {
  return svgShapeCatalog[key]?.shapes || [];
}
