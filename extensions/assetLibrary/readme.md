# What is the Package Library?

Much of modern software development relies on the ability to reuse and build upon existing code. Composer's Package Library feature allows you to find and install packages of pre-built features for use in your bots.

Installed packages will add new components to your bot. Features like additional customizable dialogs, LG templates, and custom actions are available for your bot to use, and for you to customize in Composer.

From the Package Library interface, you can view a list of currently available packages and choose to install them into the currently selected bot. It is also possible to add an unlisted package directly from the package registries by specifying it by name. Packages already installed can also be viewed, updated and removed.

To install and manage these packages, Composer uses the native package management tools and files available for supported programming languages - nuget for C# projects, and and npm for Javascript projects. Since installed packages add features to the bot and can contain programming language specific content, an ejected runtime is required.

# What are Packages?

Bot Framework components are the same type of software packages found on popular package registries like Nuget and NPM.  In fact, Composer uses these tools internally to host, install and manage packages.

Each package can contain one or more component parts for bots to use, including customizable dialogs, lg templates, and custom actions. When a package is installed, the assets it contains are copied into the project so they can be used by the bot, and customized in Composer. The source and version of each installed package is tracked so imported assets can be updated if a new version is released.

## What features are supported by Bot Framework Packages?

| Feature | Supported
|-- |--
| Pre-built Dialogs | Yes
| LG files | Yes
| Custom actions w/ schema | Partial support
| Middleware | Coming soon
| Adapters | Coming soon


## What happens when I add a package that contains dialogs?

When you add a package that contains dialog files, they will be copied into your bot. Using Composer, you can customize the content of these files. These files behave like any other dialog created in Composer. They are located in a special `imported/` subfolder.

However, any changes you make to these files will be lost or overwritten if you choose to remove or update the source package.

## What happens when I add a package that contains an LG files?

When you add a package that contains a "stand-alone" LG file, it will be copied into your bot -- but it will not appear in the "Bot Responses" interface. In order to use the newly imported file, you must write an import statement into the `common.lg` file.

For example, if a package contains an LG file called `grammar.lg`, it would be necessary to add the following line to `common.lg`. Once added, the rules contained in imported templates will be available throughout the bot, and will appear in the editor Intellisense autocomplete.

```
[import](grammar.lg)
```

## What happens when I add a custom action?

When you add a package that contains a custom action, it will be installed into the bot's runtime code, and JSON schema that describes the action will be merged into the bot's main schema file.

This will cause the new action to appear inside Composer's dialog editor for use inside dialogs.

However, in order for the bot application to perform these actions at runtime, additional steps are necessary. TBD!!!!!


# How to install packages

There are 2 ways to install a package into a bot: via the Package Library feature in Composer, or via command line tools. Both processes have the same outcome and compatible with one another, so it is ok to use the method best suited to your task.

## With the Package Library

In the main Package Library interface, there is a list of available packages broken into categories. Compatible packages can be installed into a bot by clicking the "Install" button.

If you know the name of a package you want to install, click the "+ Install Package" button at the top of the screen. Using the toolbar button, you can install any version of any package - not just those listed in the "Browse" section.

Since Composer supports multiple programming languages, make sure that the programming language selection matches that of your bot's ejected runtime. You can switch between the available languages to view available packages, but only those that are compatible with your runtime can be installed.

Composer may experience problems importing new packages - for example, a package may contain an incompatible or conflicting asset. If a problem occurs, Composer will ask for confirmation before taking any destructive action such as overwriting an existing file.

## From the command line

To install packages from the command line, use the normal package installation tool for your bot's programming language:

For example, with a Node runtime, navigate to the runtime folder and run:

```bash
cd runtime
npm install --save [some package]
```

And for a C# runtime, navigate to the runtime folder and run:

```bash
cd runtime/azurewebapp
dotnet add package [some package] --version=[some version]
```

After running one of these commands, the package will be listed in the appropriate place, either the `package.json` or the `.csproj` file of the project. Now, use the Bot Framework cli tool to extract any included dialog, lu and lg files, as well as to merge any new schema items.  Run the following command:

```
bf dialog:merge [package.json or .csproj] --import dialogs/imported --output schemas/sdk
```

The output of the cli tool will include a list of the files that were added, deleted or updated. Note that changes to existing files will be overwritten if newer versions are found in a package.

# How build your own packages

The packages used by Composer are native packages - the process of building one is the same as it would be for any software component published to NPM or Nuget.

However, the packages that we care about will contain one of more of the following elements:

* a .schema file describing an Adaptive $kind [LINK TO CUSTOM ACTIONS DOCS?]
* an `exported` folder containing one or more sets of dialog files
* an `exported` folder containing one or more sets of LG files

## How to package a custom action

1. <a href="https://docs.microsoft.com/en-us/composer/how-to-add-custom-action">Follow these steps</a> to create the code and schema for your custom action. Both the code and schema files are required to create the package.
2. Add any additional exported dialogs using the instructions below.

TODO: What else is necessary?
TODO: How can I bundle multiple actions in a single package

## How to package dialogs for re-use

To share dialogs you've created in Composer:

1. Open your bot project and find the `dialogs` folder. The files for each dialog are contained in a named sub-folder here.  Identify the dialogs you want to share.
2. Create a new folder with the name of your new package. For example, `cool-dialogs`
3. Inside this new folder, create a subfolder called `exported`.
4. Copy the dialogs you want to share from the original `dialogs` folder into the new `exported` folder.
5. Follow the instructions below to publish the package to nuget and/or npm.

## For Nuget

In the parent folder containing the `exported` folder, make sure there is a `.csproj` file with the name of the package that contains at least the following items. This will configure your project to be published as a nuget package containing the exported files.

Once configured, run `dotnet build`. This will create a file called `bin/Debug/MY_PROJECT.VERSION.nupkg`.  This is your package file! Next, <a href="https://docs.microsoft.com/en-us/nuget/nuget-org/publish-a-package">follow the instructions here to publish it to nuget.</a>

TODO: This should also declare its minimum SDK version right???
TODO: What else should go in this?  Keywords, homepage link,etc?

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <Description>MY PACKAGE DESCRIPTION</Description>
    <GeneratePackageOnBuild>true</GeneratePackageOnBuild>
    <Version>1.0.0</Version>
    <PackageReleaseNotes>MY RELEASE NOTES</PackageReleaseNotes>
    <Authors>MY NAME</Authors>
    <Company>MY COMPANY</Company>
    <Copyright>MY COPYRIGHT NOTICE</Copyright>
  </PropertyGroup>
  <ItemGroup>
    <Content Include="exported\**\*.*">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <PackageCopyToOutput>true</PackageCopyToOutput>
      <PackagePath>exported\$(AssemblyName)</PackagePath>
    </Content>
    <!-- Hide dependent project assets in UI. -->
    <None Update="exported\**\*.*" Visible="false" />
  </ItemGroup>
</Project>
```

## For NPM

In the parent folder containing the `exported` folder, make sure there is a `package.json` file. You can create one by running the command: `npm init`

<a href="https://docs.npmjs.com/creating-a-package-json-file">Follow these instructions</a> to customize the resulting package.json file to include an accurate description of your extension.

Then, when you are ready to publish it, <a href="https://docs.npmjs.com/cli/v6/commands/npm-publish">follow these instructions to publish it to npm.</a> This will create the package file and upload its to the npm registry.

TODO: This should also declare its minimum SDK version right???