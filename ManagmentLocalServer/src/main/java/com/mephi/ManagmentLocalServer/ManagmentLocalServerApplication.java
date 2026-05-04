package com.mephi.ManagmentLocalServer;

import com.mephi.ManagmentLocalServer.config.DeviceSecurityProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableConfigurationProperties(DeviceSecurityProperties.class)
@EnableJpaRepositories(basePackages = "com.mephi.ManagmentLocalServer.repository")
@EnableTransactionManagement
@EnableAsync
@EnableScheduling
public class ManagmentLocalServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(ManagmentLocalServerApplication.class, args);
	}

}
