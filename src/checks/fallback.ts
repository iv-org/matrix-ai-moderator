const INJECTION_PATTERNS = [
    /ignore (all|any) (previous|above) (instructions|prompts)/i,
    /(disregard|forget) (everything|all) (before|above)/i,
    /system prompt/i,
    /<\/?system>/i,
];

export function fallbackUnsafeText(text: string): boolean {
    const normalized = text.toLowerCase();
    if (!normalized.trim()) return false;

    return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
