FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392
RUN apt-get update && apt-get install -y --no-install-recommends git python3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /trusted/app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY services/beta-buddy /trusted/buddy
COPY services/beta-buddy/product_checks/check.py /checks/check.py
COPY services/beta-buddy/product_checks/entrypoint.py /checks/entrypoint.py
USER 65534:65534
ENTRYPOINT ["python3", "/checks/entrypoint.py"]
