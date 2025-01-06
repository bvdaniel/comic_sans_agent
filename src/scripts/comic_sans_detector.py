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

    # Load the Comic Sans font for characteristics comparison
    comic_sans = TTFont(font_path)
    comic_sans_metrics = {
        'ascent': comic_sans['OS/2'].sTypoAscender,
        'descent': comic_sans['OS/2'].sTypoDescender,
        'x_height': comic_sans['OS/2'].sxHeight,
        'cap_height': comic_sans['OS/2'].sCapHeight if hasattr(comic_sans['OS/2'], 'sCapHeight') else 0
    }
    
    # Load and preprocess the image
    img = cv2.imread(image_path)
    if img is None:
        raise Exception(f"Failed to load image from {image_path}")
    
    # Convert BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Use PIL for text detection
    pil_img = Image.fromarray(img)
    
    # Get text and font metrics from image
    custom_config = r'--oem 3 --psm 6'
    text_data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT, config=custom_config)
    
    # Add debug info
    status_messages.append({"status": "debug", "detected_text": text_data['text']})
    
    # Analyze font characteristics
    is_comic_sans = False
    confidence = 0
    total_analyzed = 0
    
    for i, word in enumerate(text_data['text']):
        if len(word.strip()) > 0:
            # Get bounding box metrics
            x, y, w, h = (
                text_data['left'][i],
                text_data['top'][i],
                text_data['width'][i],
                text_data['height'][i]
            )
            
            if w == 0 or h == 0:
                continue
                
            # Calculate aspect ratio and other metrics
            aspect_ratio = w / h
            font_size = text_data['height'][i]
            
            # Comic Sans characteristics
            is_rounded = check_for_rounded_edges(img[y:y+h, x:x+w])
            has_irregular_baseline = check_baseline_variation(text_data, i)
            
            # Weight characteristics based on importance
            char_match_score = 0
            if 0.4 <= aspect_ratio <= 0.7:  # Comic Sans typical ratio
                char_match_score += 0.3
            if is_rounded:
                char_match_score += 0.4
            if has_irregular_baseline:
                char_match_score += 0.3
                
            confidence += char_match_score * 100
            total_analyzed += 1
            
            status_messages.append({
                "status": "debug",
                "word": word,
                "metrics": {
                    "aspect_ratio": aspect_ratio,
                    "is_rounded": is_rounded,
                    "irregular_baseline": has_irregular_baseline,
                    "score": char_match_score
                }
            })
    
    if total_analyzed > 0:
        final_confidence = confidence / total_analyzed
        is_comic_sans = final_confidence > 60  # Require higher confidence
    else:
        final_confidence = 0
        is_comic_sans = False
    
    return {
        "is_comic_sans": is_comic_sans,
        "confidence": final_confidence,
        "total_analyzed": total_analyzed,
        "detected_text": [word for word in text_data['text'] if word.strip()]
    }

def check_for_rounded_edges(char_img):
    # Add edge detection to look for rounded corners
    edges = cv2.Canny(char_img, 100, 200)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return False
        
    # Analyze contour curvature
    rounded_corners = 0
    for contour in contours:
        if len(contour) > 5:
            # Fit an ellipse to check roundness
            try:
                _, _, angle = cv2.fitEllipse(contour)
                if 70 <= angle <= 110:  # Check for rounded angles
                    rounded_corners += 1
            except:
                continue
                
    return rounded_corners > 0

def check_baseline_variation(text_data, index):
    # Comic Sans has slight baseline variations
    if index == 0 or index >= len(text_data['text']) - 1:
        return False
        
    current_y = text_data['top'][index]
    next_y = text_data['top'][index + 1]
    
    return abs(current_y - next_y) > 2  # Small baseline variation threshold

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