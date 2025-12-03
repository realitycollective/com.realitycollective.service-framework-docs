---
sidebar_position: 8
---

# Roadmap

***Last updated - 03 December 2025***

The roadmap for the Service Framework as it stands is centred around a set of features that would be useful to implement in the future, there are no timelines currently associated with these features at this time and are provided on a "when resource is available" basis.

:::info

[The managed roadmap for the Service Framework can be found here](https://github.com/orgs/realitycollective/projects/1)

:::

In highlight the main items the team are reviewing to enhance the Service Framework are:

* UI: Enabling the Services list to highlight configured services in Green if they are working / activated as expected and RED if there is an issue.
* Editor: Enabling the **Service Hook** feature to allow properties to be editable at Editor runtime.
* Architecture: Improve Dependency Injection pattern to automatically sort service configuration based on dependencies.

## Current Dependency Injection Implementation

The Service Framework already includes a fully functional **constructor-based dependency injection** system that automatically resolves and injects service dependencies during registration. Services can declare their dependencies in their constructor, and the framework handles the rest.

:::tip

For detailed information on using the current dependency injection features, including practical examples and best practices, see the [Dependency Injection](./07_dependency-injection.md) guide.

:::

The planned enhancement to dependency injection is focused on **automatic service ordering** - eliminating the need for developers to manually arrange services in the correct registration order. Currently, services with dependencies must be registered after their dependencies in the configuration. The enhancement will analyze the dependency graph and automatically determine the optimal registration order, making configuration simpler and preventing ordering errors.

:::tip

For any other required features, please log requests on the [Service Framework repository](https://github.com/realitycollective/com.realitycollective.service-framework/issues).

:::

## More information

for more information on the Service Framework, check out these additional links:

* [Introduction](./01_introduction.md)
* [Creating your first service](./02_getting_started.md)
* [Service design](./03_service_design.md)
* [Advanced services and sub services (data modules)](./04_advanced_services.md)
* [Service Patterns and implementations](./05_service_patterns.md)
* [Scene based service loading](./06_scene_based_service_manager.md)
* [Dependency Injection](./07_dependency-injection.md)
* [Platform System](/docs/features/platform_system.md)
