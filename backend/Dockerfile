FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt && \
    pip install --no-cache-dir gunicorn

COPY . /app

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
