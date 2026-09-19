package com.jolazaro.fieldworkorders.user;

public record TechnicianResponse(Long id, String email) {

    static TechnicianResponse from(AppUser user) {
        return new TechnicianResponse(user.getId(), user.getEmail());
    }
}
