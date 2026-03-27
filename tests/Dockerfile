# Use your prebuilt Playwright test image
FROM jasminegraph/jasminegraph-ui-tests-prerequisites:20251129T095458

WORKDIR /app

# Copy in your test suite
COPY . .

# Ensure Playwright browsers are installed
RUN npx playwright install

# Run tests
CMD ["npx", "playwright", "test"]

