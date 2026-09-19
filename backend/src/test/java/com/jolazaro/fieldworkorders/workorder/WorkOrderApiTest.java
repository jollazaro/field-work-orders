package com.jolazaro.fieldworkorders.workorder;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;
import com.jolazaro.fieldworkorders.user.AppUser;
import com.jolazaro.fieldworkorders.user.UserRepository;
import com.jolazaro.fieldworkorders.user.UserRole;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkOrderApiTest {

    private static final Set<String> DEMO_EMAILS = Set.of("supervisor@demo.com", "tecnico@demo.com");

    private static final byte[] TINY_PNG = new byte[] {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, (byte) 0x90, 0x77, 0x53,
            (byte) 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, (byte) 0xD7, 0x63, (byte) 0xF8,
            (byte) 0xCF, (byte) 0xC0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, (byte) 0xFE, (byte) 0xD4,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60, (byte) 0x82
    };

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void resetData() {
        workOrderRepository.deleteAll();
        userRepository.findAll().stream()
                .filter(user -> !DEMO_EMAILS.contains(user.getEmail().toLowerCase()))
                .forEach(userRepository::delete);
    }

    @Test
    void supervisorCreatesPendingOrderWithHistory() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        long technicianId = technicianId();

        MvcResult created = mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Alta de prueba","site":"Sitio 1","instruction":"Hacer el trabajo","priority":"HIGH","assignedTechnicianId":%d}
                                """.formatted(technicianId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.assignedTechnicianEmail").value("tecnico@demo.com"))
                .andReturn();

        long id = readId(created);
        mockMvc.perform(get("/api/work-orders/" + id).header("Authorization", bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusHistory[0].fromStatus").value(nullValue()))
                .andExpect(jsonPath("$.statusHistory[0].toStatus").value("PENDING"))
                .andExpect(jsonPath("$.statusHistory[0].changedByEmail").value("supervisor@demo.com"));
    }

    @Test
    void technicianClaimsFreeOrderAndCannotStartUnassigned() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        String technicianToken = login("tecnico@demo.com");

        long freeId = readId(mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Libre","site":"Sitio","instruction":"Tomar","priority":"NORMAL"}
                                """))
                .andExpect(status().isCreated())
                .andReturn());

        mockMvc.perform(post("/api/work-orders/" + freeId + "/status")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"IN_PROGRESS"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Assign a technician first"));

        mockMvc.perform(post("/api/work-orders/" + freeId + "/assignment")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.assignedTechnicianEmail").value("tecnico@demo.com"));
    }

    @Test
    void technicianAttachesEvidenceAndCompletes() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        String technicianToken = login("tecnico@demo.com");
        long id = createAssignedPending(supervisorToken);

        mockMvc.perform(post("/api/work-orders/" + id + "/status")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"IN_PROGRESS"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mockMvc.perform(multipart("/api/work-orders/" + id + "/photo")
                        .file(new MockMultipartFile("file", "site.png", "image/png", TINY_PNG))
                        .header("Authorization", bearer(technicianToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photoUrl").value("/api/work-orders/" + id + "/photo"));

        mockMvc.perform(get("/api/work-orders/" + id + "/photo")
                        .header("Authorization", bearer(technicianToken)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(TINY_PNG));

        mockMvc.perform(post("/api/work-orders/" + id + "/location")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"lat":-31.42,"lng":-64.18}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lat").value(-31.42))
                .andExpect(jsonPath("$.lng").value(-64.18));

        mockMvc.perform(post("/api/work-orders/" + id + "/status")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"DONE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));

        mockMvc.perform(get("/api/work-orders/" + id).header("Authorization", bearer(technicianToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusHistory.length()").value(3))
                .andExpect(jsonPath("$.photoUrl").isNotEmpty());

        mockMvc.perform(post("/api/work-orders/" + id + "/status")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"PENDING"}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void supervisorAdvancesAndReopensWithAudit() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        String technicianToken = login("tecnico@demo.com");
        long id = createAssignedPending(supervisorToken);

        mockMvc.perform(post("/api/work-orders/" + id + "/status")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"IN_PROGRESS"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/work-orders/" + id + "/location")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"lat":-31.4,"lng":-64.2}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/work-orders/" + id + "/status")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"DONE"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/work-orders/" + id + "/status")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"PENDING"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.assignedTechnicianEmail").value("tecnico@demo.com"))
                .andExpect(jsonPath("$.lat").value(-31.4));

        mockMvc.perform(get("/api/work-orders/" + id).header("Authorization", bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusHistory[1].fromStatus").value("PENDING"))
                .andExpect(jsonPath("$.statusHistory[1].toStatus").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.statusHistory[1].changedByEmail").value("supervisor@demo.com"))
                .andExpect(jsonPath("$.statusHistory[3].fromStatus").value("DONE"))
                .andExpect(jsonPath("$.statusHistory[3].toStatus").value("PENDING"))
                .andExpect(jsonPath("$.statusHistory[3].changedByEmail").value("supervisor@demo.com"));
    }

    @Test
    void technicianVisibilityIsForbiddenWhenAssignedToSomeoneElse() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        String technicianToken = login("tecnico@demo.com");
        AppUser other = userRepository.save(
                new AppUser(
                        "other-" + UUID.randomUUID() + "@demo.com",
                        passwordEncoder.encode("demo"),
                        UserRole.TECHNICIAN));

        long otherOrderId = readId(mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Ajena","site":"Sitio","instruction":"No ver","priority":"NORMAL","assignedTechnicianId":%d}
                                """.formatted(other.getId())))
                .andExpect(status().isCreated())
                .andReturn());

        mockMvc.perform(get("/api/work-orders/" + otherOrderId).header("Authorization", bearer(technicianToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not allowed to view this work order"));

        mockMvc.perform(get("/api/work-orders/999999").header("Authorization", bearer(technicianToken)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/work-orders").header("Authorization", bearer(technicianToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id==" + otherOrderId + ")]").isEmpty());
    }

    @Test
    void photoAndLocationRejectedWhenNotInProgress() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        String technicianToken = login("tecnico@demo.com");
        long id = createAssignedPending(supervisorToken);

        mockMvc.perform(multipart("/api/work-orders/" + id + "/photo")
                        .file(new MockMultipartFile("file", "site.png", "image/png", TINY_PNG))
                        .header("Authorization", bearer(technicianToken)))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/work-orders/" + id + "/location")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"lat":-31.42,"lng":-64.18}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void supervisorCannotStartUnassignedOrder() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        long id = readId(mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Sin tecnico","site":"Sitio","instruction":"Asignar primero","priority":"HIGH"}
                                """))
                .andExpect(status().isCreated())
                .andReturn());

        mockMvc.perform(post("/api/work-orders/" + id + "/status")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"IN_PROGRESS"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Assign a technician first"));
    }

    @Test
    void technicianCannotCreateOrListTechnicians() throws Exception {
        String technicianToken = login("tecnico@demo.com");

        mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"X","site":"Y","instruction":"Z","priority":"NORMAL"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/technicians").header("Authorization", bearer(technicianToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createRejectsTitleLongerThanColumn() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","site":"Sitio","instruction":"Hacer","priority":"NORMAL"}
                                """.formatted("x".repeat(201))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadRejectsSpoofedImageContentType() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        String technicianToken = login("tecnico@demo.com");
        long id = createAssignedPending(supervisorToken);

        mockMvc.perform(post("/api/work-orders/" + id + "/status")
                        .header("Authorization", bearer(technicianToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"IN_PROGRESS"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(multipart("/api/work-orders/" + id + "/photo")
                        .file(new MockMultipartFile("file", "site.png", "image/png", "not-an-image".getBytes()))
                        .header("Authorization", bearer(technicianToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("File must be an image"));
    }

    @Test
    void supervisorListsTechnicians() throws Exception {
        String supervisorToken = login("supervisor@demo.com");
        mockMvc.perform(get("/api/technicians").header("Authorization", bearer(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='tecnico@demo.com')]").exists());
    }

    private long createAssignedPending(String supervisorToken) throws Exception {
        return readId(mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", bearer(supervisorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Asignada","site":"Sitio","instruction":"Hacer","priority":"NORMAL","assignedTechnicianId":%d}
                                """.formatted(technicianId())))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private long technicianId() {
        return userRepository.findByEmailIgnoreCase("tecnico@demo.com").orElseThrow().getId();
    }

    private String login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"demo"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static long readId(MvcResult result) throws Exception {
        Number id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        return id.longValue();
    }
}
