package com.jolazaro.fieldworkorders.geocode;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/**
 * Free forward-geocoding via OpenStreetMap Nominatim (usage policy: identify app, low rate).
 * Scoped to Argentina ({@code countrycodes=ar}). Retries a cleaned query when OSM
 * street names omit route numbers (e.g. {@code avenida 125 eva peron} → {@code avenida eva peron}).
 */
@Service
public class GeocodeService {

    private static final String NOMINATIM =
            "https://nominatim.openstreetmap.org/search"
                    + "?format=json&limit=1&countrycodes=ar&q=";

    /** "Avenida 125 - Eva Perón" style: drop the route number OSM often omits. */
    private static final Pattern ROUTE_NUMBER =
            Pattern.compile("(?i)\\b(av\\.?|avenida)\\s+\\d+\\s*[-–]?\\s*");

    private final RestClient restClient = RestClient.create();

    public GeocodeResult lookup(String query) {
        String q = query == null ? "" : query.trim();
        if (q.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query is required");
        }
        if (q.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query too long");
        }

        for (String candidate : candidates(q)) {
            GeocodeResult hit = searchNominatim(candidate);
            if (hit != null) {
                return hit;
            }
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found");
    }

    private static Set<String> candidates(String q) {
        Set<String> out = new LinkedHashSet<>();
        out.add(q);
        String cleaned = ROUTE_NUMBER.matcher(q).replaceAll("$1 ").replaceAll("\\s{2,}", " ").trim();
        if (!cleaned.equalsIgnoreCase(q)) {
            out.add(cleaned);
        }
        return out;
    }

    private GeocodeResult searchNominatim(String q) {
        URI uri = URI.create(NOMINATIM + URLEncoder.encode(q, StandardCharsets.UTF_8));
        RequestEntity<Void> request = RequestEntity.get(uri)
                .accept(MediaType.APPLICATION_JSON)
                .header("User-Agent", "field-work-orders-demo/1.0 (portfolio; contact: demo@local)")
                .build();

        ResponseEntity<List<Map<String, Object>>> response = restClient
                .method(request.getMethod())
                .uri(request.getUrl())
                .headers(h -> h.addAll(request.getHeaders()))
                .retrieve()
                .toEntity(new ParameterizedTypeReference<>() {});

        List<Map<String, Object>> body = response.getBody();
        if (body == null || body.isEmpty()) {
            return null;
        }

        Map<String, Object> hit = body.getFirst();
        double lat = Double.parseDouble(String.valueOf(hit.get("lat")));
        double lng = Double.parseDouble(String.valueOf(hit.get("lon")));
        String displayName = String.valueOf(hit.getOrDefault("display_name", q));
        return new GeocodeResult(lat, lng, displayName);
    }
}
