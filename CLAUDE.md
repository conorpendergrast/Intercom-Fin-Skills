# CLAUDE.md - Developer Guide for AI Assistants

This document provides comprehensive guidance for AI assistants (like Claude) working on the **Intercom Fin Skills** repository. It documents the codebase structure, development workflows, and key conventions to follow.

## Project Overview

**Project Name:** Intercom Fin Skills
**Maintainer:** Conor Pendergrast (CustomerSuccess.cx)
**License:** MIT
**Repository Status:** Early-stage skeleton/template project

### Purpose
This repository is intended to house tools, utilities, or educational content related to financial functionality for the Intercom platform. The actual implementation code and infrastructure are still being developed.

---

## Current Repository State

### What Exists
- `README.md` - Basic project description
- `LICENSE` - MIT License (Copyright 2026)
- `.git/` - Git repository

### What Does NOT Exist Yet
- Source code directories (`src/`, `lib/`, etc.)
- Configuration files (`package.json`, `tsconfig.json`, etc.)
- Build/development infrastructure
- Testing framework or tests
- Linting/formatting configuration
- CI/CD pipelines

### Immediate Next Steps
Before substantial development begins, the project needs:
1. **Technology Stack Decision** - Choose language(s) and framework(s)
2. **Project Structure** - Define directory layout and module organization
3. **Configuration Files** - Add appropriate config files based on tech stack
4. **Development Workflow** - Establish how to run, build, and test locally
5. **Code Quality Tools** - Set up linting, formatting, and testing

---

## Development Workflow

### Branch Strategy

**Current Development Branch:** `claude/add-claude-documentation-HvVHb`

When working on features:
1. All work should be done on the designated branch starting with `claude/` and ending with the session ID
2. **Never** push to `main` or `master` without explicit permission
3. Each feature or task should have a clear branch with descriptive naming

### Git Workflow for AI Assistants

```bash
# Ensure you're on the correct branch
git status

# Before making changes
git fetch origin <branch-name>
git pull origin <branch-name>

# After making changes
git add <specific-files>  # Prefer specific files over git add -A
git commit -m "Clear, descriptive commit message"
git push -u origin <branch-name>
```

**Important Git Notes:**
- Always use `git push -u origin <branch-name>` for new branches
- If push fails with 403, verify the branch name starts with `claude/` and ends with the correct session ID
- Retry failed pushes with exponential backoff (2s, 4s, 8s, 16s) for network errors
- Never force push without explicit permission
- Avoid committing files that contain secrets (.env, credentials, etc.)

### Commit Message Conventions

Follow these conventions for commit messages:

```
Brief, imperative description of changes

- Use imperative mood ("add feature" not "added feature")
- First line should be 50 characters or less
- Leave blank line before detailed explanation
- Wrap explanation at 72 characters
- Reference issues if applicable
```

Examples:
- ✅ `Add authentication module to user service`
- ✅ `Fix race condition in cache invalidation`
- ✅ `Refactor database connection pooling`
- ❌ `Updated stuff` (too vague)
- ❌ `Fixed bugs and improved performance` (too broad)

---

## Code Organization (Future Structure)

Once the project begins implementation, follow these organizational guidelines:

### Suggested Directory Layout
```
Intercom-Fin-Skills/
├── src/                    # Source code
│   ├── modules/           # Feature modules
│   ├── utils/             # Utility functions
│   ├── types/             # Type definitions (if TypeScript)
│   └── index.ts           # Main entry point
├── tests/                 # Test files
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/                  # Documentation
├── config/                # Configuration files
├── scripts/               # Build and utility scripts
├── .github/               # GitHub specific files
│   └── workflows/         # CI/CD workflows
├── package.json           # (if Node.js)
├── tsconfig.json          # (if TypeScript)
├── eslintrc.json          # Code linting
├── .prettierrc             # Code formatting
├── README.md              # Project overview
├── CLAUDE.md              # This file
├── CONTRIBUTING.md        # Contribution guidelines
└── LICENSE                # MIT License
```

### Module Organization Principles
- **Single Responsibility:** Each module should have one clear purpose
- **Encapsulation:** Hide internal implementation details
- **Minimal Dependencies:** Reduce coupling between modules
- **Clear Exports:** Explicitly define what each module exports
- **Documentation:** Include JSDoc/docstring comments for public APIs

---

## Code Quality Standards

### For AI Assistants to Follow

#### 1. **Code Style**
- Follow existing code patterns in the repository
- Use consistent indentation (2 or 4 spaces - to be decided per project)
- Use descriptive variable and function names
- Avoid single-letter variables except in loops
- Keep functions focused and reasonably sized (aim for <50 lines)

#### 2. **Comments and Documentation**
- Add comments for "why" not "what" (code shows what it does)
- Comment complex algorithms or non-obvious logic
- Keep comments accurate and up-to-date
- Use JSDoc/docstring format for function documentation

#### 3. **Testing**
- Write tests for critical business logic
- Aim for meaningful test coverage (quality > quantity)
- Test both happy paths and error cases
- Use descriptive test names that explain what is being tested
- Keep tests focused and independent

#### 4. **Error Handling**
- Handle errors at system boundaries (user input, external APIs)
- Provide meaningful error messages
- Use appropriate error types
- Log errors appropriately (avoid logging sensitive data)

#### 5. **Security**
- Never commit secrets, keys, or credentials
- Validate and sanitize user input
- Use parameterized queries/prepared statements
- Follow OWASP guidelines for web applications
- Regular security review of changes

#### 6. **Performance**
- Avoid premature optimization
- Use appropriate algorithms and data structures
- Profile before optimizing
- Document performance-critical sections

---

## Technology Stack Decisions

When the technology stack is finalized, update this section with:

```markdown
### Chosen Stack
- **Language:** [e.g., TypeScript, Python, Go]
- **Runtime:** [e.g., Node.js v18+, Python 3.11+]
- **Web Framework:** [if applicable]
- **Database:** [if applicable]
- **Package Manager:** [e.g., npm, pip, cargo]

### Key Dependencies
- [List major dependencies and versions]

### Development Dependencies
- **Testing:** [e.g., Jest, pytest]
- **Linting:** [e.g., ESLint, pylint]
- **Formatting:** [e.g., Prettier, black]
- **Build Tool:** [if applicable]
```

---

## Development Environment Setup

Update this section once development environment is established:

### Local Development
```bash
# Steps to clone and set up the project locally
```

### Running Tests
```bash
# Commands to run test suite
```

### Building the Project
```bash
# Commands to build the project
```

### Running Linter and Formatter
```bash
# Commands to check and fix code style
```

---

## Common Workflows

### Adding a New Feature

1. **Create or switch to feature branch** (based on current task branch)
2. **Implement the feature** following code quality standards
3. **Add tests** for the new functionality
4. **Update documentation** if needed
5. **Run linter and formatter** to ensure code quality
6. **Test locally** before committing
7. **Commit with clear message** following conventions
8. **Push to branch** when ready

### Fixing a Bug

1. **Create a test** that reproduces the bug
2. **Locate the bug** in the codebase
3. **Implement the fix** with minimal scope
4. **Verify the test passes** with the fix
5. **Check for similar issues** elsewhere in codebase
6. **Commit with descriptive message** explaining the fix
7. **Verify no regressions** in existing tests

### Refactoring Code

1. **Ensure tests exist** before refactoring
2. **Make small, focused changes** one at a time
3. **Run tests after each change** to catch regressions
4. **Update documentation** if behavior changes
5. **Commit refactoring separately** from feature work
6. **Use clear commit messages** explaining the refactoring rationale

---

## Guidelines for AI Assistants

### DO

- ✅ Read and understand existing code before making changes
- ✅ Follow established patterns and conventions
- ✅ Write clear, maintainable code
- ✅ Ask questions if requirements are unclear
- ✅ Test changes thoroughly before committing
- ✅ Provide clear, helpful commit messages
- ✅ Update documentation when making changes
- ✅ Check for security issues in code
- ✅ Keep changes focused and minimal
- ✅ Suggest improvements to this guide

### DON'T

- ❌ Modify code without reading it first
- ❌ Over-engineer or add unnecessary complexity
- ❌ Commit code with secrets or credentials
- ❌ Make changes to unrelated files
- ❌ Write code that contradicts existing patterns
- ❌ Ignore test failures
- ❌ Force push without permission
- ❌ Add unnecessary comments or docstrings to unchanged code
- ❌ Refactor code that isn't directly related to the task
- ❌ Add features beyond the scope of the request

### Decision-Making

When making decisions about implementation:

1. **Prefer simplicity** - Do the minimum needed to solve the problem
2. **Follow existing patterns** - Use the same approach as similar code
3. **Consider maintainability** - Will future developers understand this?
4. **Validate assumptions** - Ask if requirements are ambiguous
5. **Check for precedent** - Has this been solved before in the codebase?

---

## Code Review Checklist

When reviewing AI-generated code changes:

- [ ] Does the code solve the stated problem?
- [ ] Is the code readable and understandable?
- [ ] Does it follow project conventions and patterns?
- [ ] Are there any security concerns?
- [ ] Has it been tested appropriately?
- [ ] Is the commit message clear and descriptive?
- [ ] Are there any performance issues?
- [ ] Is documentation updated if needed?
- [ ] Are there any unrelated changes?

---

## Troubleshooting

### Git Push Fails with 403

**Cause:** Branch name doesn't match expected format
**Solution:**
- Verify branch starts with `claude/` and ends with session ID
- Check current branch: `git branch`
- Switch to correct branch if needed

### Tests Failing After Changes

**Debugging Steps:**
1. Run tests locally: `[test command]`
2. Check git diff to see all changes
3. Review error messages carefully
4. Revert changes and test baseline
5. Apply changes incrementally to isolate issue

### Merge Conflicts

**Resolution Strategy:**
1. Fetch latest changes: `git fetch origin`
2. View conflicting files: `git diff`
3. Manually resolve conflicts (keep meaningful code)
4. Run tests after resolving
5. Commit the merge resolution

---

## Updating This Guide

As the project evolves, this guide should be updated to reflect:
- Actual technology stack decisions
- Project structure once established
- Development environment setup instructions
- Testing framework and patterns
- Code style standards
- CI/CD pipeline details
- Team-specific conventions

**Last Updated:** February 2026
**Current Development Status:** Early-stage skeleton project awaiting implementation

---

## Quick Reference

| Task | Command |
|------|---------|
| Check status | `git status` |
| See changes | `git diff` |
| Create commit | `git commit -m "message"` |
| Push changes | `git push -u origin <branch>` |
| Switch branch | `git checkout <branch>` |
| Fetch updates | `git fetch origin <branch>` |

---

## Additional Resources

- **Git Documentation:** https://git-scm.com/doc
- **MIT License:** https://opensource.org/licenses/MIT
- **Intercom Developer Docs:** https://developers.intercom.com/
- **CustomerSuccess.cx:** https://customersuccess.cx

---

**For questions or suggestions about this guide, consult with Conor Pendergrast (CustomerSuccess.cx) or submit updates via pull request.**
