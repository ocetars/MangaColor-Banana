"""
Gemini API Service
Handles image colorization using Google's Gemini API
"""
import os
import io
import base64
from typing import Optional, Tuple, List
from pathlib import Path

from PIL import Image
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class GeminiService:
    """Service for interacting with Google's Gemini API for image colorization"""
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        # 官方文档推荐的最新图像模型
        self.model_name = "gemini-3-pro-image-preview"
        self._configured = False
        self.client: Optional[genai.Client] = None
        
        if self.api_key:
            self._configure()
    
    def _configure(self):
        """Configure the Gemini API client"""
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        
        self.client = genai.Client(api_key=self.api_key)
        self._configured = True
    
    def is_configured(self) -> bool:
        """Check if the service is properly configured"""
        return self._configured and self.client is not None
    
    async def colorize_image(
        self,
        image_path: Path,
        prompt: str,
        max_retries: int = 3
    ) -> Tuple[bool, Optional[Image.Image], Optional[str]]:
        """
        Colorize a manga page using Gemini API
        
        Args:
            image_path: Path to the input image
            prompt: The colorization prompt
            max_retries: Maximum number of retry attempts
            
        Returns:
            Tuple of (success, colorized_image, error_message)
        """
        if not self.is_configured():
            return False, None, "Gemini API is not configured. Please set GOOGLE_API_KEY."
        
        # Load image bytes for inline upload
        try:
            with open(image_path, "rb") as f:
                image_bytes = f.read()
        except Exception as e:
            return False, None, f"Failed to load image: {str(e)}"
        
        # Prepare the full prompt
        full_prompt = f"""You are an expert manga colorist. Your task is to colorize this black and white manga page.

Instructions:
{prompt}

Important guidelines:
- Preserve all original line art and details
- Use appropriate colors for skin tones, clothing, and backgrounds
- Maintain consistency with typical manga/anime color palettes
- Keep the artistic style intact while adding vibrant colors
- Pay attention to lighting and shadows in the original artwork

Please colorize this manga page following the instructions above."""

        # Attempt colorization with retries
        last_error = None
        for attempt in range(max_retries):
            try:
                result = await self._call_gemini_api(image_bytes, full_prompt, image_path.suffix or ".png")
                if result:
                    return True, result, None
            except Exception as e:
                last_error = str(e)
                print(f"Colorization attempt {attempt + 1} failed: {last_error}")
                
                # Wait before retry (exponential backoff)
                if attempt < max_retries - 1:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
        
        return False, None, f"Colorization failed after {max_retries} attempts: {last_error}"
    
    async def _call_gemini_api(
        self,
        image_bytes: bytes,
        prompt: str,
        file_suffix: str
    ) -> Optional[Image.Image]:
        """
        Make the actual API call to Gemini
        
        Args:
            image: Input PIL Image
            prompt: The full prompt
            
        Returns:
            Colorized PIL Image or None
        """
        if not self.client:
            raise RuntimeError("Gemini client not configured")
        
        mime_type = "image/png" if file_suffix.lower() != ".jpg" else "image/jpeg"
        
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part(text=prompt),
                        types.Part(
                            inline_data=types.Blob(
                                mime_type=mime_type,
                                data=image_bytes
                            )
                        )
                    ]
                )
            ],
        )
        
        image_data = self._extract_image_bytes(response)
        if not image_data:
            return None
        
        return Image.open(io.BytesIO(image_data))
    
    def _extract_image_bytes(self, response) -> Optional[bytes]:
        """Extract image bytes from a Gemini response"""
        if not response:
            return None
        
        candidates = getattr(response, "candidates", []) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            if not content or not getattr(content, "parts", None):
                continue
            
            for part in content.parts:
                inline_data = getattr(part, "inline_data", None)
                if inline_data and getattr(inline_data, "data", None):
                    data = inline_data.data
                    if isinstance(data, str):
                        return base64.b64decode(data)
                    return data
        
        # Fallback for generated_images attribute
        generated_images: Optional[List] = getattr(response, "generated_images", None)
        if generated_images:
            data = generated_images[0].data
            if isinstance(data, str):
                return base64.b64decode(data)
            return data
        
        return None
    
    async def test_connection(self) -> Tuple[bool, str]:
        """
        Test the API connection
        
        Returns:
            Tuple of (success, message)
        """
        if not self.is_configured():
            return False, "API key not configured"
        
        try:
            # List available models as a connection test
            models = genai.list_models()
            model_names = [m.name for m in models]
            
            if any(self.model_name in name for name in model_names):
                return True, f"Connected successfully. Model {self.model_name} is available."
            else:
                return True, f"Connected, but {self.model_name} may not be available. Available models: {model_names[:5]}"
        except Exception as e:
            return False, f"Connection failed: {str(e)}"


# Singleton instance
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Get the singleton Gemini service instance"""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service

