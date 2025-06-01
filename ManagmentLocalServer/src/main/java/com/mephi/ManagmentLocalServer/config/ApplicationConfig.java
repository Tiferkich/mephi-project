package com.mephi.ManagmentLocalServer.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan(basePackages = {
    "com.mephi.ManagmentLocalServer.service",
    "com.mephi.ManagmentLocalServer.repository", 
    "com.mephi.ManagmentLocalServer.controller",
    "com.mephi.ManagmentLocalServer.config"
})
public class ApplicationConfig {
    // Базовая конфигурация для сканирования компонентов
} 