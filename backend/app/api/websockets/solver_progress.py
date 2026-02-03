"""WebSocket endpoint for real-time solver progress updates."""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict


class SolverProgressManager:
    """Manages WebSocket connections for solver progress updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept a WebSocket connection."""
        await websocket.accept()
        self.active_connections[job_id] = websocket

    def disconnect(self, job_id: str):
        """Remove a WebSocket connection."""
        if job_id in self.active_connections:
            del self.active_connections[job_id]

    async def send_progress(self, job_id: str, data: dict):
        """Send progress update to a specific job."""
        if job_id in self.active_connections:
            websocket = self.active_connections[job_id]
            try:
                await websocket.send_json({
                    "type": "progress",
                    "job_id": job_id,
                    "data": data,
                })
            except Exception:
                self.disconnect(job_id)

    async def send_completion(self, job_id: str, result: dict):
        """Send completion message to a specific job."""
        if job_id in self.active_connections:
            websocket = self.active_connections[job_id]
            try:
                await websocket.send_json({
                    "type": "complete",
                    "job_id": job_id,
                    "result": result,
                })
            except Exception:
                pass
            finally:
                self.disconnect(job_id)

    async def send_error(self, job_id: str, error: str):
        """Send error message to a specific job."""
        if job_id in self.active_connections:
            websocket = self.active_connections[job_id]
            try:
                await websocket.send_json({
                    "type": "error",
                    "job_id": job_id,
                    "error": error,
                })
            except Exception:
                pass
            finally:
                self.disconnect(job_id)


# Global manager instance
progress_manager = SolverProgressManager()


async def solver_websocket_endpoint(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for solver progress."""
    await progress_manager.connect(websocket, job_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "cancel":
                # Handle cancellation request
                await websocket.send_json({
                    "type": "cancelled",
                    "job_id": job_id,
                })
                break
    except WebSocketDisconnect:
        progress_manager.disconnect(job_id)
