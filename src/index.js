/**
 * DevExtreme DataGrid Clipboard Plugin
 * Adds clipboard functionality to DevExtreme DataGrid
 */

class DataGridClipboard {
    constructor(dataGrid, options = {}) {
        this.dataGrid = dataGrid;
        this.options = {
            copyMode: 'display',
            includeHeaders: false,
            debug: false,
            copyAllRows: false,
            includeRowNumbers: false,
            ...options
        };
        this.debug('Plugin initialized with options:', this.options);
        this.init();
    }

    init() {
        // Remove any existing event handlers
        this.destroy();
        // Attach new event handlers
        this.attachEvents();
    }

    attachEvents() {
        this.keyDownHandler = (e) => {
            const isCopy = (e.event.ctrlKey || e.event.metaKey) && e.event.keyCode === 67;
            const isPaste = (e.event.ctrlKey || e.event.metaKey) && e.event.keyCode === 86;

            if (isCopy || isPaste) {
                e.event.preventDefault();
                e.event.stopPropagation();
                e.event.stopImmediatePropagation();

                if (isCopy) {
                    this.copy();
                } else {
                    this.paste();
                }
            }
        };

        this.dataGrid.on('keyDown', this.keyDownHandler);
    }

    /**
     * Copy data from the grid
     * @param {Object} options - Override default copy options
     * @param {string} options.copyMode - Copy mode ('display' or 'data')
     * @param {boolean} options.includeHeaders - Include column headers in copied data
     * @param {boolean} options.copyAllRows - Copy all rows instead of selected rows
     * @param {number[]} options.rowIndexes - Array of specific row indexes to copy
     * @param {Array} options.rowKeys - Array of specific row keys to copy
     * @returns {void}
     */
    copy(options = {}) {
        // Create copy options by merging defaults with provided options
        const copyOptions = { ...this.options, ...options };
    
        try {
            this.debug('Starting copy operation');
            
            let rowKeys;
            if (copyOptions.rowKeys) {
                rowKeys = copyOptions.rowKeys;
            } else if (copyOptions.rowIndexes) {
                rowKeys = copyOptions.rowIndexes.map(index => {
                    const row = this.dataGrid.getVisibleRows()[index];
                    return row ? row.key : null;
                }).filter(key => key !== null);
            } else if (copyOptions.copyAllRows) {
                rowKeys = this.dataGrid.getVisibleRows().map(row => row.key);
            } else {
                rowKeys = this.dataGrid.getSelectedRowKeys();
                if (!rowKeys.length) {
                    this.debug('No rows selected');
                    return;
                }
            }
    
            if (!rowKeys.length) {
                this.debug('No valid rows to copy');
                return;
            }
    
            const rows = [];
            const columns = copyOptions.copyMode === 'data' 
                ? this.dataGrid.option('columns')
                : this.dataGrid.getVisibleColumns();
    
            if (copyOptions.includeHeaders === true) {
                const headers = columns.map(col => 
                    copyOptions.copyMode === 'data' ? col.dataField : (col.caption || col.dataField)
                );
                if (copyOptions.includeRowNumbers) {
                    headers.unshift('#');
                }
                this.debug('Headers:', headers);
                rows.push(headers.join('\t'));
            }
    
            rowKeys.forEach((key, index) => {
                const rowIndex = this.dataGrid.getRowIndexByKey(key);
                if (rowIndex >= 0) {
                    const values = columns.map(column => {
                        const value = this.dataGrid.cellValue(rowIndex, column.dataField);
                        
                        if (copyOptions.copyMode === 'display' && column.lookup) {
                            const lookupItem = column.lookup.dataSource.find(
                                item => item[column.lookup.valueExpr] === value
                            );
                            return lookupItem ? lookupItem[column.lookup.displayExpr] : '';
                        }
                        
                        return value !== undefined && value !== null ? value : '';
                    });

                    if (copyOptions.includeRowNumbers) {
                        values.unshift(index + 1);
                    }

                    rows.push(values.join('\t'));
                }
            });
    
            if (rows.length > 0) {
                const finalText = rows.join('\n');
                this.debug('Copying text:', finalText);
                this.copyToClipboard(finalText);
            }
        } catch (error) {
            this.error('Copy operation failed:', error);
        }
    }

    /**
     * Copy specific rows by their indexes
     * @param {number[]} indexes - Array of row indexes to copy
     * @param {Object} options - Additional copy options
     * @returns {void}
     */
    copyRows(indexes, options = {}) {
        this.copy({ ...options, rowIndexes: indexes });
    }

    /**
     * Copy specific rows by their keys
     * @param {Array} keys - Array of row keys to copy
     * @param {Object} options - Additional copy options
     * @returns {void}
     */
    copyRowsByKey(keys, options = {}) {
        this.copy({ ...options, rowKeys: keys });
    }

    /**
     * Paste data into the grid
     * @returns {void}
     */
    paste() {
        navigator.clipboard.readText()
            .then(text => {
                const data = this.parseClipboardData(text);
                // Paste operation will be implemented here
            })
            .catch(err => {
                this.error('Clipboard read error:', err);
            });
    }

    parseClipboardData(text) {
        return text.split('\n').map(row => row.split('\t'));
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .catch(err => {
                this.error('Clipboard write error:', err);
            });
    }

    // Debug helper methods
    debug(...args) {
        if (this.options.debug) {
            console.log('[DataGridClipboard]', ...args);
        }
    }

    error(...args) {
        // Error logs should always be displayed
        console.error('[DataGridClipboard]', ...args);
    }

    destroy() {
        if (this.keyDownHandler) {
            this.dataGrid.off('keyDown', this.keyDownHandler);
        }
    }
}

// Add to global scope
window.DataGridClipboard = DataGridClipboard;
