"""
PDF Processing Service
Handles PDF upload, parsing, and image extraction
"""
import os
import uuid
import shutil
from typing import Optional
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image
from fastapi import UploadFile
import aiofiles

from app.models.schemas import UploadResponse


class PDFService:
    """Service for handling PDF file operations"""
    
    def __init__(self, upload_dir: str = "uploads", output_dir: str = "outputs"):
        self.upload_dir = Path(upload_dir)
        self.output_dir = Path(output_dir)
        
        # Ensure directories exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    async def upload_and_process(self, file: UploadFile) -> UploadResponse:
        """
        Upload a PDF file and extract all pages as images
        
        Args:
            file: The uploaded PDF file
            
        Returns:
            UploadResponse with file info
        """
        # Generate unique file ID
        file_id = str(uuid.uuid4())[:8]
        
        # Create directories for this file
        file_upload_dir = self.upload_dir / file_id
        file_output_dir = self.output_dir / file_id
        file_upload_dir.mkdir(parents=True, exist_ok=True)
        file_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save the uploaded PDF
        pdf_path = file_upload_dir / "original.pdf"
        async with aiofiles.open(pdf_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Extract pages as images
        total_pages = await self._extract_pages(pdf_path, file_upload_dir)
        
        return UploadResponse(
            success=True,
            file_id=file_id,
            filename=file.filename or "unknown.pdf",
            total_pages=total_pages,
            message=f"Successfully uploaded and extracted {total_pages} pages"
        )
    
    async def _extract_pages(self, pdf_path: Path, output_dir: Path, dpi: int = 150) -> int:
        """
        Extract all pages from PDF as PNG images
        
        Args:
            pdf_path: Path to the PDF file
            output_dir: Directory to save extracted images
            dpi: Resolution for image extraction
            
        Returns:
            Total number of pages extracted
        """
        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        
        # Calculate zoom factor for desired DPI
        zoom = dpi / 72  # 72 is the default PDF DPI
        matrix = fitz.Matrix(zoom, zoom)
        
        for page_num in range(total_pages):
            page = doc[page_num]
            
            # Render page to image
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            
            # Save as PNG
            image_path = output_dir / f"page_{page_num + 1:04d}.png"
            pix.save(str(image_path))
        
        doc.close()
        return total_pages
    
    def get_page_image_path(self, file_id: str, page_number: int) -> Optional[Path]:
        """
        Get the path to an original page image
        
        Args:
            file_id: The file identifier
            page_number: The page number (1-indexed)
            
        Returns:
            Path to the image or None if not found
        """
        image_path = self.upload_dir / file_id / f"page_{page_number:04d}.png"
        return image_path if image_path.exists() else None
    
    def get_colorized_image_path(self, file_id: str, page_number: int) -> Optional[Path]:
        """
        Get the path to a colorized page image
        
        Args:
            file_id: The file identifier
            page_number: The page number (1-indexed)
            
        Returns:
            Path to the image or None if not found
        """
        image_path = self.output_dir / file_id / f"page_{page_number:04d}.png"
        return image_path if image_path.exists() else None
    
    def save_colorized_image(self, file_id: str, page_number: int, image: Image.Image) -> Path:
        """
        Save a colorized image
        
        Args:
            file_id: The file identifier
            page_number: The page number (1-indexed)
            image: The PIL Image to save
            
        Returns:
            Path to the saved image
        """
        output_dir = self.output_dir / file_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        image_path = output_dir / f"page_{page_number:04d}.png"
        image.save(str(image_path), "PNG")
        
        return image_path
    
    def get_total_pages(self, file_id: str) -> int:
        """
        Get the total number of pages for a file
        
        Args:
            file_id: The file identifier
            
        Returns:
            Total number of pages
        """
        upload_dir = self.upload_dir / file_id
        if not upload_dir.exists():
            return 0
        
        # Count PNG files in the directory
        return len(list(upload_dir.glob("page_*.png")))
    
    async def delete_file(self, file_id: str) -> bool:
        """
        Delete all files associated with a file ID
        
        Args:
            file_id: The file identifier
            
        Returns:
            True if deletion was successful
        """
        upload_dir = self.upload_dir / file_id
        output_dir = self.output_dir / file_id
        
        try:
            if upload_dir.exists():
                shutil.rmtree(upload_dir)
            if output_dir.exists():
                shutil.rmtree(output_dir)
            return True
        except Exception as e:
            print(f"Error deleting file {file_id}: {e}")
            return False
    
    def delete_batch_images(self, file_id: str, start_page: int, end_page: int) -> bool:
        """
        Delete colorized images for a specific batch (for retry functionality)
        
        Args:
            file_id: The file identifier
            start_page: First page of the batch (1-indexed)
            end_page: Last page of the batch (1-indexed)
            
        Returns:
            True if deletion was successful
        """
        output_dir = self.output_dir / file_id
        
        try:
            for page_num in range(start_page, end_page + 1):
                image_path = output_dir / f"page_{page_num:04d}.png"
                if image_path.exists():
                    image_path.unlink()
            return True
        except Exception as e:
            print(f"Error deleting batch images: {e}")
            return False
    
    def file_exists(self, file_id: str) -> bool:
        """Check if a file exists"""
        return (self.upload_dir / file_id).exists()
    
    def get_original_pdf_path(self, file_id: str) -> Optional[Path]:
        """Get the path to the original PDF"""
        pdf_path = self.upload_dir / file_id / "original.pdf"
        return pdf_path if pdf_path.exists() else None

