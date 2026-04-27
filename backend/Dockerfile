FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN python -m pip install --upgrade pip

# Install runtime dependencies from requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend source after installation to preserve layer caching
COPY . .

# Use the environment-provided port for hosted deployment.
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
