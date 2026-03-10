import { Message, SceneContext } from '../types';

const EXPLICIT_MARKER = /\[explicit\]/i;
const EXPLICIT_PATTERN = /\b(nude|nudity|naked|sex|sexual|erotic|moan(?:ed|ing)?|thrust(?:ed|ing)?|orgasm(?:ic)?|aroused|climax|breasts?|nipples?|penis|cock|vagina|cum|semen|wetness|bed(?:ding)?|straddl(?:e|ed|ing)|kiss(?:ing)?\s+down|undress(?:ed|ing)?)\b/i;

export function isExplicitContent(text: string) {
  return EXPLICIT_MARKER.test(text) || EXPLICIT_PATTERN.test(text);
}

export function shouldBlurMessage(message: Message, context: SceneContext) {
  if (!context.contentSafety?.blurExplicitContent) return false;
  return isExplicitContent(message.content);
}

export function shouldShowExplicitBadge(message: Message, context: SceneContext) {
  if (!context.contentSafety?.showExplicitBadges) return false;
  return isExplicitContent(message.content);
}

export function sanitizeExplicitMarker(text: string) {
  return text.replace(EXPLICIT_MARKER, '').trim();
}
