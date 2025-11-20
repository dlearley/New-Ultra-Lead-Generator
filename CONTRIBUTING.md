# Contributing Guide

Thank you for your interest in contributing to the Webhook & API Key Management system!

## Development Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- Docker (optional, for easy setup)

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd webhook-api-keys
```

2. Run setup script:
```bash
./scripts/setup.sh
```

3. Start services:
```bash
# Option 1: Using Docker
docker-compose up -d

# Option 2: Manual
make dev      # Terminal 1: API server
make worker   # Terminal 2: Celery worker
```

4. Access the application:
- API: http://localhost:8000
- Admin UI: http://localhost:8000/admin
- API Docs: http://localhost:8000/docs

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### 2. Make Changes

- Follow existing code style and patterns
- Write tests for new features
- Update documentation as needed
- Keep commits focused and atomic

### 3. Run Tests

```bash
# Run all tests
make test

# Run specific test file
pytest tests/test_api_keys.py -v

# Run with coverage
pytest --cov=app --cov-report=html
```

### 4. Check Code Quality

```bash
# Format code (if using black)
black app/ tests/

# Type checking (if using mypy)
mypy app/

# Linting (if using flake8)
flake8 app/ tests/
```

### 5. Generate OpenAPI Spec

```bash
make openapi
```

Verify the generated spec in `docs/openapi.yaml`

### 6. Commit Changes

```bash
git add .
git commit -m "feat: add new webhook retry logic"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/updates
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

### 7. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### Python

- Follow PEP 8 style guide
- Use type hints where appropriate
- Maximum line length: 100 characters
- Use docstrings for functions and classes

**Example:**
```python
from typing import List, Optional
from sqlalchemy.orm import Session

def get_webhook_endpoints(
    db: Session,
    organization_id: str,
    skip: int = 0,
    limit: int = 100
) -> List[WebhookEndpoint]:
    """
    Retrieve webhook endpoints for an organization.
    
    Args:
        db: Database session
        organization_id: ID of the organization
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of WebhookEndpoint objects
    """
    return db.query(WebhookEndpoint).filter(
        WebhookEndpoint.organization_id == organization_id
    ).offset(skip).limit(limit).all()
```

### Database Migrations

When modifying models:

1. Create a new migration:
```bash
alembic revision --autogenerate -m "Add new field to webhook_endpoint"
```

2. Review the generated migration in `alembic/versions/`

3. Test the migration:
```bash
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

4. Commit the migration file

## Testing

### Writing Tests

- Place tests in `tests/` directory
- Name test files `test_*.py`
- Name test functions `test_*`
- Use fixtures for common setup

**Example:**
```python
import pytest
from app.services.webhook_service import WebhookService

@pytest.fixture
def webhook_service():
    return WebhookService()

def test_generate_signature(webhook_service):
    payload = '{"event": "new_lead"}'
    secret = "test-secret"
    
    signature = webhook_service.generate_signature(payload, secret)
    
    assert len(signature) == 64
    assert signature == webhook_service.generate_signature(payload, secret)
```

### Test Coverage

Maintain at least 80% test coverage:

```bash
pytest --cov=app --cov-report=term-missing --cov-fail-under=80
```

## Documentation

### Code Documentation

- Add docstrings to all public functions and classes
- Include parameter types and return types
- Document exceptions that may be raised

### API Documentation

- FastAPI automatically generates OpenAPI docs
- Add descriptions to route handlers
- Document request/response schemas in Pydantic models

**Example:**
```python
@router.post("/", response_model=WebhookEndpointWithSecret)
def create_webhook_endpoint(
    endpoint_data: WebhookEndpointCreate,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    Create a new webhook endpoint.
    
    The webhook secret is returned only once. Store it securely.
    
    Args:
        endpoint_data: Webhook configuration
        organization_id: Organization ID from API key
        db: Database session
    
    Returns:
        Created webhook endpoint with secret
    
    Raises:
        HTTPException: If validation fails
    """
    return webhook_service.create_webhook_endpoint(
        db, organization_id, endpoint_data
    )
```

### User Documentation

Update relevant docs when adding features:
- `README.md` - Overview and quick start
- `WEBHOOKS.md` - Webhook integration guide
- `API_KEYS.md` - API key management guide

## Pull Request Guidelines

### Before Submitting

- [ ] All tests pass
- [ ] Code is formatted and linted
- [ ] Documentation is updated
- [ ] OpenAPI spec is regenerated
- [ ] Commit messages follow conventions

### PR Description

Include:
1. **What**: Brief description of changes
2. **Why**: Reason for the changes
3. **How**: Implementation approach
4. **Testing**: How you tested the changes
5. **Screenshots**: For UI changes

**Example:**
```markdown
## Add Webhook Retry Backoff Configuration

### What
Adds configurable retry backoff parameters to webhook endpoints.

### Why
Users need more control over retry timing for different types of webhooks.

### How
- Added `initial_retry_delay` and `retry_multiplier` fields to WebhookEndpoint model
- Updated create/update endpoints to accept new parameters
- Modified delivery task to use configured values

### Testing
- Added unit tests for retry calculation
- Tested with actual webhook deliveries
- Verified admin UI updates

### Breaking Changes
None - new fields are optional with sensible defaults.
```

### Review Process

1. Automated checks must pass (CI/CD)
2. At least one maintainer approval required
3. Address review comments
4. Squash commits before merge (if requested)

## Common Tasks

### Add a New Webhook Event Type

1. Add event to `EventType` enum in `app/schemas/webhook.py`
2. Create payload schema class
3. Add event trigger in appropriate service
4. Update documentation
5. Add tests

### Add a New API Endpoint

1. Create route in appropriate router file
2. Add Pydantic schema for request/response
3. Implement service method if needed
4. Add authentication/authorization
5. Write tests
6. Update OpenAPI spec

### Modify Database Schema

1. Update SQLAlchemy model
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review and test migration
4. Update Pydantic schemas if needed
5. Add tests

## Getting Help

- Review existing issues on GitHub
- Check documentation in `docs/`
- Ask questions in discussions
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
