#!/bin/bash

# DBx Setup Script
# This script helps you set up DBx quickly

set -e

echo "╔═══════════════════════════════════════╗"
echo "║   DBx Setup - Database Intelligence  ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js >= 18.0.0 from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be >= 18.0.0"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) found"

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✓ npm $(npm -v) found"

# Check Ollama
echo ""
echo "Checking Ollama..."
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama is not installed"
    echo ""
    echo "To install Ollama:"
    echo "  macOS/Linux: curl -fsSL https://ollama.ai/install.sh | sh"
    echo "  Windows: Download from https://ollama.ai/download"
    echo ""
    read -p "Continue without Ollama? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ Ollama found"
    
    # Check if Ollama is running
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✓ Ollama is running"
        
        # Check for models
        MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "")
        if [ -z "$MODELS" ]; then
            echo "⚠️  No models installed"
            echo ""
            echo "Recommended models:"
            echo "  ollama pull llama3.2    (Fast, accurate)"
            echo "  ollama pull mistral     (Alternative)"
            echo "  ollama pull codellama   (Best for SQL)"
            echo ""
            read -p "Pull llama3.2 now? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                ollama pull llama3.2
            fi
        else
            echo "✓ Models found:"
            echo "$MODELS" | while read -r model; do
                echo "  - $model"
            done
        fi
    else
        echo "⚠️  Ollama is not running"
        echo "Start it with: ollama serve"
    fi
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

# Test setup
echo ""
echo "Testing setup..."
npm run dev test

if [ $? -eq 0 ]; then
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║   ✓ Setup Complete!                   ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""
    echo "Quick Start:"
    echo "  1. Connect to database:"
    echo "     npm run dev connect sqlite://./test.db"
    echo ""
    echo "  2. Ask a question:"
    echo "     npm run dev ask \"show me all tables\""
    echo ""
    echo "  3. View documentation:"
    echo "     cat README.md"
    echo "     cat QUICKSTART.md"
    echo ""
else
    echo ""
    echo "⚠️  Setup completed with warnings"
    echo "Check the errors above and fix them"
    echo ""
    echo "Common issues:"
    echo "  - Ollama not running: ollama serve"
    echo "  - Model not installed: ollama pull llama3.2"
    echo ""
fi
