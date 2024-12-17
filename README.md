# devextreme-datagrid-clipboard - Clipboard Plugin

A powerful clipboard plugin for DevExtreme DataGrid that enhances data manipulation capabilities through copy and paste functionalities. Features customizable copy modes, header inclusion, selective/bulk row copying, and paste validation.

## Features

- Flexible copy modes (display/raw values)
- Optional header inclusion
- Selective or bulk row copying
- Customizable paste validation
- Error handling and data transformation
- Modern clipboard API integration

## Installation

    ```bash
    npm install devextreme-datagrid-clipboard
    
## Usage

    ```javascript
    // Initialize the plugin
    const clipboard = new DataGridClipboard(dataGridInstance, {
        copyMode: 'display',
        includeHeaders: true,
        copyAllRows: false,
        debug: true
    });

