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
  eyes: {
    label: 'Eyes',
    description: 'Dedicated studies for eyes and eyelids.',
    shapes: []
  },
  ears: {
    label: 'Ears',
    description: 'SVG plates for ear structure practice.',
    shapes: []
  },
  noses: {
    label: 'Noses',
    description: 'Silhouettes for planar and curved nose studies.',
    shapes: []
  },
  lips: {
    label: 'Lips',
    description: 'Lip and mouth shape variations.',
    shapes: []
  },
  heads: {
    label: 'Heads',
    description: 'Head block-ins, Loomis balls, and profile plates.',
    shapes: []
  },
  torsos: {
    label: 'Torsos',
    description: 'Front, back, and side torso constructions.',
    shapes: []
  },
  arms: {
    label: 'Arms',
    description: 'Arm rhythms and muscle grouping callouts.',
    shapes: []
  },
  legs: {
    label: 'Legs',
    description: 'Leg proportion and gesture silhouettes.',
    shapes: []
  },
  hands: {
    label: 'Hands',
    description: 'Hand gesture plates and structural breakdowns.',
    shapes: []
  },
  feet: {
    label: 'Feet',
    description: 'Foot silhouettes and structural studies.',
    shapes: []
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
