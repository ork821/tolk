# Repository Guidelines

## Project Structure & Module Organization

This repository contains a .NET Web API targeting `net9.0`. The entry point and DI setup live in `Program.cs`. Feature code is grouped under `src/`:

- `src/Auth`, `src/Users`, `src/Posts`, `src/Comments`, `src/Reactions`, `src/Groups`, `src/Me` contain controllers, services, DTOs, and feature logic.
- `src/Database` contains PostgreSQL setup scripts: `init.sh`, `tables.sql`, and `functions.sql`.
- `src/DTO` contains shared response DTOs.
- `src/Utility` contains cross-cutting helpers such as claim binding, cursor encoding, and ID generation.

There is currently no dedicated test project. Build artifacts are generated in `bin/` and `obj/` and should not be edited.

## Build, Test, and Development Commands

- `dotnet restore` restores NuGet packages.
- `dotnet build` compiles the API and catches C# errors.
- `dotnet run` starts the API locally using the configured `appsettings*.json` values.

Local development expects PostgreSQL connection settings under `ConnectionStrings:DataBase`. Development defaults are in `appsettings.Development.json`; avoid committing real secrets.

## Coding Style & Naming Conventions

Use C# primary constructors where they match the existing style, for example `public class PostsService(DatabaseContext databaseContext)`. Keep controllers thin: validate inputs, call services, and return HTTP responses. Services should contain database calls and mapping logic.

Use PascalCase for public types and methods, camelCase for parameters and locals, and `Async` suffix only where the existing pattern already uses it. Prefer parameterized SQL commands via Npgsql; never concatenate user input into SQL.

## Testing Guidelines

No test framework is currently configured. Until a test project exists, verify changes with `dotnet build` and targeted manual API checks. For future tests, prefer a separate test project such as `TolkApi.Tests`, with test names like `MethodName_WhenCondition_ReturnsExpectedResult`.

## Commit & Pull Request Guidelines

Recent history uses both short messages and conventional-style commits such as `feat(backend): ...` and `fix(infra): ...`. Prefer the conventional form:

```text
feat(posts): add reply endpoint
fix(auth): revoke refresh token on logout
```

Pull requests should include a concise summary, affected endpoints or SQL scripts, verification steps such as `dotnet build`, and any database migration or configuration notes.

## Security & Configuration Tips

Do not commit production secrets, OAuth tokens, JWT secrets, or database passwords. Keep refresh tokens in HTTP-only cookies. When changing auth, CORS, static file serving, or SQL functions, document the operational impact in the PR.
