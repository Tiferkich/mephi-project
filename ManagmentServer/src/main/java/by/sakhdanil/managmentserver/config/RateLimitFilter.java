package by.sakhdanil.managmentserver.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP-based rate limiting filter using Bucket4j token-bucket algorithm.
 *
 * Limits:
 *  - /auth/** endpoints: 20 requests per minute per IP (brute-force protection)
 *  - all other endpoints: 200 requests per minute per IP
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int AUTH_LIMIT     = 20;
    private static final int DEFAULT_LIMIT  = 200;
    private static final Duration REFILL_DURATION = Duration.ofMinutes(1);

    private final ConcurrentHashMap<String, Bucket> authBuckets    = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> defaultBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = resolveClientIp(request);
        boolean isAuthPath = request.getRequestURI().contains("/auth/");

        Bucket bucket = isAuthPath
                ? authBuckets.computeIfAbsent(ip, k -> buildBucket(AUTH_LIMIT))
                : defaultBuckets.computeIfAbsent(ip, k -> buildBucket(DEFAULT_LIMIT));

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Try again later.\"}"
            );
        }
    }

    private Bucket buildBucket(int requestsPerMinute) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(requestsPerMinute)
                .refillGreedy(requestsPerMinute, REFILL_DURATION)
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
