"""
State Management Service
Handles processing state persistence and recovery
"""
import os
import json
from typing import Optional, List, Dict, Any
from pathlib import Path
from datetime import datetime

from app.models.schemas import (
    ProcessingState,
    ProcessingStatus,
    BatchInfo,
    BatchStatus
)
from app.services.pdf_service import PDFService


class StateManager:
    """Service for managing processing state and persistence"""
    
    def __init__(self, state_dir: str = "states"):
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory state cache
        self._states: Dict[str, ProcessingState] = {}
        
        # PDF service for file info
        self.pdf_service = PDFService()
    
    def _get_state_file_path(self, file_id: str) -> Path:
        """Get the path to a state file"""
        return self.state_dir / f"{file_id}.json"
    
    async def initialize_state(
        self,
        file_id: str,
        step_size: int,
        prompt: str
    ) -> ProcessingState:
        """
        Initialize a new processing state
        
        Args:
            file_id: The file identifier
            step_size: Number of pages per batch
            prompt: Initial prompt for colorization
            
        Returns:
            The initialized ProcessingState
        """
        # Get file info
        total_pages = self.pdf_service.get_total_pages(file_id)
        if total_pages == 0:
            raise ValueError(f"File {file_id} not found or has no pages")
        
        # Calculate batches
        total_batches = (total_pages + step_size - 1) // step_size
        batches = []
        
        for i in range(total_batches):
            start_page = i * step_size + 1
            end_page = min((i + 1) * step_size, total_pages)
            
            batches.append(BatchInfo(
                batch_number=i + 1,
                start_page=start_page,
                end_page=end_page,
                status=BatchStatus.PENDING,
                prompt_used=None,
                completed_pages=[]
            ))
        
        # Get filename from PDF service
        pdf_path = self.pdf_service.get_original_pdf_path(file_id)
        filename = pdf_path.name if pdf_path else "unknown.pdf"
        
        state = ProcessingState(
            file_id=file_id,
            filename=filename,
            total_pages=total_pages,
            step_size=step_size,
            current_batch=1,
            total_batches=total_batches,
            status=ProcessingStatus.IDLE,
            current_prompt=prompt,
            completed_pages=[],
            batches=batches,
            error_message=None
        )
        
        # Save to cache and disk
        self._states[file_id] = state
        await self._save_state(file_id)
        
        return state
    
    async def get_state(self, file_id: str) -> Optional[ProcessingState]:
        """
        Get the current processing state
        
        Args:
            file_id: The file identifier
            
        Returns:
            The ProcessingState or None if not found
        """
        # Check cache first
        if file_id in self._states:
            return self._states[file_id]
        
        # Try to load from disk
        state = await self._load_state(file_id)
        if state:
            self._states[file_id] = state
        
        return state
    
    async def update_state(
        self,
        file_id: str,
        **kwargs
    ) -> Optional[ProcessingState]:
        """
        Update the processing state
        
        Args:
            file_id: The file identifier
            **kwargs: Fields to update
            
        Returns:
            The updated ProcessingState
        """
        state = await self.get_state(file_id)
        if not state:
            return None
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(state, key):
                setattr(state, key, value)
        
        # Save to cache and disk
        self._states[file_id] = state
        await self._save_state(file_id)
        
        return state
    
    async def update_status(
        self,
        file_id: str,
        status: ProcessingStatus,
        error_message: Optional[str] = None
    ) -> Optional[ProcessingState]:
        """Update the processing status"""
        return await self.update_state(
            file_id,
            status=status,
            error_message=error_message
        )
    
    async def update_prompt(self, file_id: str, prompt: str) -> Optional[ProcessingState]:
        """Update the current prompt"""
        return await self.update_state(file_id, current_prompt=prompt)
    
    async def mark_page_complete(
        self,
        file_id: str,
        page_number: int
    ) -> Optional[ProcessingState]:
        """
        Mark a page as completed
        
        Args:
            file_id: The file identifier
            page_number: The completed page number
            
        Returns:
            The updated ProcessingState
        """
        state = await self.get_state(file_id)
        if not state:
            return None
        
        # Add to completed pages if not already there
        if page_number not in state.completed_pages:
            state.completed_pages.append(page_number)
            state.completed_pages.sort()
        
        # Update batch info
        for batch in state.batches:
            if batch.start_page <= page_number <= batch.end_page:
                if page_number not in batch.completed_pages:
                    batch.completed_pages.append(page_number)
                    batch.completed_pages.sort()
                break
        
        # Save
        self._states[file_id] = state
        await self._save_state(file_id)
        
        return state
    
    async def update_batch_status(
        self,
        file_id: str,
        batch_number: int,
        status: BatchStatus,
        prompt_used: Optional[str] = None
    ) -> Optional[ProcessingState]:
        """
        Update a batch's status
        
        Args:
            file_id: The file identifier
            batch_number: The batch number to update
            status: New batch status
            prompt_used: The prompt used for this batch
            
        Returns:
            The updated ProcessingState
        """
        state = await self.get_state(file_id)
        if not state:
            return None
        
        for batch in state.batches:
            if batch.batch_number == batch_number:
                batch.status = status
                if prompt_used:
                    batch.prompt_used = prompt_used
                break
        
        # Save
        self._states[file_id] = state
        await self._save_state(file_id)
        
        return state
    
    async def advance_batch(self, file_id: str) -> Optional[ProcessingState]:
        """
        Advance to the next batch
        
        Args:
            file_id: The file identifier
            
        Returns:
            The updated ProcessingState
        """
        state = await self.get_state(file_id)
        if not state:
            return None
        
        if state.current_batch < state.total_batches:
            state.current_batch += 1
        
        # Save
        self._states[file_id] = state
        await self._save_state(file_id)
        
        return state
    
    async def reset_batch(
        self,
        file_id: str,
        batch_number: int
    ) -> Optional[ProcessingState]:
        """
        Reset a batch for retry
        
        Args:
            file_id: The file identifier
            batch_number: The batch to reset
            
        Returns:
            The updated ProcessingState
        """
        state = await self.get_state(file_id)
        if not state:
            return None
        
        for batch in state.batches:
            if batch.batch_number == batch_number:
                # Remove completed pages from this batch
                for page in batch.completed_pages:
                    if page in state.completed_pages:
                        state.completed_pages.remove(page)
                
                # Reset batch
                batch.status = BatchStatus.PENDING
                batch.completed_pages = []
                batch.prompt_used = None
                break
        
        # Save
        self._states[file_id] = state
        await self._save_state(file_id)
        
        return state
    
    async def delete_state(self, file_id: str) -> bool:
        """
        Delete a processing state
        
        Args:
            file_id: The file identifier
            
        Returns:
            True if deletion was successful
        """
        # Remove from cache
        if file_id in self._states:
            del self._states[file_id]
        
        # Remove from disk
        state_file = self._get_state_file_path(file_id)
        try:
            if state_file.exists():
                state_file.unlink()
            return True
        except Exception as e:
            print(f"Error deleting state for {file_id}: {e}")
            return False
    
    async def list_all_states(self) -> List[Dict[str, Any]]:
        """
        List all processing states
        
        Returns:
            List of state summaries (with camelCase keys for frontend compatibility)
        """
        states = []
        
        for state_file in self.state_dir.glob("*.json"):
            file_id = state_file.stem
            state = await self.get_state(file_id)
            
            if state:
                states.append({
                    "fileId": state.file_id,
                    "filename": state.filename,
                    "totalPages": state.total_pages,
                    "status": state.status,
                    "completedPages": len(state.completed_pages),
                    "createdAt": state_file.stat().st_ctime,
                    "updatedAt": state_file.stat().st_mtime
                })
        
        return states
    
    async def _save_state(self, file_id: str) -> bool:
        """Save state to disk"""
        state = self._states.get(file_id)
        if not state:
            return False
        
        state_file = self._get_state_file_path(file_id)
        
        try:
            # Convert to dict for JSON serialization
            state_dict = state.model_dump()
            
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(state_dict, f, indent=2, ensure_ascii=False)
            
            return True
        except Exception as e:
            print(f"Error saving state for {file_id}: {e}")
            return False
    
    async def _load_state(self, file_id: str) -> Optional[ProcessingState]:
        """Load state from disk"""
        state_file = self._get_state_file_path(file_id)
        
        if not state_file.exists():
            return None
        
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                state_dict = json.load(f)
            
            return ProcessingState(**state_dict)
        except Exception as e:
            print(f"Error loading state for {file_id}: {e}")
            return None

