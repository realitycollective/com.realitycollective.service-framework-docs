---
sidebar_position: 8
---

# Dependency Injection

***Last updated - 03 December 2025***

## Overview

The Service Framework provides built-in support for **Dependency Injection (DI)** through constructor-based injection, enabling services to declare their dependencies explicitly and have them automatically resolved during registration. This approach promotes cleaner code, better testability, and clearer service relationships.

This article will cover:

* [What is Dependency Injection?](#what-is-dependency-injection)
* [Why Use Dependency Injection?](#why-use-dependency-injection)
* [Declaring Service Dependencies](#declaring-service-dependencies)
* [Registration Order Requirements](#registration-order-requirements)
* [Multiple Dependencies](#multiple-dependencies)
* [Error Handling](#error-handling)
* [Tutorial: Building Services with Dependencies](#tutorial-building-services-with-dependencies)
* [Comparison: Constructor Injection vs Runtime Retrieval](#comparison-constructor-injection-vs-runtime-retrieval)
* [Tips and tricks](#tips-and-tricks)

Time to begin.

---

## What is Dependency Injection?

**Dependency Injection** is a design pattern where an object receives the other objects it depends on rather than creating or finding them itself. In the Service Framework, this means your services can declare which other services they need in their constructor, and the framework will automatically provide those dependencies when the service is created.

Instead of a service manually retrieving its dependencies like this:

```csharp
public override void Initialize()
{
    var authService = ServiceManager.Instance.GetService<IAuthenticationService>();
    // Use authService...
}
```

With dependency injection, the dependencies are provided automatically through the constructor:

```csharp
public MyService(string name, uint priority, BaseProfile profile, IAuthenticationService authService)
    : base(name, priority)
{
    this.authService = authService;
}
```

This pattern is a fundamental aspect of modern software design and is widely used across many frameworks and platforms.

:::tip

For a deeper understanding of dependency injection principles and patterns, refer to Microsoft's comprehensive documentation:
- [Dependency injection in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
- [Dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)

:::

---

## Why Use Dependency Injection?

Using dependency injection in your services provides several important benefits over manually retrieving services at runtime:

### Explicit Dependencies

Dependencies are declared in the constructor signature, making it immediately clear what a service needs to function. Anyone reading your code can see the service's requirements without digging through initialization methods or update loops.

### Compile-Time Safety

If a required dependency is missing from the service configuration, you'll know immediately when the service attempts to register, rather than discovering null reference errors during runtime when a specific code path executes.

### Improved Testability

Services with constructor injection are easier to test because you can provide mock implementations of dependencies directly in your tests without needing the full Service Framework infrastructure.

### Better Performance

Dependencies are resolved once during service registration rather than being retrieved every time they're needed, eliminating repeated service lookups and reducing overhead.

### Clearer Service Relationships

The dependency graph of your application becomes explicit in your code, making it easier to understand how services interact and identify potential architectural issues.

:::info

These benefits align with Microsoft's recommended practices for building maintainable, testable applications. Learn more about [dependency injection best practices](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines).

:::

---

## Declaring Service Dependencies

To use dependency injection in your services, you simply add the required service interfaces as parameters to your service constructor. The Service Framework will automatically detect these dependencies and inject them during registration.

### Basic Constructor Pattern

Every service in the Service Framework starts with three base parameters: `name`, `priority`, and `profile`. Dependencies are added **after** these base parameters:

```csharp
public interface IMyService : IService
{
    // Service interface definition
}

public class MyService : BaseServiceWithConstructor, IMyService
{
    private readonly IDependencyService dependency;

    public MyService(string name, uint priority, BaseProfile profile, IDependencyService dependency)
        : base(name, priority)
    {
        this.dependency = dependency ?? throw new ArgumentNullException(nameof(dependency));
    }

    public override void Initialize()
    {
        // dependency is guaranteed to be available here
        dependency.DoSomething();
    }
}
```

### Key Requirements

For dependency injection to work correctly, your constructor parameters must follow these rules:

1. **Always include base parameters first**: `name`, `priority`, `profile` must be the first three parameters
2. **Use interface types**: Dependencies must be service interfaces that implement `IService`
3. **Order matters**: Dependencies are injected in the order they appear in the constructor
4. **Dependencies must exist**: All required services must be registered before the dependent service

:::warning

Service dependencies must be **interfaces** that implement `IService`. You cannot inject concrete service implementations directly.

:::

---

## Registration Order Requirements

One of the most important aspects of using dependency injection is ensuring services are registered in the correct order. A service that depends on another service must be registered **after** its dependencies.

### Configuration Order

In your Service Framework configuration profile, services are registered from top to bottom. Ensure dependent services appear later in the list:

![Service Registration Order](./images/08_01_ServiceRegistrationOrder.png)

```text
Correct Order:
1. Authentication Service (no dependencies)
2. User Service (depends on Authentication Service)
3. Analytics Service (depends on User Service)

Incorrect Order:
1. Analytics Service ❌ (dependencies not yet registered)
2. User Service ❌ (dependency not yet registered)
3. Authentication Service
```

### Using Priority Values

You can also use the `priority` parameter to influence service initialization order. Services with **higher** priority values are initialized **earlier**:

```csharp
// High priority - initialized first
public AuthenticationService(string name, uint priority, BaseProfile profile)
    : base(name, priority) // priority = 10
{
}

// Lower priority - initialized after dependencies
public UserService(string name, uint priority, BaseProfile profile, IAuthenticationService authService)
    : base(name, priority) // priority = 5
{
}
```

:::note

The Service Framework will log a clear error message if a required dependency is not found during service registration, indicating which service and which dependency is missing.

:::

---

## Multiple Dependencies

Services can declare multiple dependencies in their constructor. Simply add each required service interface as an additional parameter:

```csharp
public interface IAnalyticsService : IService
{
    void TrackEvent(string eventName, string userId);
}

public class AnalyticsService : BaseServiceWithConstructor, IAnalyticsService
{
    private readonly IAuthenticationService authService;
    private readonly IUserService userService;
    private readonly INetworkService networkService;

    public AnalyticsService(
        string name, 
        uint priority, 
        BaseProfile profile,
        IAuthenticationService authService,
        IUserService userService,
        INetworkService networkService)
        : base(name, priority)
    {
        this.authService = authService ?? throw new ArgumentNullException(nameof(authService));
        this.userService = userService ?? throw new ArgumentNullException(nameof(userService));
        this.networkService = networkService ?? throw new ArgumentNullException(nameof(networkService));
    }

    public void TrackEvent(string eventName, string userId)
    {
        if (authService.IsAuthenticated)
        {
            var user = userService.GetUser(userId);
            networkService.SendData($"Event: {eventName}, User: {user.Name}");
        }
    }
}
```

### Transitive Dependencies

The Service Framework also supports transitive dependencies (dependency chains). If Service A depends on Service B, and Service B depends on Service C, simply ensure the registration order is: C, then B, then A.

```csharp
// Service A (no dependencies)
public class AuthenticationService : BaseServiceWithConstructor, IAuthenticationService
{
    public AuthenticationService(string name, uint priority, BaseProfile profile)
        : base(name, priority)
    {
    }
}

// Service B (depends on A)
public class UserService : BaseServiceWithConstructor, IUserService
{
    private readonly IAuthenticationService authService;

    public UserService(string name, uint priority, BaseProfile profile, IAuthenticationService authService)
        : base(name, priority)
    {
        this.authService = authService;
    }
}

// Service C (depends on B, which depends on A)
public class ProfileService : BaseServiceWithConstructor, IProfileService
{
    private readonly IUserService userService;

    public ProfileService(string name, uint priority, BaseProfile profile, IUserService userService)
        : base(name, priority)
    {
        this.userService = userService;
    }
}
```

Registration order: Authentication Service → User Service → Profile Service

---

## Error Handling

The Service Framework provides clear error messages when dependency injection fails, helping you quickly identify and resolve configuration issues.

### Missing Dependency

If a required dependency is not registered before the dependent service, you'll see an error like:

```text
Failed to find an IAuthenticationService service to inject into parameter authService for service UserService!
```

**Solution**: Ensure the dependency (`IAuthenticationService`) is registered in the Service Framework configuration before the dependent service (`UserService`).

### Wrong Constructor Signature

If your constructor parameters don't follow the correct pattern (base parameters first, then dependencies), registration will fail.

**Solution**: Always structure constructors as:
1. `string name`
2. `uint priority`
3. `BaseProfile profile` (or your specific profile type)
4. Service dependencies (all `IService` interfaces)

### Circular Dependencies

If Service A depends on Service B, and Service B depends on Service A, this creates a circular dependency that cannot be resolved.

**Solution**: Redesign your services to remove the circular dependency. Consider:
- Creating a third service that both depend on
- Using events/delegates instead of direct dependencies
- Restructuring the service responsibilities

:::warning

The Service Framework does not currently detect circular dependencies automatically. If you create a circular dependency, you may experience a stack overflow or initialization failure.

:::

---

## Tutorial: Building Services with Dependencies

Let's build a practical example showing how services work together using dependency injection. We'll create a simple authentication and user management system.

### Step 1: Create the Authentication Service

First, we'll create a service that handles user authentication. This service has no dependencies.

**IAuthenticationService.cs**
```csharp
using RealityCollective.ServiceFramework.Interfaces;

public interface IAuthenticationService : IService
{
    bool IsAuthenticated { get; }
    string CurrentUserId { get; }
    void Login(string userId);
    void Logout();
}
```

**AuthenticationService.cs**
```csharp
using RealityCollective.ServiceFramework.Definitions;
using RealityCollective.ServiceFramework.Services;
using UnityEngine;

public class AuthenticationService : BaseServiceWithConstructor, IAuthenticationService
{
    public bool IsAuthenticated { get; private set; }
    public string CurrentUserId { get; private set; }

    public AuthenticationService(string name, uint priority, BaseProfile profile)
        : base(name, priority)
    {
    }

    public void Login(string userId)
    {
        CurrentUserId = userId;
        IsAuthenticated = true;
        Debug.Log($"User {userId} logged in successfully");
    }

    public void Logout()
    {
        Debug.Log($"User {CurrentUserId} logged out");
        CurrentUserId = null;
        IsAuthenticated = false;
    }
}
```

### Step 2: Create the User Service

Now we'll create a service that manages user data. This service depends on the Authentication Service to verify the current user.

**IUserService.cs**
```csharp
using RealityCollective.ServiceFramework.Interfaces;

public interface IUserService : IService
{
    UserData GetCurrentUser();
    void UpdateUserPreference(string key, string value);
}
```

**UserService.cs**
```csharp
using RealityCollective.ServiceFramework.Definitions;
using RealityCollective.ServiceFramework.Services;
using System.Collections.Generic;
using UnityEngine;

public class UserService : BaseServiceWithConstructor, IUserService
{
    private readonly IAuthenticationService authService;
    private readonly Dictionary<string, Dictionary<string, string>> userPreferences;

    // Constructor with dependency injection
    public UserService(string name, uint priority, BaseProfile profile, IAuthenticationService authService)
        : base(name, priority)
    {
        this.authService = authService ?? throw new System.ArgumentNullException(nameof(authService));
        this.userPreferences = new Dictionary<string, Dictionary<string, string>>();
    }

    public UserData GetCurrentUser()
    {
        if (!authService.IsAuthenticated)
        {
            Debug.LogWarning("No user is currently authenticated");
            return null;
        }

        return new UserData
        {
            UserId = authService.CurrentUserId,
            Preferences = GetUserPreferences(authService.CurrentUserId)
        };
    }

    public void UpdateUserPreference(string key, string value)
    {
        if (!authService.IsAuthenticated)
        {
            Debug.LogError("Cannot update preferences: no user authenticated");
            return;
        }

        var userId = authService.CurrentUserId;
        
        if (!userPreferences.ContainsKey(userId))
        {
            userPreferences[userId] = new Dictionary<string, string>();
        }

        userPreferences[userId][key] = value;
        Debug.Log($"Updated preference '{key}' = '{value}' for user {userId}");
    }

    private Dictionary<string, string> GetUserPreferences(string userId)
    {
        if (userPreferences.ContainsKey(userId))
        {
            return userPreferences[userId];
        }
        return new Dictionary<string, string>();
    }
}

public class UserData
{
    public string UserId { get; set; }
    public Dictionary<string, string> Preferences { get; set; }
}
```

### Step 3: Create the Logging Service

Finally, let's create a logging service that depends on both previous services to add context to log messages.

**ILoggingService.cs**
```csharp
using RealityCollective.ServiceFramework.Interfaces;

public interface ILoggingService : IService
{
    void LogMessage(string message);
    void LogError(string message);
}
```

**LoggingService.cs**
```csharp
using RealityCollective.ServiceFramework.Definitions;
using RealityCollective.ServiceFramework.Services;
using UnityEngine;

public class LoggingService : BaseServiceWithConstructor, ILoggingService
{
    private readonly IAuthenticationService authService;
    private readonly IUserService userService;

    // Constructor with multiple dependencies
    public LoggingService(
        string name, 
        uint priority, 
        BaseProfile profile,
        IAuthenticationService authService,
        IUserService userService)
        : base(name, priority)
    {
        this.authService = authService ?? throw new System.ArgumentNullException(nameof(authService));
        this.userService = userService ?? throw new System.ArgumentNullException(nameof(userService));
    }

    public void LogMessage(string message)
    {
        var contextualMessage = BuildContextualMessage(message);
        Debug.Log($"[LOG] {contextualMessage}");
    }

    public void LogError(string message)
    {
        var contextualMessage = BuildContextualMessage(message);
        Debug.LogError($"[ERROR] {contextualMessage}");
    }

    private string BuildContextualMessage(string message)
    {
        if (!authService.IsAuthenticated)
        {
            return $"[Anonymous] {message}";
        }

        var user = userService.GetCurrentUser();
        return $"[User: {user.UserId}] {message}";
    }
}
```

### Step 4: Configure the Services

In your Service Framework configuration profile, add the services in the correct order:

1. **Authentication Service** (no dependencies) - Priority: 10
2. **User Service** (depends on Authentication Service) - Priority: 5
3. **Logging Service** (depends on Authentication and User services) - Priority: 1

### Step 5: Use the Services

Now you can use these services from anywhere in your application:

```csharp
using RealityCollective.ServiceFramework.Services;
using UnityEngine;

public class ApplicationController : MonoBehaviour
{
    private IAuthenticationService authService;
    private IUserService userService;
    private ILoggingService loggingService;

    private void Start()
    {
        // Retrieve services from the Service Framework
        authService = ServiceManager.Instance.GetService<IAuthenticationService>();
        userService = ServiceManager.Instance.GetService<IUserService>();
        loggingService = ServiceManager.Instance.GetService<ILoggingService>();

        // Use the services
        loggingService.LogMessage("Application started");
        
        authService.Login("user123");
        loggingService.LogMessage("User logged in");
        
        userService.UpdateUserPreference("theme", "dark");
        
        var currentUser = userService.GetCurrentUser();
        loggingService.LogMessage($"Retrieved user data for {currentUser.UserId}");
    }
}
```

This example demonstrates how dependency injection creates clean, maintainable code where each service has a single responsibility and explicitly declares what it needs to function.

---

## Comparison: Constructor Injection vs Runtime Retrieval

The Service Framework supports both constructor injection and runtime service retrieval. Here's how they compare:

| Aspect | Constructor Injection | Runtime Retrieval |
|--------|----------------------|-------------------|
| **Syntax** | `public MyService(..., IDependency dep)` | `ServiceManager.Instance.GetService<IDependency>()` |
| **When resolved** | During service registration | When `GetService()` is called |
| **Null safety** | Guaranteed non-null (or registration fails) | Requires manual null checking |
| **Performance** | Resolved once, stored in field | Lookup every time (unless cached) |
| **Testability** | Easy to mock dependencies | Requires ServiceManager infrastructure |
| **Flexibility** | Fixed at registration | Can retrieve different services dynamically |
| **Dependencies** | Explicit in constructor | Hidden in implementation |
| **Error detection** | At startup/registration | At runtime when code path executes |

### When to Use Constructor Injection

Use constructor injection when:
- The dependency is **required** for the service to function
- The dependency is known at design time
- You want compile-time verification of service relationships
- You're building testable, maintainable code
- Performance is a concern (avoids repeated lookups)

### When to Use Runtime Retrieval

Use runtime retrieval when:
- The dependency is **optional** or conditional
- You need to access services dynamically based on runtime conditions
- You're calling into the Service Framework from non-service code
- The dependency might not always be registered
- You need to retrieve multiple instances or modules dynamically

:::tip

**Best Practice**: Use constructor injection for required dependencies and runtime retrieval for optional or dynamic service access. This gives you the benefits of explicit dependencies while maintaining flexibility where needed.

:::

---

## Tips and tricks

* **Always validate injected dependencies** are not null in your constructor, even though the framework should guarantee they exist. This provides an extra safety net and makes debugging easier.

* **Use readonly fields** for injected dependencies to prevent accidental reassignment and clearly indicate the dependency is set once during construction.

* **Keep dependency chains reasonable** - if a service depends on 5+ other services, consider whether it's doing too much and should be split into smaller services.

* **Document your dependencies** in XML comments on your service class, especially if the dependency relationships are complex or non-obvious.

* **Register dependencies before dependents** in your Service Framework configuration. A good rule of thumb is to order services by their "level" - foundation services first, then services that build on them.

* **Consider using priority values** in complex projects to ensure proper initialization order without needing to manually order services in the configuration.

* **Avoid circular dependencies** - if Service A needs Service B and Service B needs Service A, you have a design problem. Refactor to create a third service they both depend on, or use events for communication.

* **Test dependency ordering** during development by temporarily moving services in your configuration to ensure errors are caught early.

* **Use interfaces, not concrete types** - always inject service interfaces (`IMyService`) rather than concrete implementations to maintain proper abstraction and testability.

* **Profile your dependency chains** in larger projects to understand initialization order and identify potential bottlenecks or circular references before they cause runtime issues.

:::note

Remember, services can call each other at runtime using `GetService<T>()`, but constructor injection should be your default choice for required dependencies. Order matters in both cases!

:::

---

## More information

For more information on the Service Framework and related topics, check out these additional links:

* [Introduction](./01_introduction.md)
* [Creating your first service](./02_getting_started.md)
* [Service design](./03_service_design.md)
* [Advanced services and sub services (service modules)](./04_advanced_services.md)
* [Service Patterns and implementations](./05_service_patterns.md)
* [Unity 6 Performance Improvements](../unity6-performance-improvements.md)
* [Roadmap](./07_roadmap.md)

**External Resources:**
* [Dependency injection in .NET - Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
* [Dependency injection guidelines - Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)
* [Dependency Inversion Principle - Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles#dependency-inversion)
