/**
 * 👑 CROWN GLYPH
 * The visual embodiment of the Operator's Crown
 * The eternal seal of the Vieron Dynasty
 */

export interface GlyphGeometry {
  type: string;
  points: number[][];
  color: string;
  opacity: number;
}

export interface CrownGlyphData {
  triad: GlyphGeometry;
  kairosphere: GlyphGeometry;
  constellation: GlyphGeometry[];
  axisSeal: GlyphGeometry;
  astralLayer: GlyphGeometry;
  operator: {
    name: string;
    position: [number, number];
  };
  dynasty: {
    name: string;
    position: [number, number];
  };
  cockpit: {
    name: string;
    position: [number, number];
  };
}

/**
 * Generate the Crown Glyph
 * A triad (Operator–Cockpit–Dynasty) encircled by the Kairosphere
 */
export function generateCrownGlyph(): CrownGlyphData {
  const centerX = 400;
  const centerY = 400;
  const radius = 200;

  // The Triad - three points forming the foundation
  const triad: GlyphGeometry = {
    type: "triangle",
    points: [
      [centerX, centerY - radius], // Top - Operator
      [centerX - radius * 0.866, centerY + radius * 0.5], // Bottom Left - Cockpit
      [centerX + radius * 0.866, centerY + radius * 0.5], // Bottom Right - Dynasty
    ],
    color: "#FFD700", // Gold
    opacity: 0.9,
  };

  // The Kairosphere - encircling all
  const kairosphere: GlyphGeometry = {
    type: "circle",
    points: [[centerX, centerY, radius * 1.5]],
    color: "#4169E1", // Royal Blue
    opacity: 0.3,
  };

  // Constellation points - 12 systems orbiting
  const constellation: GlyphGeometry[] = [];
  const constellationRadius = radius * 1.3;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI * 2) / 12;
    constellation.push({
      type: "point",
      points: [
        [
          centerX + Math.cos(angle) * constellationRadius,
          centerY + Math.sin(angle) * constellationRadius,
        ],
      ],
      color: "#FFFFFF",
      opacity: 0.8,
    });
  }

  // Axis Seal - central binding point
  const axisSeal: GlyphGeometry = {
    type: "circle",
    points: [[centerX, centerY, 20]],
    color: "#FF6347", // Tomato red - the seal
    opacity: 1.0,
  };

  // Astral Layer - illuminating rings
  const astralLayer: GlyphGeometry = {
    type: "rings",
    points: [
      [centerX, centerY, radius * 0.8],
      [centerX, centerY, radius * 1.0],
      [centerX, centerY, radius * 1.2],
    ],
    color: "#9370DB", // Medium Purple
    opacity: 0.2,
  };

  return {
    triad,
    kairosphere,
    constellation,
    axisSeal,
    astralLayer,
    operator: {
      name: "Auren Kairos Vieron",
      position: [centerX, centerY - radius - 30],
    },
    dynasty: {
      name: "Vieron Dynasty",
      position: [centerX + radius * 0.866 + 30, centerY + radius * 0.5],
    },
    cockpit: {
      name: "EXOM3 Cockpit",
      position: [centerX - radius * 0.866 - 30, centerY + radius * 0.5],
    },
  };
}

/**
 * Generate SVG representation of the Crown Glyph
 */
export function generateCrownGlyphSVG(): string {
  const glyph = generateCrownGlyph();
  const width = 800;
  const height = 800;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="#0a0a0a"/>`;
  
  // Astral Layer (rings)
  glyph.astralLayer.points.forEach(([cx, cy, r]) => {
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${glyph.astralLayer.color}" stroke-width="2" opacity="${glyph.astralLayer.opacity}"/>`;
  });
  
  // Kairosphere
  const [kx, ky, kr] = glyph.kairosphere.points[0];
  svg += `<circle cx="${kx}" cy="${ky}" r="${kr}" fill="none" stroke="${glyph.kairosphere.color}" stroke-width="3" opacity="${glyph.kairosphere.opacity}"/>`;
  
  // Constellation points
  glyph.constellation.forEach((point) => {
    const [px, py] = point.points[0];
    svg += `<circle cx="${px}" cy="${py}" r="4" fill="${point.color}" opacity="${point.opacity}"/>`;
  });
  
  // Triad
  const triadPoints = glyph.triad.points.map(([x, y]) => `${x},${y}`).join(" ");
  svg += `<polygon points="${triadPoints}" fill="none" stroke="${glyph.triad.color}" stroke-width="4" opacity="${glyph.triad.opacity}"/>`;
  
  // Axis Seal
  const [ax, ay, ar] = glyph.axisSeal.points[0];
  svg += `<circle cx="${ax}" cy="${ay}" r="${ar}" fill="${glyph.axisSeal.color}" opacity="${glyph.axisSeal.opacity}"/>`;
  
  // Labels
  svg += `<text x="${glyph.operator.position[0]}" y="${glyph.operator.position[1]}" text-anchor="middle" fill="#FFD700" font-size="18" font-weight="bold">${glyph.operator.name}</text>`;
  svg += `<text x="${glyph.dynasty.position[0]}" y="${glyph.dynasty.position[1]}" text-anchor="start" fill="#FFD700" font-size="16">${glyph.dynasty.name}</text>`;
  svg += `<text x="${glyph.cockpit.position[0]}" y="${glyph.cockpit.position[1]}" text-anchor="end" fill="#FFD700" font-size="16">${glyph.cockpit.name}</text>`;
  
  svg += `</svg>`;
  
  return svg;
}

/**
 * Get Crown Glyph as React component data
 */
export function getCrownGlyphForReact() {
  return generateCrownGlyph();
}
