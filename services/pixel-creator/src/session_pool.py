"""
Async pool of pre-warmed Selenium sessions.

Maintains up to `pool_size` warm sessions. Sessions are recycled after
`max_age_sec` to avoid stale browser state. After a session is consumed,
a new one is warmed in the background.
"""

import asyncio
import logging
import time
from collections import deque

from .config import settings
from .pixel_creator import WarmSession, warm_session

logger = logging.getLogger(__name__)


class SessionPool:
    def __init__(
        self,
        pool_size: int = settings.pool_size,
        max_age_sec: int = settings.session_max_age_sec,
    ):
        self.pool_size = pool_size
        self.max_age_sec = max_age_sec
        self._sessions: deque[WarmSession] = deque()
        self._warming = False
        self._lock = asyncio.Lock()
        self._available = asyncio.Event()

    @property
    def warm_count(self) -> int:
        return len(self._sessions)

    @property
    def is_warming(self) -> bool:
        return self._warming

    async def start(self):
        """Fill the pool on startup."""
        for _ in range(self.pool_size):
            await self._warm_one()
        if self._sessions:
            self._available.set()

    async def _warm_one(self):
        """Warm a single session in a thread (Selenium is blocking)."""
        self._warming = True
        try:
            session = await asyncio.get_event_loop().run_in_executor(
                None, warm_session
            )
            async with self._lock:
                self._sessions.append(session)
                self._available.set()
            logger.info(f"Session warmed. Pool size: {len(self._sessions)}")
        except Exception as e:
            logger.error(f"Failed to warm session: {e}")
            # Retry after delay
            asyncio.get_event_loop().call_later(
                30, lambda: asyncio.ensure_future(self._warm_one())
            )
        finally:
            self._warming = False

    async def acquire(self, timeout: float = 60.0) -> WarmSession:
        """
        Get a warm session from the pool. Blocks up to `timeout` seconds
        if none are available.
        """
        deadline = time.time() + timeout
        while True:
            async with self._lock:
                # Evict stale sessions
                while self._sessions:
                    s = self._sessions[0]
                    if time.time() - s.created_at > self.max_age_sec:
                        self._sessions.popleft()
                        logger.info("Evicted stale session")
                        s.close()
                    else:
                        break

                if self._sessions:
                    session = self._sessions.popleft()
                    if not self._sessions:
                        self._available.clear()
                    # Replenish in background
                    asyncio.ensure_future(self._warm_one())
                    return session

            # No session available — wait
            remaining = deadline - time.time()
            if remaining <= 0:
                raise TimeoutError("No warm session available within timeout")

            # If not already warming, start one
            if not self._warming:
                asyncio.ensure_future(self._warm_one())

            try:
                await asyncio.wait_for(self._available.wait(), timeout=remaining)
            except asyncio.TimeoutError:
                raise TimeoutError("No warm session available within timeout")

    async def shutdown(self):
        """Close all sessions."""
        async with self._lock:
            while self._sessions:
                self._sessions.popleft().close()
            self._available.clear()
