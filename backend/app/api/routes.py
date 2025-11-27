"""
REST API Routes for MangaColor-G
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os

from app.models.schemas import (
    UploadResponse,
    StartRequest,
    PromptUpdateRequest,
    ControlRequest,
    ControlCommand,
    StatusResponse,
    ProcessingStatus
)
from app.services.pdf_service import PDFService
from app.services.state_manager import StateManager
from app.services.batch_processor import BatchProcessor

router = APIRouter()

# Service instances
pdf_service = PDFService()
state_manager = StateManager()
batch_processor = BatchProcessor(state_manager)


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file for processing"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        result = await pdf_service.upload_and_process(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start")
async def start_processing(request: StartRequest):
    """Start processing a PDF file"""
    try:
        # Initialize processing state
        state = await state_manager.initialize_state(
            file_id=request.file_id,
            step_size=request.step_size,
            prompt=request.prompt
        )
        
        # Start batch processing (non-blocking)
        await batch_processor.start_processing(request.file_id)
        
        return {
            "success": True,
            "message": f"Processing started with step size {request.step_size}",
            "state": state.model_dump(by_alias=True) if state else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pause")
async def pause_processing(request: ControlRequest):
    """Pause the current processing"""
    if request.command != ControlCommand.PAUSE:
        raise HTTPException(status_code=400, detail="Invalid command")
    
    try:
        await batch_processor.pause_processing(request.file_id)
        state = await state_manager.get_state(request.file_id)
        return {
            "success": True,
            "message": "Processing paused",
            "state": state.model_dump(by_alias=True) if state else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/continue")
async def continue_processing(request: ControlRequest):
    """Continue processing from pause"""
    if request.command != ControlCommand.CONTINUE:
        raise HTTPException(status_code=400, detail="Invalid command")
    
    try:
        await batch_processor.continue_processing(request.file_id)
        state = await state_manager.get_state(request.file_id)
        return {
            "success": True,
            "message": "Processing continued",
            "state": state.model_dump(by_alias=True) if state else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_processing(request: ControlRequest):
    """Stop the current processing"""
    if request.command != ControlCommand.STOP:
        raise HTTPException(status_code=400, detail="Invalid command")
    
    try:
        await batch_processor.stop_processing(request.file_id)
        state = await state_manager.get_state(request.file_id)
        return {
            "success": True,
            "message": "Processing stopped",
            "state": state.model_dump(by_alias=True) if state else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retry-batch")
async def retry_batch(request: ControlRequest):
    """Retry the current batch"""
    if request.command != ControlCommand.RETRY_BATCH:
        raise HTTPException(status_code=400, detail="Invalid command")
    
    try:
        await batch_processor.retry_current_batch(request.file_id)
        state = await state_manager.get_state(request.file_id)
        return {
            "success": True,
            "message": "Retrying current batch",
            "state": state.model_dump(by_alias=True) if state else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trust-and-run")
async def trust_and_run(request: ControlRequest):
    """Continue processing without further pauses"""
    if request.command != ControlCommand.TRUST_AND_RUN:
        raise HTTPException(status_code=400, detail="Invalid command")
    
    try:
        await batch_processor.trust_and_run(request.file_id)
        state = await state_manager.get_state(request.file_id)
        return {
            "success": True,
            "message": "Processing will continue without pauses",
            "state": state.model_dump(by_alias=True) if state else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{file_id}", response_model=StatusResponse)
async def get_status(file_id: str):
    """Get current processing status"""
    try:
        state = await state_manager.get_state(file_id)
        if state is None:
            return StatusResponse(
                success=False,
                state=None,
                message="No processing state found for this file"
            )
        return StatusResponse(
            success=True,
            state=state,
            message="Status retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/prompt")
async def update_prompt(request: PromptUpdateRequest):
    """Update the prompt for subsequent batches"""
    try:
        await state_manager.update_prompt(request.file_id, request.prompt)
        state = await state_manager.get_state(request.file_id)
        return {
            "success": True,
            "message": "Prompt updated successfully",
            "state": state.model_dump(by_alias=True) if state else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/image/{file_id}/{page_number}")
async def get_colorized_image(file_id: str, page_number: int):
    """Get a colorized image by page number"""
    output_path = f"outputs/{file_id}/page_{page_number:04d}.png"
    
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(output_path, media_type="image/png")


@router.get("/original/{file_id}/{page_number}")
async def get_original_image(file_id: str, page_number: int):
    """Get an original (uncolored) image by page number"""
    original_path = f"uploads/{file_id}/page_{page_number:04d}.png"
    
    if not os.path.exists(original_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(original_path, media_type="image/png")


@router.get("/files")
async def list_files():
    """List all uploaded files with their status"""
    try:
        files = await state_manager.list_all_states()
        return {
            "success": True,
            "files": files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/file/{file_id}")
async def delete_file(file_id: str):
    """Delete a file and its processing data"""
    try:
        await state_manager.delete_state(file_id)
        await pdf_service.delete_file(file_id)
        return {
            "success": True,
            "message": f"File {file_id} deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

