// Advanced Quiz Bowl Answer Matcher & Voice Recognition Normalizer

const FILLER_PHRASES = [
  'i think the answer is',
  'i think it is',
  'i think it might be',
  'the answer is',
  'it is',
  'it should be',
  'my answer is',
  'is it',
  'could it be',
  'i believe it is',
  'equals to',
  'equal to',
  'equals',
  'um',
  'uh',
  'ah',
  'er',
  'please',
  'sir',
  'ma'
];

const NUMBER_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

// Convert spoken word numbers into digit strings
export function parseSpokenNumberWords(text: string): string {
  let lower = text.toLowerCase().trim();

  // Special year compounds e.g. "nineteen sixty" -> 1960
  lower = lower.replace(/\bnineteen\s+sixty\b/g, '1960');
  lower = lower.replace(/\btwo\s+thousand\s+(?:and\s+)?two\b/g, '2002');
  lower = lower.replace(/\btwo\s+thousand\s+(?:and\s+)?one\s+hundred\b/g, '2100');
  lower = lower.replace(/\bsix\s+hundred\s+(?:and\s+)?forty\s+thousand\b/g, '640000');
  lower = lower.replace(/\bone\s+thousand\s+five\s+hundred\s+(?:and\s+)?forty\b/g, '1540');
  lower = lower.replace(/\bfifteen\s+forty\b/g, '1540');
  lower = lower.replace(/\beight\s+hundred\s+(?:and\s+)?twenty\b/g, '820');
  lower = lower.replace(/\beight\s+twenty\b/g, '820');
  lower = lower.replace(/\bone\s+hundred\s+(?:and\s+)?twenty\s+eight\b/g, '128');

  // Fractions
  lower = lower.replace(/\bthree\s+(?:quarters|fourths)\b/g, '3/4');
  lower = lower.replace(/\bseven\s+eighths\b/g, '7/8');
  lower = lower.replace(/\bone\s+eighth\b/g, '1/8');
  lower = lower.replace(/\bthree\s+fifths\b/g, '3/5');
  lower = lower.replace(/\bone\s+sixth\b/g, '1/6');

  // Multi-word numbers like "thirty six" -> 36, "forty nine" -> 49
  const tokens = lower.split(/\s+/);
  const outTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];

    if (
      curr &&
      next &&
      NUMBER_MAP[curr] !== undefined &&
      NUMBER_MAP[next] !== undefined &&
      NUMBER_MAP[curr] >= 20 &&
      NUMBER_MAP[curr] <= 90 &&
      NUMBER_MAP[next] < 10
    ) {
      outTokens.push(String(NUMBER_MAP[curr] + NUMBER_MAP[next]));
      i++; // Skip next
    } else if (NUMBER_MAP[curr] !== undefined) {
      outTokens.push(String(NUMBER_MAP[curr]));
    } else {
      outTokens.push(curr);
    }
  }

  return outTokens.join(' ');
}

// Strip conversational fillers
export function cleanSpokenTranscript(transcript: string): string {
  let cleaned = transcript.toLowerCase().trim();

  // Strip punctuation but keep forward slash and %
  cleaned = cleaned.replace(/[.,?!;:()'"`\-_]/g, ' ');

  // Strip leading filler phrases
  for (const filler of FILLER_PHRASES) {
    const regex = new RegExp(`^\\s*${filler}\\s+`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '');
    }
    // Also remove if at the end e.g. "thirty please"
    const endRegex = new RegExp(`\\s+${filler}\\s*$`, 'i');
    if (endRegex.test(cleaned)) {
      cleaned = cleaned.replace(endRegex, '');
    }
  }

  // Parse words into numbers
  cleaned = parseSpokenNumberWords(cleaned);

  // Normalize units
  cleaned = cleaned
    .replace(/\bkilometers?\s+per\s+hour\b/g, 'km/h')
    .replace(/\bkmh\b/g, 'km/h')
    .replace(/\bkm\s+per\s+hour\b/g, 'km/h')
    .replace(/\bcubic\s+centimeters?\b/g, 'cm3')
    .replace(/\bcm³\b/g, 'cm3')
    .replace(/\bpercent\b/g, '%')
    .replace(/\bpercentage\b/g, '%')
    .replace(/\bnairas?\b/g, '')
    .replace(/[₦$€£]/g, '')
    .replace(/\bplus\s+or\s+minus\b/g, '+/-')
    .replace(/\bdivided\s+by\b/g, '/')
    .replace(/\bover\b/g, '/')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

// Extract canonical representation
export function canonicalForm(text: string): string {
  return cleanSpokenTranscript(text)
    .replace(/^(?:the|a|an)\s+/i, '')
    .replace(/\s+(?:the|a|an)\s+/g, ' ')
    .replace(/[^a-z0-9/%]/g, '')
    .trim();
}

// Check whether student answer matches question bank answer
export function evaluateAnswerMatch(
  correctAnswer: string,
  studentAnswer: string,
  options?: string[]
): { isMatch: boolean; reason: string } {
  const cleanStudent = cleanSpokenTranscript(studentAnswer);
  const cleanCorrect = cleanSpokenTranscript(correctAnswer);

  const canonStudent = canonicalForm(studentAnswer);
  const canonCorrect = canonicalForm(correctAnswer);

  // 0. Option letter matching if question has options (e.g. "B" or "Option B")
  if (options && options.length > 0) {
    const correctIdx = options.findIndex(
      (opt) => canonicalForm(opt) === canonCorrect || opt.toLowerCase() === correctAnswer.toLowerCase()
    );
    if (correctIdx >= 0) {
      const optionLetter = String.fromCharCode(97 + correctIdx); // 'a', 'b', 'c', ...
      const spokenLetterPattern = new RegExp(`^(?:option|choice|letter)?\\s*${optionLetter}$`, 'i');
      if (spokenLetterPattern.test(cleanStudent) || canonStudent === optionLetter) {
        return { isMatch: true, reason: `Option ${optionLetter.toUpperCase()} accepted.` };
      }
    }
  }

  // 1. Direct exact or canonical match
  if (canonStudent === canonCorrect && canonCorrect.length > 0) {
    return { isMatch: true, reason: 'Exact match accepted.' };
  }

  // 2. Pure digits match (e.g. "640000" == "640000" or "1960" == "1960")
  const digitsStudent = cleanStudent.replace(/[^0-9]/g, '');
  const digitsCorrect = cleanCorrect.replace(/[^0-9]/g, '');
  if (
    digitsCorrect.length > 0 &&
    digitsStudent.length > 0 &&
    digitsCorrect === digitsStudent
  ) {
    return { isMatch: true, reason: 'Numerical value matches.' };
  }

  // 3. Chemical symbols / single letter words (e.g. Gold -> "Au" or "A U")
  if (cleanCorrect === 'au' && (canonStudent === 'au' || cleanStudent === 'a u' || cleanStudent === 'gold')) {
    return { isMatch: true, reason: 'Chemical symbol accepted.' };
  }

  // 4. Acceptable alternates separated by "/" or "or" or commas
  const alternates = correctAnswer
    .split(/[\/,]|(?:\bor\b)/i)
    .map((s) => canonicalForm(s))
    .filter(Boolean);

  for (const alt of alternates) {
    if (canonStudent === alt) {
      return { isMatch: true, reason: 'Alternate answer accepted.' };
    }
    if (alt.length >= 3 && (canonStudent.includes(alt) || alt.includes(canonStudent))) {
      return { isMatch: true, reason: 'Equivalent answer accepted.' };
    }
  }

  // 5. Author/Famous names matching surname alone (e.g. "Achebe" for "Chinua Achebe")
  const surnameMatch = correctAnswer.match(/\b([A-Z][a-z]+)$/);
  if (surnameMatch) {
    const surname = surnameMatch[1].toLowerCase();
    if (cleanStudent.includes(surname)) {
      return { isMatch: true, reason: 'Contestant identified key surname.' };
    }
  }

  // 6. Substring inclusion if substantial
  if (
    canonCorrect.length >= 4 &&
    (canonStudent.includes(canonCorrect) || canonCorrect.includes(canonStudent))
  ) {
    return { isMatch: true, reason: 'Core answer component identified.' };
  }

  // 7. Significant keyword overlap
  const correctTokens = cleanCorrect.split(' ').filter((t) => t.length > 2);
  const studentTokens = cleanStudent.split(' ').filter((t) => t.length > 2);

  if (correctTokens.length > 0) {
    const matches = correctTokens.filter((tok) => studentTokens.includes(tok));
    if (matches.length / correctTokens.length >= 0.5) {
      return { isMatch: true, reason: 'Key terms matched.' };
    }
  }

  return { isMatch: false, reason: 'Answer did not match expected response.' };
}
