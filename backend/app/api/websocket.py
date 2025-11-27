"""
WebSocket endpoint for real-time updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        # Map of file_id to set of connected WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Global connections (receive all updates)
        self.global_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, file_id: str = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if file_id:
            if file_id not in self.active_connections:
                self.active_connections[file_id] = set()
            self.active_connections[file_id].add(websocket)
        else:
            self.global_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket, file_id: str = None):
        """Remove a WebSocket connection"""
        if file_id and file_id in self.active_connections:
            self.active_connections[file_id].discard(websocket)
            if not self.active_connections[file_id]:
                del self.active_connections[file_id]
        else:
            self.global_connections.discard(websocket)
    
    async def send_to_file(self, file_id: str, message: dict):
        """Send message to all connections watching a specific file"""
        connections = self.active_connections.get(file_id, set()).copy()
        connections.update(self.global_connections)
        
        disconnected = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn, file_id)
    
    async def broadcast(self, message: dict):
        """Send message to all connections"""
        all_connections = self.global_connections.copy()
        for connections in self.active_connections.values():
            all_connections.update(connections)
        
        disconnected = []
        for connection in all_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


# Global connection manager instance
manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager instance"""
    return manager


@router.websocket("/updates")
async def websocket_global_updates(websocket: WebSocket):
    """WebSocket endpoint for global updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle ping/pong for keepalive
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@router.websocket("/updates/{file_id}")
async def websocket_file_updates(websocket: WebSocket, file_id: str):
    """WebSocket endpoint for file-specific updates"""
    await manager.connect(websocket, file_id)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle ping/pong for keepalive
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, file_id)
    except Exception:
        manager.disconnect(websocket, file_id)


# Helper functions for sending specific message types
# 注意：使用 camelCase 以匹配前端期望的字段名
async def send_progress_update(file_id: str, current_page: int, total_pages: int, batch_number: int):
    """Send progress update to clients"""
    await manager.send_to_file(file_id, {
        "type": "progress",
        "data": {
            "fileId": file_id,
            "currentPage": current_page,
            "totalPages": total_pages,
            "batchNumber": batch_number,
            "percentage": round((current_page / total_pages) * 100, 1)
        }
    })


async def send_page_complete(file_id: str, page_number: int, output_path: str):
    """Send page completion notification"""
    await manager.send_to_file(file_id, {
        "type": "page_complete",
        "data": {
            "fileId": file_id,
            "pageNumber": page_number,
            "outputPath": output_path
        }
    })


async def send_batch_complete(file_id: str, batch_number: int, start_page: int, end_page: int):
    """Send batch completion notification"""
    await manager.send_to_file(file_id, {
        "type": "batch_complete",
        "data": {
            "fileId": file_id,
            "batchNumber": batch_number,
            "startPage": start_page,
            "endPage": end_page
        }
    })


async def send_status_update(file_id: str, status: str, message: str = ""):
    """Send status update to clients"""
    await manager.send_to_file(file_id, {
        "type": "status",
        "data": {
            "fileId": file_id,
            "status": status,
            "message": message
        }
    })


async def send_error(file_id: str, error_message: str, page_number: int = None):
    """Send error notification"""
    await manager.send_to_file(file_id, {
        "type": "error",
        "data": {
            "fileId": file_id,
            "error": error_message,
            "pageNumber": page_number
        }
    })

