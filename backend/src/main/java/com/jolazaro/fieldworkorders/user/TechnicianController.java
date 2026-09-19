package com.jolazaro.fieldworkorders.user;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.jolazaro.fieldworkorders.security.CurrentUserService;

@RestController
@RequestMapping("/api/technicians")
public class TechnicianController {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public TechnicianController(UserRepository userRepository, CurrentUserService currentUserService) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<TechnicianResponse> list() {
        AppUser actor = currentUserService.requireUser();
        if (actor.getRole() != UserRole.SUPERVISOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only supervisors can list technicians");
        }
        return userRepository.findByRoleOrderByEmailAsc(UserRole.TECHNICIAN).stream()
                .map(TechnicianResponse::from)
                .toList();
    }
}
