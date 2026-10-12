FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 INFERENCE_HOST=0.0.0.0 INFERENCE_PORT=8001
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home --uid 10001 appuser
COPY src ./src
RUN mkdir -p /app/artifacts && chown -R appuser:appuser /app
USER appuser
EXPOSE 8001
CMD ["python", "src/inference_service.py"]
