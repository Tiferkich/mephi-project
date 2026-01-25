package com.mephi.ManagmentLocalServer.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(1)
public class SimpleCorsFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletResponse response = (HttpServletResponse) res;
        HttpServletRequest request = (HttpServletRequest) req;

        String path = request.getRequestURI();
        
        // ✅ Добавляем CORS заголовки для ВСЕХ запросов
            response.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT, PATCH");
            response.setHeader("Access-Control-Max-Age", "3600");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With, Authorization, X-Remote-Token");
            // Expose custom headers for file downloads
            response.setHeader("Access-Control-Expose-Headers", "X-Encrypted-Name, X-Encrypted-MimeType, X-Original-Size, X-Checksum, X-Data-Iv, X-Data-Salt, Content-Disposition");

        // ✅ Обрабатываем OPTIONS запросы (CORS preflight)
            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        chain.doFilter(req, res);
    }

    @Override
    public void init(FilterConfig filterConfig) {
        System.out.println("🔧 LOCAL SimpleCorsFilter initialized!");
    }

    @Override
    public void destroy() {
        System.out.println("🔧 LOCAL SimpleCorsFilter destroyed!");
    }
} 