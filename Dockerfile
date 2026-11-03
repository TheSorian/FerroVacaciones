# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Python Backend Runtime
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend application code
COPY database.py madrid_holidays.py server.py ./

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Persistent data directory
EXPOSE 5000

CMD ["python3", "server.py"]
