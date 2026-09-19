package com.jolazaro.fieldworkorders.auth;

import com.jolazaro.fieldworkorders.user.UserRole;

public record JwtPayload(String email, UserRole role) {
}
