---
sidebar_position: 2
---

# Service Framework - Getting Started guide

***Last updated - 21st May 2022***

## Overview

Getting started with the Service Framework and creating your first service should be the simplest task you can complete, the harder part is discovering what kind of services are useful to your project and how best to plan for them.  The Service Framework has many advanced capabilities to handle most situations, however, let us get started with the basics and walk you through everything.

This is what this article will cover:

* [Installing the Service Framework](#installing-the-service-framework)
* [Adding the Service Manager Instance](#adding-the-service-manager-instance)
* [Creating the root configuration for the Service Manager](#creating-the-root-configuration-for-the-service-manager)
* [Using the Service Generator](#using-the-service-generator)
* [Configuring your service](#configuring-your-service)
* [Accessing your service](#accessing-your-service)

Time to begin.

## Installing the Service Framework

There are several different paths to install the Service Framework, which you choose will depend on how you prefer to access dependencies in your project:

### Open UPM CLI

The simplest way too install the Service Framework is using the [OpenUPM CLI](https://github.com/openupm/openupm-cli) which is an installable NPM package that will automatically download and register packages hosted on OpenUPM in to your Unity project.

> This method does require npm (node package manager) to be installed on your machine, [for more details see here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

Once Installed, simply open a command window/terminal in your Unity project (at its root) and use the OpenUPM CLI Command:

```text
    openupm add com.realitytoolkit.service-framework
```

Once complete, you can open your Unity project and the Service Framework and any dependencies will be automatically registered in your project.

### Unity Package Manager - manual

Alternatively, you can register the scoped registry for the Service Framework manually in the [Unity Package Manager](https://docs.unity3d.com/Manual/Packages.html) in the editor.

- First, open up the [Scoped Registry interface](https://docs.unity3d.com/Manual/upm-scoped.html) in the Unity editor and add a new entry in the Scoped Registry list:

```text
    (Editor -> Edit -> Project Settings -> Scoped Registries)
```

- Next, Enter the following details in to the window to the right:

```text
    name: Service Framework
    url: https://package.openupm.com
    scopes: com.realitytoolkit.service-framework
```

Once entered, click the "+" button to add and save the registry.

- Finally, Open the Unity Package Manager, in the top-left most drop down, select "My Registries" and then select and click install on the Service Framework entry to download and register the service framework and its dependencies in your project.

///Image

## Adding the Service Manager Instance

The Service Manager Instance is the ONLY MonoBehaviour GameObject that needs to be in a scene to operate any/all services that are registered with it, this ensures that all the events raised by Unity can be properly propagated (sent to) all the services.

> There is an additional pattern available whereby the Service Framework can be integrated with your own functionality, not requiring the additional GameObject, essentially providing the Service Framework as a property in your own code.  see the [Service Patterns and implementations](serviceframework_05_service_patterns.md) for more information.

1. To begin, simply create an Empty GameObject (*Editor -> GameObject -> Create Empty*) and call it the "Service Manager Instance"

///Image

2. Then simply add the "Service Manager Instance" component by selecting the GameObject created in the previous step and clicking on "Add component" in the inspector and searching for the "Service Manager Instance".

By default you will receive an information box telling you that you do not have any root configuration for the Service Framework available.  The next section will walk you through creating it.

> If you already have Service Framework configuration in your project, the editor will bring up a new window to select it if you have more than one.  If you only have one, it will automatically be applied to your new Service Manager Instance.

Now that the Service Manager is in your scene, you can select it to see its current configuration.  By default, no configuration is supplied and you will need to create your own configuration for it.

## Creating the root configuration for the Service Manager

The simplest way to create your first new Root configuration for the Service Framework is to select the "***+***" symbol on the "**Reality Toolkit configuration Profile**" field in the inspector with the "Service Manager Instance" selected.

This will automatically create you a new configuration file called "**ServiceProvidersProfile**" in the root of your assets folder.  Feel free to move this wherever you like in your assets folder as it will remain references to the instance of the Service Framework.

Alternatively, you can create it manually in the Project window by "*right-clicking*" and selecting "***Reality Toolkit -> Service Manager -> Service Providers Profile***", which will create the new profile in the folder you are currently viewing.  You will then need to manually assign this profile to the Service Manager by dragging and dropping it in to the "Reality Toolkit configuration Profile" field in the inspector.

> Also available through the "Assets" menu in the editor under the same path mentioned above.

Once configured, the Service Framework is ready to receive the services you create and get them running.

## Using the Service Generator

## Configuring your service

## Accessing your service

## More information

for more information on the Service Framework, check out these additional links:

* [Introduction](serviceframework_01_intro.md)
* [Service design](serviceframework_03_service_design.md)
* [Advanced services and sub services (data providers)](serviceframework_04_advanced_services.md)
* [Service Patterns and implementations](serviceframework_05_service_patterns.md)
* [Platform System](serviceframework_06_platform_system.md)
* [Roadmap](serviceframework_07_roadmap.md)
