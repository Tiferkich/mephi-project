package com.mephi.ManagmentLocalServer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.mephi.ManagmentLocalServer.repository")
@EnableTransactionManagement
@EnableAsync
public class ManagmentLocalServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(ManagmentLocalServerApplication.class, args);
	}

}
