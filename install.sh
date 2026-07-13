#!/bin/bash
echo "Installing Nova AI Agent Dependencies..."

echo "Installing Root Dependencies..."
npm install

echo "Installing Frontend Dependencies..."
cd frontend
npm install
cd ..

echo "Installing Backend Dependencies..."
cd backend
pip3 install -r requirements.txt
cd ..

echo "Done! Run 'npm run dev' to start the application."
