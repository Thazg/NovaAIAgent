@echo off
echo Installing Nova AI Agent Dependencies...

echo Installing Root Dependencies...
npm install

echo Installing Frontend Dependencies...
cd frontend
npm install
cd ..

echo Installing Backend Dependencies...
cd backend
pip install -r requirements.txt
cd ..

echo Done! Run "npm run dev" to start the application.
pause
