import sys
import json
import traceback
import os

# Define required packages globally
required_packages = {
    'PIL': 'Pillow',
    'pytesseract': 'pytesseract',
    'fontTools': 'fonttools',
    'cv2': 'opencv-python',
    'numpy': 'numpy'
}

# Import required packages
from PIL import Image
import pytesseract
from fontTools.ttLib import TTFont
import cv2
import numpy as np
import urllib.request

def download_image(url, local_path):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response, open(local_path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        return local_path
    except Exception as e:
        raise Exception(f"Failed to download image: {str(e)}")

def compare_with_comic_sans(image_path, font_path, status_messages):
    # Verify font file exists
    if not os.path.exists(font_path):
        raise Exception(f"Font file not found at {font_path}")

    # Load the Comic Sans font
    comic_sans = TTFont(font_path)
    
    # Load and preprocess the image
    img = cv2.imread(image_path)
    if img is None:
        raise Exception(f"Failed to load image from {image_path}")
    
    # Convert BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Use PIL for better text detection
    pil_img = Image.fromarray(img)
    
    # Configure tesseract for better text detection
    custom_config = r'--oem 3 --psm 6'
    text = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT, config=custom_config)
    
    # Add debug info to status messages instead of printing
    status_messages.append({"status": "debug", "detected_text": text['text']})
    
    # Compare font characteristics
    confidence = 0
    total_chars = 0
    has_comic_sans = False
    
    for i, word in enumerate(text['text']):
        if len(word.strip()) > 0:
            confidence += text['conf'][i]
            total_chars += 1
            status_messages.append({"status": "debug", "word": word, "confidence": text['conf'][i]})
            
            # If we find "Comic" or "Sans" with high confidence, it's likely Comic Sans
            if (word.lower() == "comic" or word.lower() == "sans") and text['conf'][i] > 90:
                has_comic_sans = True
    
    if total_chars > 0:
        final_confidence = confidence / total_chars
        # Consider it Comic Sans if we found the words with high confidence
        is_comic_sans = has_comic_sans or final_confidence > 50
    else:
        final_confidence = 0
        is_comic_sans = False
    
    result = {
        "is_comic_sans": is_comic_sans,
        "confidence": final_confidence,
        "total_chars": total_chars,
        "raw_confidence": confidence,
        "detected_text": [word for word in text['text'] if word.strip()]
    }
    
    return result

def run_detection():
    status_messages = []
    def log_status(status):
        status_messages.append(status)

    try:
        # Check imports
        for module, package in required_packages.items():
            try:
                __import__(module)
                log_status({"status": "import_success", "module": module})
            except ImportError as e:
                log_status({
                    "status": "import_error",
                    "module": module,
                    "error": str(e)
                })
                return json.dumps({
                    "status": "error",
                    "messages": status_messages,
                    "is_comic_sans": False,
                    "confidence": 0
                })

        if len(sys.argv) < 3:
            log_status({"status": "error", "message": "Missing arguments. Need image_url and font_path"})
            return json.dumps({
                "status": "error",
                "messages": status_messages,
                "is_comic_sans": False,
                "confidence": 0
            })

        image_url = sys.argv[1]
        font_path = sys.argv[2]
        
        log_status({"status": "starting", "image_url": image_url, "font_path": font_path})
        
        # Create a temporary directory for downloaded images
        temp_dir = "/tmp/comic_sans_detector"
        os.makedirs(temp_dir, exist_ok=True)
        
        try:
            # Download the image
            local_image_path = os.path.join(temp_dir, "temp_image.jpg")
            download_image(url=image_url, local_path=local_image_path)
            log_status({"status": "download_complete", "path": local_image_path})
            
            # Verify the image was downloaded and exists
            if not os.path.exists(local_image_path):
                raise Exception(f"Failed to download image to {local_image_path}")
                
            # Verify the image can be opened
            img = cv2.imread(local_image_path)
            if img is None:
                raise Exception(f"Failed to load image from {local_image_path}")
            
            # Continue with the rest of the processing...
            result = compare_with_comic_sans(local_image_path, font_path, status_messages)
            log_status({"status": "analysis_complete", "result": result})
            
            return json.dumps({
                "status": "success",
                "messages": status_messages,
                "result": result
            })
            
        except Exception as e:
            log_status({
                "status": "error",
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            return json.dumps({
                "status": "error",
                "messages": status_messages,
                "is_comic_sans": False,
                "confidence": 0
            })
        finally:
            # Clean up
            if os.path.exists(local_image_path):
                os.remove(local_image_path)

    except Exception as e:
        log_status({
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        })
        return json.dumps({
            "status": "error",
            "messages": status_messages,
            "is_comic_sans": False,
            "confidence": 0
        })

if __name__ == "__main__":
    # Remove the check_imports() call since we handle it in run_detection()
    print(run_detection())  # Single JSON output