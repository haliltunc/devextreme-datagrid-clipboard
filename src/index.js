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
            rowNumberColumnText: '#',
            showOperationInfo: true,
            ...options
        };

        // Initialize debug functions
        const createDebugger = (name, isError = false) => {
            return (...args) => {
                if (this.options.debug || isError) {
                    console[isError ? 'error' : 'log'](`[DataGridClipboard][${name}]`, ...args);
                }
            };
        };

        this.debug = createDebugger('debug');
        this.error = createDebugger('error', true);

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
     * @param {boolean} options.includeRowNumbers - Include row numbers in copied data
     * @param {string} options.rowNumberColumnText - Header text for row numbers column
     * @returns {void}
     */
    copy(options = {}) {
        const copyOptions = { ...this.options, ...options };

        try {
            this.debug('Starting copy operation');
            
            const rowKeys = this.getRowKeys(copyOptions);
            if (!rowKeys?.length) return;

            const { rows, columnCount } = this.getRowData(rowKeys, copyOptions);
            if (!rows?.length) return;

            const finalText = rows.map(row => row.join('\t')).join('\n');
            this.debug('Copying text:', finalText);
            this.copyToClipboard(finalText);
            
            const rowCount = rows.length - (copyOptions.includeHeaders ? 1 : 0);
            const previewRows = rows.slice(0, Math.min(3, rows.length));
            
            this.notify(
                `Copied (${rowCount} rows × ${columnCount} columns)`,
                this.createTablePreview(previewRows, {
                    hasHeaders: copyOptions.includeHeaders,
                    showTotal: rows.length > 3,
                    totalRows: rowCount
                }),
                'success',
                copyOptions
            );
        } catch (error) {
            this.error('Copy operation failed:', error);
            this.notify(
                'Copy operation failed',
                '',
                'error',
                copyOptions
            );
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
    paste(options = {}) {
        const pasteOptions = { ...this.options, ...options };

        navigator.clipboard.readText()
            .then(text => {
                const data = this.parseClipboardData(text);
                if (!data || !data.length) {
                    this.notify(
                        'No valid data found to paste',
                        '',
                        'error',
                        pasteOptions
                    );
                    return;
                }

                this.debug('Pasting data:', data);
                const title = `Pasted ${data.length} rows`;
                const showTotal = data.length > 3;
                const previewRows = data.slice(0, Math.min(3, data.length));

                const preview = this.createTablePreview(previewRows, {
                    hasHeaders: false,
                    showTotal,
                    totalRows: data.length
                });
                this.notify(
                    title,
                    preview,
                    'success',
                    pasteOptions
                );
            })
            .catch(err => {
                this.error('Clipboard read error:', err);
                this.notify(
                    'Paste operation failed',
                    '',
                    'error',
                    pasteOptions
                );
            });
    }

    parseClipboardData(text) {
        return text.split('\n').map(row => row.split('\t'));
    }

    copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (err) {
            document.body.removeChild(textarea);
            throw new Error('Failed to copy text to clipboard');
        }
    }

    /**
     * Creates a table preview in HTML format
     * @param {Array<Array>} rows - Array of row arrays
     * @param {Object} options - Preview options
     * @param {boolean} options.hasHeaders - Whether the first row is headers
     * @param {boolean} options.showTotal - Whether to show total row
     * @param {number} options.totalRows - Total number of rows
     * @returns {string} HTML table string
     * @private
     */
    createTablePreview(rows, { hasHeaders = false, showTotal = false, totalRows = 0 } = {}) {
        if (!rows?.length) return '';

        const dataRows = hasHeaders ? rows.slice(1) : rows;
        const headers = hasHeaders ? rows[0] : null;
        const truncateText = text => {
            text = String(text || '');
            return text.length > 15 ? text.substr(0, 15) + '...' : text;
        };

        const renderRow = (cells, tag = 'td') => 
            `<tr>${cells.map(cell => `<${tag}>${truncateText(cell)}</${tag}>`).join('')}</tr>`;

        const table = ['<table class="preview-table">'];
        
        if (headers) {
            table.push('<thead>', renderRow(headers, 'th'), '</thead>');
        }

        table.push(
            '<tbody>',
            ...dataRows.map(row => renderRow(row)),
            showTotal ? `<tr class="total-row"><td colspan="${(headers || dataRows[0]).length}">... Total ${totalRows} rows copied ...</td></tr>` : '',
            '</tbody>'
        );

        table.push('</table>');
        return table.join('');
    }

    /**
     * Shows a notification if showOperationInfo is enabled
     * @param {string} title - The title to show
     * @param {string} preview - The preview HTML
     * @param {string} type - The type of notification ('success', 'error', or 'warning')
     * @param {Object} options - The options object containing settings
     * @private
     */
    notify(title, preview = '', type = 'success', options = {}) {
        if (options.showOperationInfo && window.DevExpress) {
            const $toast = $('<div>').addClass('dx-clipboard-toast');
            
            $toast.dxToast({
                contentTemplate: () => {
                    const content = $('<div>').addClass('toast-content');
                    content.append($('<div>').addClass('toast-title').text(title));
                    
                    if (preview) {
                        content.append($('<div>').addClass('toast-preview').html(preview));
                    }
                    
                    return content;
                },
                type: type,
                displayTime: 3000,
                width: 'auto',
                height: 'auto',
                animation: {
                    show: { type: 'fade', duration: 300, from: 0, to: 1 },
                    hide: { type: 'fade', duration: 300, from: 1, to: 0 }
                }
            }).appendTo(document.body);

            $toast.dxToast('show');

            // Remove the element after animation
            setTimeout(() => {
                $toast.remove();
            }, 3500);
        }
    }

    /**
     * Gets row keys based on options
     * @private
     */
    getRowKeys(options) {
        if (options.rowKeys) {
            return options.rowKeys;
        }
        
        if (options.rowIndexes) {
            return options.rowIndexes
                .map(index => {
                    const row = this.dataGrid.getVisibleRows()[index];
                    return row ? row.key : null;
                })
                .filter(key => key !== null);
        }
        
        if (options.copyAllRows) {
            return this.dataGrid.getVisibleRows().map(row => row.key);
        }
        
        const selectedKeys = this.dataGrid.getSelectedRowKeys();
        if (!selectedKeys.length) {
            this.notify(
                'No rows selected to copy',
                '',
                'error',
                options
            );
            return null;
        }
        
        return selectedKeys;
    }

    /**
     * Gets row data based on row keys and options
     * @private
     */
    getRowData(rowKeys, options) {
        const columns = options.copyMode === 'data' 
            ? this.dataGrid.option('columns')
            : this.dataGrid.getVisibleColumns();

        const rows = [];
        if (options.includeHeaders) {
            const headers = columns.map(col => 
                options.copyMode === 'data' ? col.dataField : (col.caption || col.dataField)
            );
            if (options.includeRowNumbers) {
                headers.unshift(options.rowNumberColumnText);
            }
            rows.push(headers);
        }

        rowKeys.forEach((key, index) => {
            const rowIndex = this.dataGrid.getRowIndexByKey(key);
            if (rowIndex >= 0) {
                const values = columns.map(column => {
                    const value = this.dataGrid.cellValue(rowIndex, column.dataField);
                    
                    if (options.copyMode === 'display' && column.lookup) {
                        const lookupItem = column.lookup.dataSource.find(
                            item => item[column.lookup.valueExpr] === value
                        );
                        return lookupItem ? lookupItem[column.lookup.displayExpr] : '';
                    }
                    
                    return value ?? '';
                });

                if (options.includeRowNumbers) {
                    values.unshift(rowIndex + 1);
                }

                rows.push(values);
            }
        });

        return {
            rows,
            columnCount: columns.length + (options.includeRowNumbers ? 1 : 0)
        };
    }

    // Debug helper methods
    destroy() {
        if (this.keyDownHandler) {
            this.dataGrid.off('keyDown', this.keyDownHandler);
        }
    }
}

// Add to global scope
window.DataGridClipboard = DataGridClipboard;
