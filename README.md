# Mediavibe Face Lora DataSet Manager

An Electron and React application for managing image datasets in grids for Lora training.

## Features

-   **Multiple Grid Layouts:** Organize images into predefined sections.
-   **Drag & Drop:** Easily add images to any tile by dragging them from your file explorer.
-   **Fullscreen Viewer:** Click on any image to view it in a fullscreen overlay.
-   **Project Naming:** Assign a name to your dataset project.
-   **Save & Load:** Save your project state (project name and image paths) to a JSON file and load it back later.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (which includes npm) installed on your system.

### Installation

1.  Clone the repository or download the source code.
2.  Open a terminal in the project's root directory.
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

There are two ways to run the application:

**1. Development Mode (with Hot-Reloading)**

This is recommended for development as it provides live updates when you change the code.

-   Open two separate terminals.
-   In the first terminal, start the Vite development server:
    ```bash
    npm run dev
    ```
-   In the second terminal, start the Electron application:
    ```bash
    npm run electron:start
    ```

**2. Production Mode**

This will build the application first and then run it.

```bash
npm start
```

## How to Use

1.  **Name Your Project:** Enter a name for your dataset in the "Project Name" field.
2.  **Add Images:** Drag image files from your computer and drop them onto the `+` tiles.
3.  **View Images:** Click on an image to see it in fullscreen. Click again to close the viewer.
4.  **Save Your Project:** Use the `File > Save Project` menu item or press `Ctrl+S` to save your current setup.
5.  **Load a Project:** Use the `File > Load Project` menu item or press `Ctrl+O` to load a previously saved `.json` file.

## Building for Production

To create a distributable package of the application, run the following command:

```bash
npm run build
```

This will create a `dist` folder with the built React app and a `dist-electron` folder with the compiled Electron main process code. You can then use a tool like `electron-builder` to package it for your desired platform.

## Building the Application with an Installer

To build the application for distribution, including an installer and app icon, follow these steps:

1. Ensure you have placed your `.ico` file in the `assets` directory (e.g., `assets/icon.ico`).
2. Run the following command in the terminal:

   ```bash
   npm run build; npx electron-builder --win
   ```

   This will:
   - Build the React application.
   - Compile the Electron main process.
   - Package the application into a distributable format for Windows, including an installer.

3. The output will be located in the `dist` directory.
