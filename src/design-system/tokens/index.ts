/**
 * The token layer, in one import.
 *
 * Every value here resolves to a CSS custom property declared in
 * `src/app/globals.css` — that file is the runtime source of truth and these
 * modules are its typed index. If you add a token, add it in both places or
 * the docs at /design-system/tokens will lie.
 */
export { brand, semanticVars, type BrandColor, type SemanticVar } from "./colors";
export { typeScale, fontRoles } from "./typography";
export { space, semanticSpace } from "./spacing";
export { radii, shadows } from "./radii-shadows";
export { durations, easings, presetNames, type PresetName } from "./motion";
export { ornateBorder, motifTokens } from "./borders-ornaments";
export {
  contentWidths,
  rhythms,
  surfaces,
  zLayers,
  layoutSpace,
  type ContentWidth,
  type Rhythm,
  type Surface,
  type ZLayer,
} from "./layout";
