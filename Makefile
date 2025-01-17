# Variables
PYTHON3_CMD := python3
VENV_DIR := venv
TESSERACT_PKG := tesseract
NODE_MODULES := node_modules
TWITTER_CLIENT_PATH := node_modules/@ai16z/client-twitter/dist/index.js
CUSTOM_TWITTER_CLIENT := src/patches/index.js

# Detectar el sistema operativo
UNAME := $(shell uname)

# Default target
.PHONY: all
all: welcome check-files check-deps install-deps setup-python setup-node patch-twitter env-notice success

# Mensaje de bienvenida
.PHONY: welcome
welcome:
	@echo "🚀 Starting Comic Sans Bot setup..."
	@echo "This will:"
	@echo "  1. Check and install system dependencies"
	@echo "  2. Set up Python environment and packages"
	@echo "  3. Install Node dependencies"
	@echo "  4. Apply necessary patches"
	@echo "----------------------------------------"

# Verificar archivos necesarios
.PHONY: check-files
check-files:
	@echo "🔍 Checking required files..."
	@test -f $(CUSTOM_TWITTER_CLIENT) || (echo "❌ Missing $(CUSTOM_TWITTER_CLIENT). Please ensure the patch file exists." && exit 1)
	@test -f package.json || (echo "❌ Missing package.json. Are you in the right directory?" && exit 1)
	@echo "✅ Required files found"

# Verificar dependencias del sistema
.PHONY: check-deps
check-deps:
	@echo "🔍 Checking system dependencies..."
	@which $(PYTHON3_CMD) >/dev/null 2>&1 || (echo "❌ Python 3 not found. Please install Python 3" && exit 1)
	@echo "✅ Python 3 found"
ifeq ($(UNAME), Darwin)
	@which brew >/dev/null 2>&1 || (echo "❌ Homebrew not found. Please install Homebrew" && exit 1)
endif

# Instalar dependencias del sistema
.PHONY: install-deps
install-deps:
	@echo "📦 Installing system dependencies..."
ifeq ($(UNAME), Darwin)
	@brew list $(TESSERACT_PKG) >/dev/null 2>&1 || brew install $(TESSERACT_PKG)
else
	@which tesseract >/dev/null 2>&1 || sudo apt-get install -y $(TESSERACT_PKG)
endif
	@echo "✅ Tesseract installed"

# Configurar Python y sus dependencias
.PHONY: setup-python
setup-python:
	@echo "🐍 Setting up Python environment..."
	@test -d $(VENV_DIR) || $(PYTHON3_CMD) -m venv $(VENV_DIR)
ifeq ($(UNAME), Darwin)
	@. $(VENV_DIR)/bin/activate && pip install Pillow pytesseract fonttools opencv-python numpy
else
	@. $(VENV_DIR)/bin/activate && pip install Pillow pytesseract fonttools opencv-python numpy
endif
	@echo "✅ Python environment ready"

# Configurar Node y sus dependencias
.PHONY: setup-node
setup-node:
	@echo "📦 Installing Node dependencies..."
	@pnpm install
	@echo "✅ Node dependencies installed"

# Parchear el archivo de Twitter
.PHONY: patch-twitter
patch-twitter:
	@echo "🔧 Patching Twitter client..."
	@cp $(CUSTOM_TWITTER_CLIENT) $(TWITTER_CLIENT_PATH)
	@echo "✅ Twitter client patched"

# Aviso sobre variables de entorno
.PHONY: env-notice
env-notice:
	@echo "\n📝 Important Environment Variables Setup:"
	@echo "----------------------------------------"
	@echo "1. Twitter Configuration:"
	@echo "   - TWITTER_COOKIES: Required. Get from browser (auth_token and ct0)"
	@echo "   - TWITTER_USERNAME: Your bot's username"
	@echo "   - TWITTER_PASSWORD: Set as 'mock_password'"
	@echo "   - TWITTER_EMAIL: Set as 'mock@example.com'"
	@echo ""
	@echo "2. OpenRouter Configuration:"
	@echo "   You can either:"
	@echo "   a) Leave these blank to use defaults:"
	@echo "      - OPENROUTER_MODEL"
	@echo "      - SMALL_OPENROUTER_MODEL"
	@echo "      - MEDIUM_OPENROUTER_MODEL"
	@echo "      - LARGE_OPENROUTER_MODEL"
	@echo "   b) Or specify custom models for different tasks"
	@echo "   Default models:"
	@echo "   - Small tasks: hermes 70b"
	@echo "   - Medium/Large tasks: 405b"
	@echo ""
	@echo "3. How to get Twitter cookies:"
	@echo "   1. Log into Twitter in your browser"
	@echo "   2. Open DevTools (F12) > Application > Cookies"
	@echo "   3. Find and copy 'auth_token' and 'ct0' values"
	@echo "   4. Format in .env as:"
	@echo "      TWITTER_COOKIES=[{\"key\":\"auth_token\",\"value\":\"YOUR_AUTH_TOKEN\"},{\"key\":\"ct0\",\"value\":\"YOUR_CT0\"}]"
	@echo "----------------------------------------"

# Mensaje de éxito
.PHONY: success
success:
	@echo "----------------------------------------"
	@echo "✨ Setup completed successfully!"
	@echo "Remember to:"
	@echo "  1. Configure your environment variables (check above)"
	@echo "  2. Check the Python virtual environment is activated"
	@echo "  3. Ensure Tesseract is working properly"
	@echo "----------------------------------------"

# Limpiar todo
.PHONY: clean
clean:
	@echo "🧹 Cleaning up..."
	@rm -rf $(VENV_DIR)
	@rm -rf $(NODE_MODULES)
	@echo "✅ Cleanup complete"

# Mostrar ayuda
.PHONY: help
help:
	@echo "Comic Sans Bot - Setup Commands:"
	@echo "  make all          - Run complete setup"
	@echo "  make check-deps   - Check system dependencies"
	@echo "  make install-deps - Install system dependencies"
	@echo "  make setup-python - Set up Python environment"
	@echo "  make setup-node   - Set up Node environment"
	@echo "  make patch-twitter- Patch Twitter client"
	@echo "  make clean        - Clean up everything"