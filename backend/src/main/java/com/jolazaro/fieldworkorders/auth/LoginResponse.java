package com.jolazaro.fieldworkorders.auth;

import com.jolazaro.fieldworkorders.user.UserRole;

public record LoginResponse(String token, String email, UserRole role) {
}
