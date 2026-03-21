# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Cloud Run injects the PORT environment variable
ENV PORT 8080

# Run the app using gunicorn for production stability
# 1 worker and 8 threads is recommended for Flask apps on Cloud Run
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 server:app
