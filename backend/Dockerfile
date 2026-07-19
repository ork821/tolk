FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
USER $APP_UID
WORKDIR /app
ENV ASPNETCORE_URLS=http://*:8080
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["TolkApi.csproj", "./"]
RUN dotnet restore "TolkApi.csproj"
COPY . .
WORKDIR "/src/"
RUN dotnet build "TolkApi.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "TolkApi.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
# Ensure directories exist and are owned by non-root user
USER root
RUN mkdir -p /app/attachments /app/avatars /app/logs && chown -R $APP_UID:$APP_UID /app/attachments /app/avatars /app/logs
USER $APP_UID
COPY --from=publish /app .

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health/ready || exit 1

ENTRYPOINT ["dotnet", "TolkApi.dll"]
