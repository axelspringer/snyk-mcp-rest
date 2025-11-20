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
