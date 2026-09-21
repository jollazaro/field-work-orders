package com.jolazaro.fieldworkorders.common;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Accent-insensitive helpers for list search. Folds Unicode diacritics so
 * {@code inspeccion} matches {@code Inspección}.
 */
public final class TextSearch {

    private TextSearch() {
    }

    /** Lowercase + strip combining marks (tildes, umlauts, etc.). */
    public static String fold(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }
        String normalized = Normalizer.normalize(input.trim(), Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    /** {@code %folded%} with LIKE metacharacters escaped. */
    public static String containsPattern(String rawQuery) {
        String folded = fold(rawQuery);
        if (folded.isEmpty()) {
            return "";
        }
        return "%" + escapeLike(folded) + "%";
    }

    public static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
