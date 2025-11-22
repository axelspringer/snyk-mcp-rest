#!/bin/bash

# Snyk MCP REST Client Setup Script
# This script sets up the development environment for the project

set -e  # Exit on error

echo "🚀 Starting setup for snyk-mcp-rest..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed."
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✓ npm version: $NPM_VERSION"
echo ""

# Download OpenAPI specification
OPENAPI_URL="https://api.snyk.io/rest/openapi/2025-11-05"
echo "📥 Downloading latest OpenAPI specification from Snyk API ($OPENAPI_URL)..."
OPENAPI_FILE="res/snyk-openapi.json"

# Create res directory if it doesn't exist
mkdir -p res

# Download the OpenAPI spec
if command -v curl &> /dev/null; then
    curl -sSL "$OPENAPI_URL" -o "$OPENAPI_FILE"
    echo "✓ Downloaded OpenAPI spec to $OPENAPI_FILE"
elif command -v wget &> /dev/null; then
    wget -q "$OPENAPI_URL" -O "$OPENAPI_FILE"
    echo "✓ Downloaded OpenAPI spec to $OPENAPI_FILE"
else
    echo "❌ Error: Neither curl nor wget is installed."
    echo "Please install curl or wget to download the OpenAPI specification."
    exit 1
fi

echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Generating API client from OpenAPI spec..."
npm run generate

echo ""
echo "🏗️  Building TypeScript code..."
npm run build

echo ""
echo "🧪 Running tests to verify setup..."
npm test

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Create a .env file with your Snyk API credentials:"
echo "     SNYK_API_KEY=your-api-key-here"
echo ""
echo "  2. Run the example:"
echo "     npx ts-node examples/basic-usage.ts"
echo ""
echo "  3. Start developing!"
echo "     npm run test:watch  # Run tests in watch mode"
echo "     npm run test:ui     # Open test UI"
echo ""
