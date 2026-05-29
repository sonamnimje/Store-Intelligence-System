from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()

    async def start(self) -> None:
        return None

    async def stop(self) -> None:
        for connection in list(self.connections):
            await connection.close()
        self.connections.clear()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        for connection in list(self.connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


websocket_manager = WebSocketManager()