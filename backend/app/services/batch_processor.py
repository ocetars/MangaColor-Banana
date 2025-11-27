"""
Batch Processing Service
Handles the step-wise processing workflow with pause/continue functionality
"""
import asyncio
from typing import Optional, Dict, Set
from pathlib import Path

from app.models.schemas import ProcessingStatus, BatchStatus
from app.services.state_manager import StateManager
from app.services.pdf_service import PDFService
from app.services.gemini_service import get_gemini_service
from app.api.websocket import (
    send_progress_update,
    send_page_complete,
    send_batch_complete,
    send_status_update,
    send_error
)


class BatchProcessor:
    """Service for managing batch processing of manga colorization"""
    
    def __init__(self, state_manager: StateManager):
        self.state_manager = state_manager
        self.pdf_service = PDFService()
        self.gemini_service = get_gemini_service()
        
        # Active processing tasks
        self._tasks: Dict[str, asyncio.Task] = {}
        
        # Pause signals
        self._pause_signals: Set[str] = set()
        
        # Stop signals
        self._stop_signals: Set[str] = set()
        
        # Auto-run flags (skip pauses)
        self._auto_run: Set[str] = set()
    
    async def start_processing(self, file_id: str) -> bool:
        """
        Start processing a file
        
        Args:
            file_id: The file identifier
            
        Returns:
            True if processing started successfully
        """
        # Check if already processing
        if file_id in self._tasks and not self._tasks[file_id].done():
            return False
        
        # Clear any previous signals
        self._pause_signals.discard(file_id)
        self._stop_signals.discard(file_id)
        self._auto_run.discard(file_id)
        
        # Update status
        await self.state_manager.update_status(file_id, ProcessingStatus.PROCESSING)
        await send_status_update(file_id, "processing", "Processing started")
        
        # Create and start the processing task
        task = asyncio.create_task(self._process_file(file_id))
        self._tasks[file_id] = task
        
        return True
    
    async def pause_processing(self, file_id: str) -> bool:
        """
        Pause processing at the next checkpoint
        
        Args:
            file_id: The file identifier
            
        Returns:
            True if pause signal was sent
        """
        if file_id not in self._tasks:
            return False
        
        self._pause_signals.add(file_id)
        return True
    
    async def continue_processing(self, file_id: str) -> bool:
        """
        Continue processing from pause
        
        Args:
            file_id: The file identifier
            
        Returns:
            True if processing continued
        """
        state = await self.state_manager.get_state(file_id)
        if not state or state.status != ProcessingStatus.PAUSED:
            return False
        
        # Clear pause signal and restart
        self._pause_signals.discard(file_id)
        
        # Update status and restart processing
        await self.state_manager.update_status(file_id, ProcessingStatus.PROCESSING)
        await send_status_update(file_id, "processing", "Processing continued")
        
        # Create new task to continue
        task = asyncio.create_task(self._process_file(file_id))
        self._tasks[file_id] = task
        
        return True
    
    async def stop_processing(self, file_id: str) -> bool:
        """
        Stop processing completely
        
        Args:
            file_id: The file identifier
            
        Returns:
            True if stop signal was sent
        """
        self._stop_signals.add(file_id)
        self._pause_signals.discard(file_id)
        
        # Cancel the task if running
        if file_id in self._tasks and not self._tasks[file_id].done():
            self._tasks[file_id].cancel()
        
        await self.state_manager.update_status(file_id, ProcessingStatus.IDLE)
        await send_status_update(file_id, "idle", "Processing stopped")
        
        return True
    
    async def retry_current_batch(self, file_id: str) -> bool:
        """
        Retry the current batch
        
        Args:
            file_id: The file identifier
            
        Returns:
            True if retry was initiated
        """
        state = await self.state_manager.get_state(file_id)
        if not state or state.status != ProcessingStatus.PAUSED:
            return False
        
        current_batch = state.current_batch
        
        # Find the batch info
        batch_info = None
        for batch in state.batches:
            if batch.batch_number == current_batch:
                batch_info = batch
                break
        
        if not batch_info:
            return False
        
        # Delete colorized images for this batch
        self.pdf_service.delete_batch_images(
            file_id,
            batch_info.start_page,
            batch_info.end_page
        )
        
        # Reset batch state
        await self.state_manager.reset_batch(file_id, current_batch)
        
        # Continue processing
        return await self.continue_processing(file_id)
    
    async def trust_and_run(self, file_id: str) -> bool:
        """
        Continue processing without further pauses
        
        Args:
            file_id: The file identifier
            
        Returns:
            True if auto-run was enabled
        """
        self._auto_run.add(file_id)
        return await self.continue_processing(file_id)
    
    async def _process_file(self, file_id: str):
        """
        Main processing loop for a file
        
        Args:
            file_id: The file identifier
        """
        try:
            state = await self.state_manager.get_state(file_id)
            if not state:
                return
            
            # Process batches starting from current
            for batch_num in range(state.current_batch, state.total_batches + 1):
                # Check for stop signal
                if file_id in self._stop_signals:
                    self._stop_signals.discard(file_id)
                    return
                
                # Get batch info
                batch_info = None
                for batch in state.batches:
                    if batch.batch_number == batch_num:
                        batch_info = batch
                        break
                
                if not batch_info or batch_info.status == BatchStatus.COMPLETED:
                    continue
                
                # Update batch status
                await self.state_manager.update_batch_status(
                    file_id,
                    batch_num,
                    BatchStatus.PROCESSING,
                    state.current_prompt
                )
                
                # Process each page in the batch
                success = await self._process_batch(
                    file_id,
                    batch_info.start_page,
                    batch_info.end_page,
                    state.current_prompt,
                    batch_num
                )
                
                if not success:
                    # Check if stopped
                    if file_id in self._stop_signals:
                        self._stop_signals.discard(file_id)
                        return
                    
                    # Mark batch as failed
                    await self.state_manager.update_batch_status(
                        file_id,
                        batch_num,
                        BatchStatus.FAILED
                    )
                    await send_error(file_id, f"Batch {batch_num} processing failed")
                    continue
                
                # Mark batch as completed
                await self.state_manager.update_batch_status(
                    file_id,
                    batch_num,
                    BatchStatus.COMPLETED
                )
                
                # Send batch complete notification
                await send_batch_complete(
                    file_id,
                    batch_num,
                    batch_info.start_page,
                    batch_info.end_page
                )
                
                # Check if this is the last batch
                if batch_num >= state.total_batches:
                    await self.state_manager.update_status(
                        file_id,
                        ProcessingStatus.COMPLETED
                    )
                    await send_status_update(file_id, "completed", "All pages processed")
                    return
                
                # Advance to next batch
                await self.state_manager.advance_batch(file_id)
                
                # Check for pause (unless auto-run is enabled)
                if file_id not in self._auto_run:
                    # Pause at checkpoint
                    await self.state_manager.update_status(
                        file_id,
                        ProcessingStatus.PAUSED
                    )
                    await send_status_update(
                        file_id,
                        "paused",
                        f"Batch {batch_num} completed. Please review and continue."
                    )
                    return
                
                # Refresh state for next iteration
                state = await self.state_manager.get_state(file_id)
                if not state:
                    return
            
            # All batches completed
            await self.state_manager.update_status(file_id, ProcessingStatus.COMPLETED)
            await send_status_update(file_id, "completed", "All pages processed")
            
        except asyncio.CancelledError:
            # Task was cancelled
            pass
        except Exception as e:
            # Handle unexpected errors
            await self.state_manager.update_status(
                file_id,
                ProcessingStatus.ERROR,
                str(e)
            )
            await send_error(file_id, str(e))
    
    async def _process_batch(
        self,
        file_id: str,
        start_page: int,
        end_page: int,
        prompt: str,
        batch_number: int
    ) -> bool:
        """
        Process a single batch of pages
        
        Args:
            file_id: The file identifier
            start_page: First page number (1-indexed)
            end_page: Last page number (1-indexed)
            prompt: The colorization prompt
            batch_number: Current batch number
            
        Returns:
            True if batch was processed successfully
        """
        state = await self.state_manager.get_state(file_id)
        if not state:
            return False
        
        total_pages = state.total_pages
        
        for page_num in range(start_page, end_page + 1):
            # Check for stop signal
            if file_id in self._stop_signals:
                return False
            
            # Skip if already completed
            if page_num in state.completed_pages:
                continue
            
            # Get the original image path
            image_path = self.pdf_service.get_page_image_path(file_id, page_num)
            if not image_path:
                await send_error(file_id, f"Page {page_num} image not found", page_num)
                continue
            
            # Send progress update
            await send_progress_update(file_id, page_num, total_pages, batch_number)
            
            # Colorize the image
            success, colorized_image, error = await self.gemini_service.colorize_image(
                image_path,
                prompt
            )
            
            if not success or colorized_image is None:
                await send_error(file_id, error or "Colorization failed", page_num)
                # Continue with next page instead of failing entire batch
                continue
            
            # Save the colorized image
            output_path = self.pdf_service.save_colorized_image(
                file_id,
                page_num,
                colorized_image
            )
            
            # Mark page as complete
            await self.state_manager.mark_page_complete(file_id, page_num)
            
            # Send page complete notification
            await send_page_complete(file_id, page_num, str(output_path))
            
            # Refresh state
            state = await self.state_manager.get_state(file_id)
            if not state:
                return False
        
        return True

