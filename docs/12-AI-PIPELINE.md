# AI Generation Pipeline

1. Create Book
2. Create BookVersion
3. Create GenerationJob
4. Generate story
5. Validate story
6. Generate character representation if required
7. Generate pages
8. Validate pages
9. Persist assets
10. Build final package
11. Mark BookVersion ready

Jobs need id, type, status, progress, retry count, provider, provider request id, errors and timestamps.

Transient failures are retryable; permanent validation failures must not retry indefinitely.
