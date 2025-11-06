#!/bin/bash
set -e

echo "🚀 Starting Open Notebook Local Development..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to script directory
cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file. Please configure your API keys if needed.${NC}"
fi

# Check if SurrealDB is installed and add to PATH
if ! command -v surreal &> /dev/null; then
    # Check if it's in the default install location
    if [ -f "$HOME/.surrealdb/surreal" ]; then
        export PATH="$HOME/.surrealdb:$PATH"
        echo -e "${GREEN}✅ Found SurrealDB in ~/.surrealdb${NC}"
    else
        echo -e "${YELLOW}⚠️  SurrealDB not found. Installing...${NC}"
        echo -e "${BLUE}Installing SurrealDB via curl...${NC}"
        curl -sSf https://install.surrealdb.com | sh
        export PATH="$HOME/.surrealdb:$PATH"
        echo -e "${GREEN}✅ SurrealDB installed${NC}"
    fi
else
    echo -e "${GREEN}✅ SurrealDB already in PATH${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}📦 Activating virtual environment...${NC}"
source .venv/bin/activate

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Python dependencies not found. Installing...${NC}"
    pip install -r requirements.txt
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Frontend dependencies not found. Installing...${NC}"
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi

# Create data directory if it doesn't exist
mkdir -p data/surrealdb

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    jobs -p | xargs -r kill 2>/dev/null || true
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start SurrealDB
echo -e "${BLUE}🗄️  Starting SurrealDB...${NC}"
surreal start --log info --user root --pass root file:data/surrealdb &
SURREAL_PID=$!
sleep 2

# Check if SurrealDB started
if ! kill -0 $SURREAL_PID 2>/dev/null; then
    echo -e "${YELLOW}❌ SurrealDB failed to start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SurrealDB running (PID: $SURREAL_PID)${NC}"

# Start Backend API
echo -e "${BLUE}🔧 Starting Backend API...${NC}"
export PYTHONPATH=/Users/ephriamkassa/Desktop/EphItUp/thirdopen/open-notebook:$PYTHONPATH
export ENABLE_WORKER=true
cd /Users/ephriamkassa/Desktop/EphItUp/thirdopen/open-notebook
uvicorn api.main:app --reload --host 0.0.0.0 --port 5055 &
API_PID=$!
sleep 3

# Check if API started
if ! kill -0 $API_PID 2>/dev/null; then
    echo -e "${YELLOW}❌ Backend API failed to start${NC}"
    cleanup
fi
echo -e "${GREEN}✅ Backend API running on http://localhost:5055 (PID: $API_PID)${NC}"

# Start Worker
echo -e "${BLUE}⚙️  Starting Background Worker...${NC}"
./start-worker.sh &
WORKER_PID=$!
sleep 3

# Check if Worker started
if ! kill -0 $WORKER_PID 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Worker failed to start (check dependencies)${NC}"
else
    echo -e "${GREEN}✅ Worker running (PID: $WORKER_PID)${NC}"
fi

# Start Frontend
echo -e "${BLUE}⚛️  Starting Frontend (Next.js)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Open Notebook is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌐 Frontend:${NC}  http://localhost:3000"
echo -e "${BLUE}🔧 Backend:${NC}   http://localhost:5055"
echo -e "${BLUE}📚 API Docs:${NC}  http://localhost:5055/docs"
echo -e "${BLUE}🗄️  Database:${NC}  SurrealDB (local file)"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for all background processes
wait

