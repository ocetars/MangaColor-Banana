"""
Pydantic models for API request/response schemas
"""
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


class CamelCaseModel(BaseModel):
    """Base model that converts snake_case to camelCase in JSON output"""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,  # 确保序列化时使用 camelCase
    )


class ProcessingStatus(str, Enum):
    """Processing status enumeration"""
    IDLE = "idle"
    PROCESSING = "processing"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class BatchStatus(str, Enum):
    """Batch status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class UploadResponse(CamelCaseModel):
    """Response after PDF upload"""
    success: bool
    file_id: str
    filename: str
    total_pages: int
    message: str


class StartRequest(BaseModel):
    """Request to start processing"""
    file_id: str
    step_size: int = Field(default=10, ge=1, le=50)
    prompt: str = Field(default="Colorize this manga page with vibrant, natural colors while preserving the original line art and details.")


class PromptUpdateRequest(BaseModel):
    """Request to update prompt"""
    file_id: str
    prompt: str


class BatchInfo(CamelCaseModel):
    """Information about a single batch"""
    batch_number: int
    start_page: int
    end_page: int
    status: BatchStatus
    prompt_used: Optional[str] = None
    completed_pages: List[int] = []


class ProcessingState(CamelCaseModel):
    """Current processing state"""
    file_id: str
    filename: str
    total_pages: int
    step_size: int
    current_batch: int
    total_batches: int
    status: ProcessingStatus
    current_prompt: str
    completed_pages: List[int] = []
    batches: List[BatchInfo] = []
    error_message: Optional[str] = None


class PageResult(CamelCaseModel):
    """Result of a single page colorization"""
    page_number: int
    success: bool
    output_path: Optional[str] = None
    error: Optional[str] = None


class BatchResult(CamelCaseModel):
    """Result of a batch processing"""
    batch_number: int
    success: bool
    pages: List[PageResult]
    message: str


class ControlCommand(str, Enum):
    """Control commands for processing"""
    START = "start"
    PAUSE = "pause"
    CONTINUE = "continue"
    STOP = "stop"
    RETRY_BATCH = "retry_batch"
    TRUST_AND_RUN = "trust_and_run"


class ControlRequest(BaseModel):
    """Control command request"""
    file_id: str
    command: ControlCommand


class StatusResponse(CamelCaseModel):
    """Response for status query"""
    success: bool
    state: Optional[ProcessingState] = None
    message: str


class WebSocketMessage(CamelCaseModel):
    """WebSocket message format"""
    type: str  # progress, page_complete, batch_complete, error, status
    data: dict

