package by.sakhdanil.managmentserver.config;

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

        System.out.println("🔥 REMOTE CORS Filter working: " + request.getMethod() + " " + request.getRequestURI());
        
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT, PATCH");
        response.setHeader("Access-Control-Max-Age", "3600");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With, remember-me, Authorization");

        System.out.println("🔥 REMOTE CORS Headers added to response");

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            System.out.println("🔥 REMOTE OPTIONS request - returning 200");
            response.setStatus(HttpServletResponse.SC_OK);
        } else {
            System.out.println("🔥 REMOTE Non-OPTIONS request - continuing chain");
            chain.doFilter(req, res);
        }
    }

    @Override
    public void init(FilterConfig filterConfig) {
        System.out.println("🔥 REMOTE CORS Filter initialized!");
    }

    @Override
    public void destroy() {
        System.out.println("🔥 REMOTE CORS Filter destroyed!");
    }
} 