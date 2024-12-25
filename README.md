# DevExtreme DataGrid Clipboard Plugin

A powerful clipboard plugin for DevExtreme DataGrid that enhances copy/paste functionality with support for lookup columns and store-based operations.

## Features

- Enhanced copy/paste functionality
- Support for lookup columns (both array and store-based)
- Support for store-based DataGrid
- Column reordering and chooser
- Debug mode for troubleshooting

## Installation

```bash
npm install devextreme-datagrid-clipboard
```

## Usage

```javascript
import DataGridClipboard from 'devextreme-datagrid-clipboard';

// Initialize your DevExtreme DataGrid
const grid = $("#gridContainer").dxDataGrid({
    // your grid configuration
}).dxDataGrid('instance');

// Initialize the clipboard plugin
const clipboard = new DataGridClipboard(grid, {
    // plugin configurations
});
```

## Examples

Check out the examples directory for various implementation scenarios:

1. Basic Usage (`index.html`)
2. Store-based Lookup Example (`store-lookup.html`)
3. Store-based Grid Example (`store-grid.html`)

## API Reference

### Configuration Options

```javascript
{
    copyMode: string,                 // 'selection' | 'all' - Copy mode
    includeHeaders: boolean,          // Include column headers in copied data
    copyAllRows: boolean,             // Copy all rows instead of selected
    includeRowNumbers: boolean,       // Include row numbers in copied data
    rowNumberColumnText: string,      // Text for row number column header
    showOperationInfo: boolean,       // Show operation info in toast
    showDataPreviewInOperationInfo: boolean, // Show data preview in operation info
    debug: boolean                    // Enable/disable debug mode
}
```

### Methods

- `copy()`: Copy selected rows to clipboard
- `paste()`: Paste clipboard data to grid

## Documentation

For detailed usage instructions and examples, please refer to the [docs](docs) directory.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Halil Tunc**
- Website: [haliltunc.com](https://haliltunc.com)
- Email: [halil@haliltunc.com](mailto:halil@haliltunc.com)
