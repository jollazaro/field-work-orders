package com.jolazaro.fieldworkorders;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class FieldWorkOrdersApplication {

    public static void main(String[] args) {
        SpringApplication.run(FieldWorkOrdersApplication.class, args);
    }
}
