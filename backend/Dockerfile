FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY LoadForge.sln .
COPY src/LoadForge.Api/LoadForge.Api.csproj src/LoadForge.Api/
COPY src/LoadForge.Core/LoadForge.Core.csproj src/LoadForge.Core/
COPY src/LoadForge.Infrastructure/LoadForge.Infrastructure.csproj src/LoadForge.Infrastructure/
COPY src/LoadForge.Runner/LoadForge.Runner.csproj src/LoadForge.Runner/
COPY src/LoadForge.Worker/LoadForge.Worker.csproj src/LoadForge.Worker/

# Restore dependencies
RUN dotnet restore

# Copy source code
COPY . .

# Build
RUN dotnet build -c Release --no-restore

# Publish API
RUN dotnet publish src/LoadForge.Api/LoadForge.Api.csproj -c Release -o /app/publish --no-build

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080
ENTRYPOINT ["dotnet", "LoadForge.Api.dll"]

