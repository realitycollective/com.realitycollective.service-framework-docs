---
sidebar_position: 5
---

# Service Implementation patterns

***Last updated - 27th February 2024***

## Overview

This article will highlight some of the most common patterns used in service design / delivery, as used by the Reality Collective and its sponsors.

This is what this article will cover:

* [Single Service](#single-service)
* [Cooperative Services](#cooperative-services)
* [Service Providers Model](#service-providers-model)
* [Module Driven Design](#module-driven-design)
* [Managed Service](#managed-service)
* [Tips and tricks](#tips-and-tricks)

Time to begin.

---

## Single Service

<br/>

![Single Service](./images/05_01_SingleService.png)

The most common and simple service, a singular entity that enables a single capability or operation, for example:

* A Settings Service - managing a central repository of runtime settings for an application

* Menu Service - controlling screen / ui flow for an application, including managing state.

---

## Cooperative Services

<br/>

![Cooperative Service](./images/05_02_CooperativeServices.png)

In some scenarios, it is common for two services to be interlinked, each providing a distinct service / operation particular to that service, yet dependent on another service to provide "common" functionality.

Depending on how the connectivity is maintained, care must be taken to ensure the services are registered in the correct order.  However, you can also utilise Scriptable Objects as configurable assets to provide weak references between services.

The simplest solution is that Service 2, on initialisation or later, will call "```GetService<IService1>```" to gain a reference and utilise Service 1 during its operation.

---

## Service Providers Model

<br/>

![Service Providers Model](./images/05_03_ServiceProviderPattern.png)

By default, when Services and their modules are registered, they are all accessible via the Service Framework, allowing instant access to either through a "```GetService<IService>```" call.  The registration flow is as follows:

1. Services are read through configuration and registered with the Service Framework
2. Service Modules contained within the Service configuration are initialised by the service
3. The modules then also Registered with the Service Framework (enabling the Service Framework to manage all entities)
4. The primary method for accessing the service is via calling "```GetService<IService>```"

This is the pattern enabled for services by default.  Primarily it is recognised that the majority of the calls will be direct to the service, as the responsible party, it is still possible to use "```GetService<IServiceModule>```" when required.

> Alternatively, see the [Managed Service](#managed-service) design where you can manage modules only from within a service.

---

## Module Driven Design

<br/>

![Module Driven Design](./images/05_04_ModuleDrivenDesign.png)

Another pattern which is widely used (such as in the Leaderboard examples) whereby the Modules are the primary driver for access to the Services resources, with the Service itself mainly providing common functionality (such as authentication) for all the modules.

Similar to the [Service Providers Model](#service-providers-model), with the exception that only "```GetService<IServiceModule>```" is used to talk directly to the module that is required for an operation (e.g. a specific Leaderboard)

---

## Managed Service

<br/>#

![Managed Service](./images/05_05_ManagedService.png)

With the [Service Providers Model](#service-providers-model), both Service and Module are always accessible, however, there are circumstances where you would want to limit access to the Modules managed by the service.

By adding the following override to a service:

```csharp
public override bool RegisterServiceModules => false;
```

This prevents registration of the Services Modules with the Service Framework, which gives much more control over the number and type of modules the services manage and in how they are constructed (whilst still retaining the benefits if so required).

This has been used to great effect in:

* Asset Loading services, to intercept Asset requests and perform different operations based on the type of asset received, handled by distinct handlers.
* Interaction Managers, to receive commands for operations to be performed in a scene, each then delegated to the modules currently registered with the service. (changeable at runtime).

---

## Tips and tricks

* There is no ONE path, you can mix and match how your services operate to meet the needs of your project.
* While services can be "configured" at design time, they can also be registered in code at runtime if you wish using "```TryRegisterService<T>```" && "```TryRegisterServiceModule<T>```".
* Services and Modules can be activated / deactivated at anytime, they will always be known by the Service Framework and cannot "disappear" (unlike with Unity GameObjects/Components). Unless you unregister them at Runtime.
* Use the [Platform System](/docs/features/platform_system.md) to its fullest extent, as required and do not be afraid to create duplicates of services with different modules configured against different platforms.  But you can also configure Platforms for modules, so pick and choose.
* **REMEMBER**, a Service Interface or Module Interface, when registered with the Service Framework can **ONLY BE REGISTERED ONCE** else you will get a "Service Already Registered" error.  There can only be one.

---

## More information

for more information on the Service Framework, check out these additional links:

* [Introduction](./01_introduction.md)
* [Creating your first service](./02_getting_started.md)
* [Service design](./03_service_design.md)
* [Advanced services and sub services (data modules)](./04_advanced_services.md)
* [Scene based service loading](./06_scene_based_service_manager.md)
* [Platform System](/docs/features/platform_system.md)
* [Roadmap](./07_roadmap.md)
