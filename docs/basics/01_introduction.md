---
sidebar_position: 1
---

# Introduction

***Last updated - 21st May 2022***

The Service Framework built by the Reality Collective is a Service repository that can be used in Unity projects to address many of the issues facing developers while trying to build performant features and utilities.

Ultimately it services to solve some of the common use cases that cause Unity developers problems when architecting and managing their code.

> If you just want to get started, jump to the ["**Getting Started**"](02_getting_started.md) section here and read the history later.

## Why use a Service Framework?

In many cases, code is written and attached to MonoBehaviours in order to execute and run, this is perfectly fine where this code is to manage the state of a UX component as it operates in the project.  However, In may cases empty game objects are created to "just run" code or have access to certain Unity functions, in other cases repetitive use of static classes are implemented just so make code accessible, all of which can cause problems in the long run, such as:

* Finding code attached to GameObjects requires you to either know which object it is attached to or use expensive GameObject.Find techniques to locate them.  Granted, these references are then caches to avoid these performance drains, but usually many times throughout code.

* The state of an empty GameObject is not guaranteed, especially with scene reloads. In the worst cases where editor settings are also applied to these GameObjects, they can sometimes be corrupted by Unity reserializing the GameObject.

* Speed - Attaching a script to a MonoBehaviour requires that script to be managed by the full lifecycle of a GameObject, even if it is not rendering in to the scene.  In highly performant code, this can incur unwanted slowdowns across the whole project that are likely unintended. (granted, recent Burst and DOTS implementations are also working to address this)

* Static classes, while accessible, create issues regarding their state, especially in cases involving networking.  They generally solve one problem at the cost of others which normally require additional workarounds to resolve or take account of.

* You need to search through your scene for where the configured GameObjects live.  While granted, most developers make this clear by having well designed scene hierarchy structure, it requires all developers on a project to understand and be aware of the pattern used to manage these features.

All in all, many techniques are used by different developers on a multitude of projects which can create confusion and issues while trying to build your awesome Unity title.

## Enter the Service Framework

One of the best solutions to the problems faced by Unity developers in the areas highlighted above is to provide a "**single source of truth**" to access critical systems and/or features in your project.  We classify these components as **Services**, a Service being a single feature that is either required to continually run or be instantly accessible from any other area/scene in your running project.

The Service Framework at its core provides:

* A single stateful repository for features in a Unity project.
* Design-Time configuration for the runtime operation of components.
* Platform aware configuration, ensuring Services only run on the platforms they are configured for.
* Run-time registration and access to all services maintained by the Service Framework.
* Full access to the entire MonoBehaviour lifecycle for all running services
* A highly performant cycle, providing up to an 80% speed increase over using traditional MonoBehaviour attached scripts.

There are many more benefits available to developers utilizing the Service Framework, this are just the highlights.  To learn more, simply start creating your own services and see the benefits in your own projects.

## The Service Framework Platform System

In addition to the rest of the capabilities of the Service Framework, it also implements a powerful and extensible Platform System, this enabled the Service Framework to detect the currently running platform and which platform is currently being targeted by the Editor.

All the current Unity build platforms are included by default (all targets available in the Build Settings screen), however, additional platforms can be defined within your project or within additional UPM packages that will automatically be picked up and registered (so long as the Editor and your project can see them).

This then allows you to configure on which platforms your service should run, this is multi-selectable, so you can choose all platforms or just a selection.  You also create "Mock" services and have these only available in the editor if you so wish.

Check the [Platform System](./06_platform_system.md) section for more information.

## Services and SubServices (data providers) - Advanced

In addition to the core services you can create, it is also possible to create sub-services (also referred as data providers) which are connected to their parent core service.
This enables you to create a "Header" service to accept requests and then provide multiple implementations for that service, usually to support multiple platforms but can also be used as a collection of providers to obtain data from, such as:

* An asset service that can add providers that connect to google, sketchfab, Azure or wherever you can get assets from, all returned through the main parent service.
* A networking service that has different client implementations based on the running platform.
* A utility service that enables several functions that require to work differently based upon platform or different sets of conditions.

This capability is a bit more advanced advanced and potentially limitless.

For more information checkout the [Advanced services and sub services (data providers)](./04_advanced_services.md) section.

## Use Cases (and what is a Service anyway?)

The most common questions we get asked by developers investigating the use and implementation of the Service Framework are "What is a Service?" and "What would I use it for?".  To answer this, here are some examples of the kinds of Services that our community are building and running in their projects (including our sponsors).

---

### A "Settings" Service

A common pattern is to ensure there is a single "settings" configuration available to the entire project, providing anything from simple options to more complex features that require to be validated in each update loop.  In more complex scenarios, a settings service could also operate as a State manager, loading and unloading scenes based on which page / screen is required.

---

### An Asset loading service

When content needs to be loaded from a remote source, this usually requires lots of functionality to handle all the different uses cases for where the content is located and how it should be loaded.  In more complicated scenarios, [preprocessor directives](https://docs.unity3d.com/Manual/PlatformDependentCompilation.html) are required to handle content differently depending on which platform the content will be loaded and instantiated on.

With a single service, this can be managed in a central location, with separate service implementations for different platform if needed using a single Interface, so that running game code does not need to know where it is coming from.

---

### A Scene manager

A common pattern is to write a separate scene just to handle loading screens between different scenes, or shared code dropped in to each scene to manage the transition. (so long as the object is active and also hasn't been removed by accident)
A scene manager service can handle this centrally, taking control of what screens / menus and options are active at any time and only a quick service call away.  Also simplifying testing / operation of the feature.

There are many more advanced implementations possible, some of which are likely to be shared by Service Framework adopters and partners.
(The RealityToolkit is currently updated to make use of this framework, decoupling its original implementation for all its core )

---

## More information

for more information on the Service Framework, check out these additional links:

* [Creating your first service](./02_getting_started.md)
* [Service design](./03_service_design.md)
* [Advanced services and sub services (data providers)](./04_advanced_services.md)
* [Service Patterns and implementations](./05_service_patterns.md)
* [Platform System](./06_platform_system.md)
* [Roadmap](./07_roadmap.md)
