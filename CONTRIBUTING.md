# Contributing to Tavily Chat Agent

Thank you for your interest in contributing to the Tavily Chat Agent! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/chat.git`
3. Add upstream remote: `git remote add upstream https://github.com/tavily-ai/chat.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Backend Setup

1. Create a Python virtual environment:
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```bash
   cp .env.sample .env
   # Edit .env with your API keys
   ```

4. Run the backend:
   ```bash
   python app.py
   ```

### Frontend Setup

1. Navigate to the UI directory:
   ```bash
   cd ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.sample .env
   # Edit .env with VITE_BACKEND_URL
   ```

4. Run the frontend:
   ```bash
   npm run dev
   ```

### Using Docker Compose

```bash
docker-compose up -d
```

## Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test thoroughly

3. **Run tests**:
   ```bash
   # Backend tests
   pytest tests/ -v --cov

   # Frontend tests
   cd ui && npm run test
   ```

4. **Run linters**:
   ```bash
   # Backend
   ruff check backend/ app.py
   black backend/ app.py
   mypy backend/ app.py

   # Frontend
   cd ui
   npm run lint
   npm run format:check
   ```

5. **Commit your changes** (see Commit Guidelines below)

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## Testing

### Backend Tests

We use pytest for backend testing:

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=backend --cov=app

# Run specific test file
pytest tests/test_agent.py

# Run with verbose output
pytest tests/ -v
```

### Frontend Tests

We use Vitest for frontend testing:

```bash
cd ui

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

- **Unit tests** should test individual functions/classes in isolation
- **Integration tests** should test API endpoints and component interactions
- Aim for >70% code coverage
- Use meaningful test names that describe what is being tested
- Mock external dependencies (APIs, databases)

Example test structure:
```python
def test_function_name_expected_behavior():
    """Test description."""
    # Arrange
    test_data = ...

    # Act
    result = function_to_test(test_data)

    # Assert
    assert result == expected_value
```

## Code Style

### Python (Backend)

- Follow [PEP 8](https://pep8.org/) style guide
- Use [Black](https://black.readthedocs.io/) for code formatting
- Use [Ruff](https://docs.astral.sh/ruff/) for linting
- Add type hints to all functions
- Write docstrings for all public functions and classes

```python
def example_function(param: str, count: int = 10) -> dict[str, Any]:
    """
    Brief description of what the function does.

    Args:
        param: Description of param
        count: Description of count (default: 10)

    Returns:
        Dictionary containing the result

    Raises:
        ValueError: When param is empty
    """
    ...
```

### TypeScript/JavaScript (Frontend)

- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use [Prettier](https://prettier.io/) for code formatting
- Use [ESLint](https://eslint.org/) for linting
- Add TypeScript types to all functions and variables
- Use functional components and hooks for React

```typescript
interface ExampleProps {
  name: string;
  count?: number;
}

export const ExampleComponent: React.FC<ExampleProps> = ({ name, count = 10 }) => {
  // Component implementation
  return <div>{name}</div>;
};
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```
feat(agent): add support for custom tools

Add ability to register custom tools with the agent.
This allows users to extend the agent's capabilities
beyond the built-in Tavily tools.

Closes #123
```

```
fix(security): prevent path traversal in file upload

Sanitize filenames to remove path separators and
validate file extensions before saving.
```

## Pull Request Process

1. **Update documentation** if you've made changes to APIs or user-facing features

2. **Ensure all tests pass** and code coverage is maintained

3. **Update the CHANGELOG** (if applicable)

4. **Fill out the PR template** with:
   - Description of changes
   - Related issue numbers
   - Testing performed
   - Screenshots (for UI changes)

5. **Request review** from maintainers

6. **Address feedback** promptly and professionally

7. **Squash commits** if requested before merging

### PR Checklist

- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] No new warnings or errors
- [ ] Commits follow commit guidelines
- [ ] PR description is clear and complete

## Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search existing issues
3. Open a new issue with the "question" label
4. Contact the maintainers:
   - [Dean Sacoransky](mailto:deansa@tavily.com)
   - [Michael Griff](mailto:michaelgriff@tavily.com)

Thank you for contributing! 🎉
