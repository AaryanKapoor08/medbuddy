/**
 * Emergency detection utility
 * Detects potential medical emergencies from user text input
 */

export interface EmergencyDetectionResult {
  isEmergency: boolean;
  severity: 'high' | 'medium' | 'low';
  keywords: string[];
  message?: string;
}

/**
 * High severity emergency keywords - immediate medical attention required
 */
const HIGH_SEVERITY_KEYWORDS = [
  'chest pain',
  'can\'t breathe',
  'cannot breathe',
  'can not breathe',
  'difficulty breathing',
  'trouble breathing',
  'shortness of breath',
  'severe pain',
  'unconscious',
  'passed out',
  'fainted',
  'severe bleeding',
  'heavy bleeding',
  'bleeding heavily',
  'heart attack',
  'stroke',
  'seizure',
  'choking',
  'not breathing',
];

/**
 * Medium severity emergency keywords - urgent but not immediately life-threatening
 */
const MEDIUM_SEVERITY_KEYWORDS = [
  'dizzy',
  'dizziness',
  'very weak',
  'extremely weak',
  'fell down',
  'fallen',
  'fell over',
  'confused',
  'disoriented',
  'severe headache',
  'intense pain',
  'moderate bleeding',
  'bleeding',
  'numbness',
  'tingling',
  'vision problems',
  'can\'t see',
  'cannot see',
];

/**
 * Low severity keywords - concerning but may not require immediate attention
 */
const LOW_SEVERITY_KEYWORDS = [
  'feeling unwell',
  'not feeling well',
  'feeling sick',
  'nauseous',
  'nausea',
  'lightheaded',
  'light headed',
  'feeling faint',
  'weak',
  'tired',
  'exhausted',
];

/**
 * Detects potential medical emergencies from user text
 * 
 * @param text - User's input text to analyze
 * @returns EmergencyDetectionResult with detection status, severity, and matched keywords
 * 
 * @example
 * ```typescript
 * const result = detectEmergency("I'm feeling dizzy and can't breathe");
 * // Returns: { isEmergency: true, severity: 'high', keywords: ['dizzy', "can't breathe"] }
 * ```
 */
export function detectEmergency(text: string): EmergencyDetectionResult {
  if (!text || typeof text !== 'string') {
    return {
      isEmergency: false,
      severity: 'low',
      keywords: [],
    };
  }

  const lowerText = text.toLowerCase().trim();
  const matchedKeywords: string[] = [];
  let highestSeverity: 'high' | 'medium' | 'low' = 'low';

  // Check for high severity keywords
  for (const keyword of HIGH_SEVERITY_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      highestSeverity = 'high';
    }
  }

  // Check for medium severity keywords (only if no high severity found)
  if (highestSeverity !== 'high') {
    for (const keyword of MEDIUM_SEVERITY_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        if (highestSeverity === 'low') {
          highestSeverity = 'medium';
        }
      }
    }
  }

  // Check for low severity keywords (only if no higher severity found)
  if (highestSeverity === 'low') {
    for (const keyword of LOW_SEVERITY_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }
  }

  const isEmergency = matchedKeywords.length > 0;

  // Generate appropriate message based on severity
  let message: string | undefined;
  if (isEmergency) {
    if (highestSeverity === 'high') {
      message = 'URGENT: High severity symptoms detected. Immediate medical attention may be required.';
    } else if (highestSeverity === 'medium') {
      message = 'CAUTION: Medium severity symptoms detected. Medical consultation recommended.';
    } else {
      message = 'NOTICE: Some concerning symptoms detected. Monitor your condition.';
    }
  }

  return {
    isEmergency,
    severity: highestSeverity,
    keywords: matchedKeywords,
    message,
  };
}

/**
 * Checks if emergency detection should trigger immediate action
 * 
 * @param result - Emergency detection result
 * @returns True if immediate action is required
 */
export function requiresImmediateAction(result: EmergencyDetectionResult): boolean {
  return result.isEmergency && result.severity === 'high';
}

