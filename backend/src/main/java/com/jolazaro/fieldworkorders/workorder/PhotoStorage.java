package com.jolazaro.fieldworkorders.workorder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PhotoStorage {

    // Bytes live on disk, not in Postgres. A failed DB commit can leave an orphan file.
    private final Path uploadDir;

    public PhotoStorage(@Value("${app.uploads.dir}") String uploadDir) {
        this.uploadDir = Path.of(uploadDir);
    }

    public void store(Long workOrderId, byte[] bytes) {
        try {
            Files.createDirectories(uploadDir);
            Files.write(pathFor(workOrderId), bytes);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store photo");
        }
    }

    public byte[] load(Long workOrderId) {
        Path path = pathFor(workOrderId);
        if (!Files.exists(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }
        try {
            return Files.readAllBytes(path);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not read photo");
        }
    }

    private Path pathFor(Long workOrderId) {
        return uploadDir.resolve(workOrderId + ".bin");
    }
}
