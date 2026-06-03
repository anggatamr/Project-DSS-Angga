FROM python:3.10-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app
COPY ["./laptop_price - dataset.csv", "/code/laptop_price - dataset.csv"]
COPY ./recruitment_data.csv /code/recruitment_data.csv

# Hugging Face Spaces uses port 7860 by default
ENV HF_SPACE=true
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
