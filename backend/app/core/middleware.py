import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import structlog
import redis.asyncio as redis
from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()

        response = await call_next(request)

        process_time = time.time() - start_time
        logger.info(
            "request_completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            process_time=f"{process_time:.4f}s",
        )
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        return response


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Public routes that don't need tenant
        public_paths = ["/api/v1/auth", "/api/v1/widget", "/docs", "/openapi.json", "/health"]
        if any(request.url.path.startswith(p) for p in public_paths):
            return await call_next(request)

        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            request.state.tenant_id = tenant_id
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str = None, requests_per_minute: int = 60):
        super().__init__(app)
        self.redis_url = redis_url or settings.REDIS_URL
        self.rpm = requests_per_minute
        self._redis = None
        self._redis_unavailable = False  # cache failed state

    async def _get_redis(self):
        if self._redis_unavailable:
            return None
        if self._redis is None:
            try:
                self._redis = redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1,   # fail fast — 1 second max
                    socket_timeout=1,
                )
                # Test the connection immediately
                await self._redis.ping()
            except Exception:
                self._redis = None
                self._redis_unavailable = True  # stop retrying for this process lifetime
                logger.warning("redis_unavailable", msg="Rate limiting disabled — Redis not reachable")
                return None
        return self._redis

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        r = await self._get_redis()
        if r:
            try:
                key = f"rate_limit:{client_ip}:{int(time.time() // 60)}"
                current = await r.incr(key)
                if current == 1:
                    await r.expire(key, 60)
                if current > self.rpm:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded. Try again later."},
                    )
            except Exception:
                pass

        return await call_next(request)
