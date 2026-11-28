type PhraseReplacement = string | ((...args: string[]) => string);
export type PhraseRule = readonly [RegExp, PhraseReplacement];
