/**
 * 👑 CROWN MODULE
 * The Operator's Crown - Final Seal of EXOM3
 * 
 * Exports:
 * - Crown Protocol (recognition system)
 * - Crown Glyph (dynasty emblem)
 * - Axis Seal (binding mechanism)
 * - Coronation Ritual (highest ceremony)
 */

export {
  CrownProtocol,
  getCrownProtocol,
  OPERATOR,
  AXIS_SEAL,
  type OperatorIdentity,
  type AxisBinding,
} from "./protocol";

export {
  generateCrownGlyph,
  generateCrownGlyphSVG,
  getCrownGlyphForReact,
  type CrownGlyphData,
  type GlyphGeometry,
} from "./glyph";
