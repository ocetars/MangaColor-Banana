#!/usr/bin/env python3
"""
Build script for packaging the Python backend with PyInstaller
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path

def clean_build():
    """Clean previous build artifacts"""
    dirs_to_clean = ['build', 'dist', '__pycache__']
    for dir_name in dirs_to_clean:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)
            print(f"Cleaned {dir_name}/")
    
    # Clean .spec file
    for spec_file in Path('.').glob('*.spec'):
        spec_file.unlink()
        print(f"Cleaned {spec_file}")

def build_executable():
    """Build the executable using PyInstaller"""
    
    # PyInstaller command
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--name=mangacolor-backend',
        '--onedir',  # Create a directory with all dependencies
        '--noconfirm',
        '--clean',
        '--add-data=.env.example:.',  # Include example env file
        '--hidden-import=uvicorn.logging',
        '--hidden-import=uvicorn.loops',
        '--hidden-import=uvicorn.loops.auto',
        '--hidden-import=uvicorn.protocols',
        '--hidden-import=uvicorn.protocols.http',
        '--hidden-import=uvicorn.protocols.http.auto',
        '--hidden-import=uvicorn.protocols.websockets',
        '--hidden-import=uvicorn.protocols.websockets.auto',
        '--hidden-import=uvicorn.lifespan',
        '--hidden-import=uvicorn.lifespan.on',
        '--hidden-import=google.generativeai',
        '--hidden-import=PIL',
        '--hidden-import=cv2',
        '--hidden-import=fitz',
        '--collect-all=google.generativeai',
        '--collect-all=PIL',
        '--collect-all=fitz',
        'main.py'
    ]
    
    print("Building executable...")
    print(f"Command: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    
    if result.returncode != 0:
        print("Build failed!")
        sys.exit(1)
    
    print("Build completed successfully!")
    print(f"Output: dist/mangacolor-backend/")

def main():
    """Main build process"""
    print("=" * 50)
    print("MangaColor-G Backend Build Script")
    print("=" * 50)
    
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Check if PyInstaller is installed
    try:
        import PyInstaller
    except ImportError:
        print("PyInstaller not found. Installing...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])
    
    # Clean previous builds
    if '--no-clean' not in sys.argv:
        clean_build()
    
    # Build
    build_executable()
    
    print("\n" + "=" * 50)
    print("Build complete!")
    print("The packaged backend is in: dist/mangacolor-backend/")
    print("=" * 50)

if __name__ == '__main__':
    main()

