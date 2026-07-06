"""WebSocket hub for live classroom raids."""
import json
import logging
from typing import Dict, List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ClassroomConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_code: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms.setdefault(room_code, []).append(websocket)

    def disconnect(self, room_code: str, websocket: WebSocket):
        conns = self.rooms.get(room_code, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.rooms.pop(room_code, None)

    async def broadcast(self, room_code: str, message: dict):
        dead = []
        for ws in self.rooms.get(room_code, []):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(room_code, ws)


classroom_manager = ClassroomConnectionManager()
