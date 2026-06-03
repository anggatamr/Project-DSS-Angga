FROM python:3.10-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app
COPY ["./laptop_price - dataset.csv", "/code/laptop_price - dataset.csv"]
COPY ./recruitment_data.csv /code/recruitment_data.csv

# Port 10000 adalah default Render; override via PORT env var jika perlu
ENV PORT=10000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
