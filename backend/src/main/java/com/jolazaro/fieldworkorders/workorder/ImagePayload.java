package com.jolazaro.fieldworkorders.workorder;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class ImagePayload {

    private ImagePayload() {
    }

    static String detectContentType(String declaredContentType, byte[] bytes) {
        if (bytes == null || bytes.length < 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be an image");
        }
        if (declaredContentType != null && declaredContentType.toLowerCase().contains("svg")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be an image");
        }
        if (isPng(bytes)) {
            return "image/png";
        }
        if (isJpeg(bytes)) {
            return "image/jpeg";
        }
        if (isGif(bytes)) {
            return "image/gif";
        }
        if (isWebp(bytes)) {
            return "image/webp";
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be an image");
    }

    private static boolean isPng(byte[] bytes) {
        return bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
    }

    private static boolean isJpeg(byte[] bytes) {
        return bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF;
    }

    private static boolean isGif(byte[] bytes) {
        return bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == '8';
    }

    private static boolean isWebp(byte[] bytes) {
        return bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
    }
}
