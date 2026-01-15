## Description

<!-- Provide a clear and concise description of your changes -->

## Type of Change

<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Code style update (formatting, renaming)
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡️ Performance improvement
- [ ] ✅ Test update
- [ ] 🔧 Build configuration change
- [ ] 🔒 Security fix

## Related Issues

<!-- Link to related issues using #issue_number -->

Closes #
Related to #

## Motivation and Context

<!-- Why is this change required? What problem does it solve? -->

## Changes Made

<!-- List the specific changes made in this PR -->

- Change 1
- Change 2
- Change 3

## Implementation Details

<!-- Provide technical details about your implementation -->

### Rust Changes

```rust
// Key code snippets if applicable
```

### TypeScript/API Changes

```typescript
// API changes or new interfaces
```

## Performance Impact

<!-- Describe any performance implications -->

### Benchmarks

<!-- If applicable, provide benchmark results -->

**Before:**
```
resize_benchmark: 12.5ms
```

**After:**
```
resize_benchmark: 8.3ms (33% improvement)
```

## Breaking Changes

<!-- List any breaking changes and migration guide -->

- [ ] No breaking changes
- [ ] Breaking changes (describe below)

**Migration Guide:**
```typescript
// Before
oldAPI();

// After
newAPI();
```

## Testing

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Benchmarks added/updated
- [ ] Manual testing performed

### Test Description

<!-- Describe what tests were added or updated -->

### Manual Testing Steps

1. Step 1
2. Step 2
3. Expected result

## Documentation

- [ ] README.md updated
- [ ] API documentation updated
- [ ] CHANGELOG.md updated
- [ ] Code comments added/updated
- [ ] TypeScript types updated

## Screenshots/Videos

<!-- If applicable, add screenshots or videos demonstrating the changes -->

## Checklist

### Code Quality

- [ ] My code follows the project's code style guidelines
- [ ] I have run `cargo fmt` on Rust code
- [ ] I have run `cargo clippy` and addressed all warnings
- [ ] I have formatted TypeScript code consistently
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings

### Testing

- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have checked that my code doesn't break existing functionality

### Documentation

- [ ] I have made corresponding changes to the documentation
- [ ] I have updated the CHANGELOG.md with my changes
- [ ] I have added JSDoc/Rustdoc comments for new public APIs

### Git

- [ ] My commits follow the conventional commits format
- [ ] I have rebased on the latest main branch
- [ ] I have resolved all merge conflicts

## Additional Notes

<!-- Any additional information that reviewers should know -->

## Reviewer Notes

<!-- @mentions for specific reviewers or areas needing attention -->

/cc @maintainer

## Deployment Notes

<!-- Any special considerations for deployment -->

- [ ] Requires version bump
- [ ] Requires npm publish
- [ ] Requires documentation site update
- [ ] Requires announcement

---

**For Maintainers:**

- [ ] Approved
- [ ] Requires changes
- [ ] Ready to merge
