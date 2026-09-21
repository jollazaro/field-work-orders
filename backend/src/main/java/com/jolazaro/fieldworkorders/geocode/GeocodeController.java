package com.jolazaro.fieldworkorders.geocode;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jolazaro.fieldworkorders.security.CurrentUserService;

@RestController
@RequestMapping("/api/geocode")
public class GeocodeController {

    private final GeocodeService geocodeService;
    private final CurrentUserService currentUserService;

    public GeocodeController(GeocodeService geocodeService, CurrentUserService currentUserService) {
        this.geocodeService = geocodeService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public GeocodeResult lookup(@RequestParam String q) {
        currentUserService.requireUser();
        return geocodeService.lookup(q);
    }
}
