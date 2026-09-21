package com.jolazaro.fieldworkorders.config;

import org.hibernate.boot.model.FunctionContributions;
import org.hibernate.boot.model.FunctionContributor;
import org.hibernate.type.StandardBasicTypes;

/**
 * Registers {@code fold_accents(expr)} for JPQL/Criteria: {@code lower} plus
 * Spanish/Latin diacritic stripping. Works on PostgreSQL and H2 without extensions.
 */
public class AccentFoldFunctionContributor implements FunctionContributor {

    private static final String[][] PAIRS = {
        {"á", "a"}, {"à", "a"}, {"ä", "a"}, {"â", "a"}, {"ã", "a"},
        {"é", "e"}, {"è", "e"}, {"ë", "e"}, {"ê", "e"},
        {"í", "i"}, {"ì", "i"}, {"ï", "i"}, {"î", "i"},
        {"ó", "o"}, {"ò", "o"}, {"ö", "o"}, {"ô", "o"}, {"õ", "o"},
        {"ú", "u"}, {"ù", "u"}, {"ü", "u"}, {"û", "u"},
        {"ñ", "n"}, {"ç", "c"}
    };

    @Override
    public void contributeFunctions(FunctionContributions contributions) {
        String sql = "lower(?1)";
        for (String[] pair : PAIRS) {
            sql = "replace(" + sql + ",'" + pair[0] + "','" + pair[1] + "')";
        }
        contributions.getFunctionRegistry().registerPattern(
                "fold_accents",
                sql,
                contributions.getTypeConfiguration()
                        .getBasicTypeRegistry()
                        .resolve(StandardBasicTypes.STRING));
    }
}
