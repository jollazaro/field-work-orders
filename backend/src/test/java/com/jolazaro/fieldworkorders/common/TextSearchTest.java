package com.jolazaro.fieldworkorders.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextSearchTest {

    @Test
    void foldStripsSpanishDiacritics() {
        assertThat(TextSearch.fold(" Inspección ")).isEqualTo("inspeccion");
        assertThat(TextSearch.fold("ÑANDÚ")).isEqualTo("nandu");
        assertThat(TextSearch.fold("Medición")).isEqualTo("medicion");
    }

    @Test
    void containsPatternEscapesLikeMetacharacters() {
        assertThat(TextSearch.containsPattern("a%b_c")).isEqualTo("%a\\%b\\_c%");
    }
}
