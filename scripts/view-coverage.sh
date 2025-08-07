#!/bin/bash

# View Coverage Report Script
# Generates fresh coverage and opens HTML report

echo "📊 Generating fresh test coverage report..."
npm run test:coverage

echo ""
echo "🌐 Coverage report generated!"
echo "📁 Location: coverage/index.html"
echo ""
echo "To view the interactive HTML report:"
echo "• Open coverage/index.html in your web browser"
echo "• Or run: open coverage/index.html (on macOS)"  
echo "• Or run: xdg-open coverage/index.html (on Linux)"
echo ""

# Try to open automatically if on Linux with GUI
if command -v xdg-open > /dev/null; then
    echo "🚀 Attempting to open coverage report in browser..."
    xdg-open coverage/index.html 2>/dev/null || echo "Could not auto-open. Please open coverage/index.html manually."
fi

echo ""
echo "📋 Current Coverage Summary:"
echo "• Overall: ~18% (needs improvement!)"  
echo "• Auth: 70% (excellent ✅)"
echo "• Utils: 77% (excellent ✅)"  
echo "• API: 0% (critical gap 🚨)"
echo "• Tools: 0% (critical gap 🚨)"
echo ""
echo "🎯 Priority: Add tests for API client and tool registry"