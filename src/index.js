/**
 * DevExtreme DataGrid Clipboard Plugin
 * Enhanced copy/paste functionality for DevExtreme DataGrid
 * 
 * @author Halil Tunc <halil@haliltunc.com>
 * @website https://haliltunc.com
 * @license MIT
 */

;(function(window) {
    // Default English messages
    const defaultMessages = {
        copied: 'Copied ({rows} × {columns})',
        noRowsSelected: 'No rows selected to copy',
        noDataToPaste: 'No valid data found to paste',
        pasted: 'Pasted {rows} rows',
        copyFailed: 'Copy operation failed',
        pasteFailed: 'Paste operation failed',
        totalRows: '... Total {rows} rows copied ...'
    };

    // Global container for locales
    window.DataGridClipboardLocales = {
        en: defaultMessages
    };

    /**
     * DevExtreme DataGrid Clipboard Plugin
     * Adds clipboard functionality to DevExtreme DataGrid
     * 
     * @class DataGridClipboard
     * @param {Object} dataGrid - DevExtreme DataGrid instance
     * @param {Object} options - Plugin options
     * @param {string} options.copyMode - Copy mode ('display' or 'data')
     * @param {boolean} options.includeHeaders - Include column headers in copied data
     * @param {boolean} options.debug - Enable debug logging
     * @param {boolean} options.copyAllRows - Copy all rows instead of selected rows
     * @param {number[]} options.rowIndexes - Array of specific row indexes to copy
     * @param {Array} options.rowKeys - Array of specific row keys to copy
     * @param {boolean} options.includeRowNumbers - Include row numbers in copied data
     * @param {string} options.rowNumberColumnText - Header text for row numbers column (default: '#')
     * @param {boolean} options.showOperationInfo - Show operation notifications (default: true)
     * @param {boolean} options.showDataPreviewInOperationInfo - Show data preview in operation notifications (default: true)
     * @param {string} options.language - Language code for messages (default: 'en')
     */
    class DataGridClipboard {
        /**
         * Initialize the plugin
         * @private
         */
        constructor(dataGrid, options = {}) {
            this.dataGrid = dataGrid;
            this.options = {
                copyMode: 'display', // 'display' or 'data'
                includeHeaders: false,
                debug: false,
                copyAllRows: false,
                includeRowNumbers: false,
                rowNumberColumnText: '#',
                showOperationInfo: true,
                showDataPreviewInOperationInfo: true,
                language: 'en',
                ...options
            };

            // Get messages for current language
            this.messages = this.getMessages(this.options.language);

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

        /**
         * Get messages for specified language
         * @param {string} language - Language code
         * @returns {Object} Messages object
         * @private
         */
        getMessages(language) {
            return window.DataGridClipboardLocales[language] || window.DataGridClipboardLocales.en;
        }

        /**
         * Format message with parameters
         * @param {string} template - Message template
         * @param {Object} params - Parameters to replace in template
         * @returns {string} Formatted message
         * @private
         */
        formatMessage(template, params = {}) {
            return template.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? params[key] : match;
            });
        }

        /**
         * Set language for messages
         * @param {string} language - Language code
         */
        setLanguage(language) {
            this.options.language = language;
            this.messages = this.getMessages(language);
            this.debug('Language changed to:', language);
        }

        /**
         * Initialize the plugin
         * @private
         */
        init() {
            // Remove any existing event handlers
            this.destroy();
            // Attach new event handlers
            this.attachEvents();
        }

        /**
         * Attach event handlers to the DataGrid
         * @private
         */
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
         */
        async copy(options = {}) {
            const copyOptions = { ...this.options, ...options };

            try {
                this.debug('Starting copy operation');
                
                const rowKeys = this.getRowKeys(copyOptions);
                if (!rowKeys?.length) return;

                const { rows, columnCount } = await this.getRowData(rowKeys, copyOptions);
                if (!rows?.length) return;

                const finalText = rows.map(row => row.join('\t')).join('\n');
                this.debug('Copying text:', finalText);
                this.copyToClipboard(finalText);
                
                const rowCount = rows.length - (copyOptions.includeHeaders ? 1 : 0);
                const previewRows = rows.slice(0, Math.min(3, rows.length));
                
                this.notify(
                    this.formatMessage(this.messages.copied, { rows: rowCount, columns: columnCount }),
                    copyOptions.showDataPreviewInOperationInfo ? this.createTablePreview(previewRows, {
                        hasHeaders: copyOptions.includeHeaders,
                        showTotal: rows.length > 3,
                        totalRows: rowCount
                    }) : '',
                    'success',
                    copyOptions
                );
            } catch (error) {
                this.error('Copy operation failed:', error);
                this.notify(
                    this.messages.copyFailed,
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
         */
        copyRows(indexes, options = {}) {
            this.copy({ ...options, rowIndexes: indexes });
        }

        /**
         * Copy specific rows by their keys
         * @param {Array} keys - Array of row keys to copy
         * @param {Object} options - Additional copy options
         */
        copyRowsByKey(keys, options = {}) {
            this.copy({ ...options, rowKeys: keys });
        }

        /**
         * Process value for copy operation
         * @param {*} value - Value to process
         * @param {Object} column - Column configuration
         * @returns {Promise<*>} Processed value
         * @private
         */
        async processValue(value, column) {
            if (value === undefined || value === null) return '';

            // If column has lookup and copyMode is display, convert value to display value
            if (column.lookup && this.options.copyMode === 'display') {
                try {
                    const dataSource = column.lookup.dataSource;
                    let items;
                    
                    // If dataSource is a store
                    if (dataSource.store) {
                        items = await dataSource.store().getAll();
                    }
                    // If dataSource is an array
                    else if (Array.isArray(dataSource)) {
                        items = dataSource;
                    }
                    else {
                        return value;
                    }

                    // Find matching item in the items array
                    const lookupItem = items.find(
                        item => item[column.lookup.valueExpr] === value
                    );
                    return lookupItem ? lookupItem[column.lookup.displayExpr] : value;

                } catch (error) {
                    this.error('Lookup value processing failed:', error);
                    return value;
                }
            }

            return value;
        }

        /**
         * Gets row data based on row keys and options
         * @param {Array} rowKeys - Array of row keys
         * @param {Object} options - Copy options
         * @returns {Promise<Object>} Object containing rows and column count
         * @private
         */
        async getRowData(rowKeys, options) {
            const columns = (options.copyMode === 'data' 
                ? this.dataGrid.option('columns')
                : this.dataGrid.getVisibleColumns()
            ).filter(col => !col.command && col.type !== "selection")
             .sort((a, b) => (a.visibleIndex || 0) - (b.visibleIndex || 0));

            const rows = [];

            if (options.includeHeaders) {
                const headers = columns.map(col => 
                    options.copyMode === 'data' ? col.dataField : (col.caption || col.dataField)
                );
                if (options.includeRowNumbers) {
                    headers.unshift('#');
                }
                rows.push(headers);
            }

            for (const key of rowKeys) {
                const rowIndex = this.dataGrid.getRowIndexByKey(key);
                if (rowIndex >= 0) {
                    const rowValues = [];
                    for (const column of columns) {
                        const value = this.dataGrid.cellValue(rowIndex, column.dataField);
                        const processedValue = await this.processValue(value, column);
                        rowValues.push(processedValue);
                    }

                    if (options.includeRowNumbers) {
                        rowValues.unshift(rowIndex + 1);
                    }
                    rows.push(rowValues);
                }
            }

            return {
                rows,
                columnCount: columns.length + (options.includeRowNumbers ? 1 : 0)
            };
        }

        /**
         * Parse clipboard data into array format
         * @param {string} text - Text from clipboard
         * @returns {Array} Array of row data
         */
        parseClipboardData(text) {
            const result = text.split(/\r?\n/)
                .filter(line => line.trim())
                .map(line => line.split('\t'));
            
            // Debug: Log raw clipboard data
            this.debug('Raw clipboard text:', text);
            this.debug('Parsed clipboard data:', result);
            
            return result;
        }

        /**
         * Copy text to clipboard
         * @param {string} text - Text to copy
         * @returns {boolean} Success status
         * @private
         */
        copyToClipboard(text) {
            if (!text) return false;

            try {
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text);
                    return true;
                }

                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.cssText = 'position:fixed;pointer-events:none;opacity:0;';
                document.body.appendChild(textarea);
                textarea.select();
                
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return success;
            } catch (err) {
                this.error('Failed to copy text to clipboard:', err);
                return false;
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

            const truncateText = text => {
                text = String(text || '');
                return text.length > 15 ? text.substr(0, 15) + '...' : text;
            };

            const renderRow = (cells, tag = 'td') => cells
                .map(cell => `<${tag}>${truncateText(cell)}</${tag}>`)
                .join('');

            const table = ['<table class="preview-table">'];
            const dataRows = hasHeaders ? rows.slice(1) : rows;
            const headers = hasHeaders ? rows[0] : null;
            
            if (headers) {
                table.push('<thead>', `<tr>${renderRow(headers, 'th')}</tr>`, '</thead>');
            }

            table.push(
                '<tbody>',
                ...dataRows.map(row => `<tr>${renderRow(row)}</tr>`),
                showTotal ? `<tr class="total-row"><td colspan="${(headers || dataRows[0]).length}">${this.formatMessage(this.messages.totalRows, { rows: totalRows })}</td></tr>` : '',
                '</tbody>',
                '</table>'
            );

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

                setTimeout(() => {
                    $toast.remove();
                }, 3500);
            }
        }

        /**
         * Gets row keys based on options
         * @param {Object} options - Copy options
         * @returns {Array} Array of row keys
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
                    this.messages.noRowsSelected,
                    '',
                    'error',
                    options
                );
                return null;
            }
            
            return selectedKeys;
        }

        /**
         * Generate a GUID
         * @private
         * @returns {string} Generated GUID
         */
        generateGuid() {
            // Always start with 'a' to prevent numeric conversion
            return 'a' + 'xxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        /**
         * Process value for paste operation
         * @param {*} value - Value to process
         * @param {Object} column - Column configuration
         * @returns {Promise<*>} Processed value
         * @private
         */
        async processValueForPaste(value, column) {
            if (value === undefined || value === null || value === '') return '';

            // If column has lookup and copyMode is display, convert display value to actual value
            if (column.lookup && this.options.copyMode === 'display') {
                try {
                    const dataSource = column.lookup.dataSource;
                    let items;
                    
                    // If dataSource is a store
                    if (dataSource.store) {
                        items = await dataSource.store().getAll();
                    }
                    // If dataSource is an array
                    else if (Array.isArray(dataSource)) {
                        items = dataSource;
                    }
                    else {
                        return value;
                    }

                    // Find matching item in the items array
                    const lookupItem = items.find(
                        item => String(item[column.lookup.displayExpr]).toLowerCase() === String(value).toLowerCase()
                    );
                    return lookupItem ? lookupItem[column.lookup.valueExpr] : value;

                } catch (error) {
                    this.error('Lookup value processing failed:', error);
                    return value;
                }
            } else if (column.lookup && this.options.copyMode === 'data') {
                // If copyMode is data and value is numeric, convert to number
                return !isNaN(value) ? Number(value) : value;
            }

            return value;
        }

        /**
         * Paste data into the grid
         * @param {Object} options - Override default paste options
         */
        async paste(options = {}) {
            try {
                const text = await navigator.clipboard.readText();
                if (!text) {
                    this.notify(this.messages.noDataToPaste, '', 'warning', options);
                    return;
                }

                const data = this.parseClipboardData(text);
                if (!data || !data.length) {
                    this.notify(this.messages.noDataToPaste, '', 'warning', options);
                    return;
                }

                const keyField = this.dataGrid.option('keyExpr');
                const store = this.dataGrid.getDataSource().store();
                const allColumns = this.dataGrid.getVisibleColumns()
                    .filter(col => !col.command && col.type !== "selection")
                    .sort((a, b) => (a.visibleIndex || 0) - (b.visibleIndex || 0));

                const visibleColumns = allColumns.filter(col => col.visible !== false);

                // Debug: Log column info
                this.debug('All Columns:', allColumns.map(col => ({
                    dataField: col.dataField,
                    visibleIndex: col.visibleIndex,
                    caption: col.caption,
                    visible: col.visible,
                    lookup: col.lookup ? {
                        valueExpr: col.lookup.valueExpr,
                        displayExpr: col.lookup.displayExpr,
                        dataSource: col.lookup.dataSource ? 'present' : 'none'
                    } : undefined
                })));

                // Process each row
                for (const row of data) {
                    this.debug('Processing row:', row);

                    const newRow = {};

                    // Always set key field with GUID
                    if (keyField) {
                        newRow[keyField] = this.generateGuid();
                    }

                    // Process all columns first to handle async lookup operations
                    const processPromises = visibleColumns.map(async (column, index) => {
                        if (index < row.length && column.dataField !== keyField) {
                            const value = await this.processValueForPaste(row[index], column);
                            return { column, value };
                        }
                        return null;
                    });

                    // Wait for all lookup operations to complete
                    const results = await Promise.all(processPromises);

                    // Apply the processed values
                    results.forEach(result => {
                        if (result) {
                            newRow[result.column.dataField] = result.value;
                            this.debug(`Mapping column ${result.column.dataField}:`, {
                                columnField: result.column.dataField,
                                rawValue: row[visibleColumns.indexOf(result.column)],
                                processedValue: result.value
                            });
                        }
                    });

                    this.debug('Final mapped row:', newRow);

                    try {
                        await store.insert(newRow);
                    } catch (error) {
                        this.error('Row insert failed:', error, newRow);
                    }
                }

                // Refresh grid
                this.dataGrid.refresh();

                const preview = options.showDataPreviewInOperationInfo ? 
                    this.createTablePreview(data) : '';
                this.notify(
                    this.formatMessage(this.messages.pasted, { rows: data.length }),
                    preview,
                    'success',
                    options
                );

            } catch (error) {
                this.error('Paste failed:', error);
                this.notify(
                    this.messages.pasteFailed,
                    '',
                    'error',
                    options
                );
            }
        }

        /**
         * Clean up event handlers
         */
        destroy() {
            if (this.keyDownHandler) {
                this.dataGrid.off('keyDown', this.keyDownHandler);
            }
        }
    }

    /**
     * Add a new locale
     * @param {string} locale - Locale code (e.g., 'tr', 'es')
     * @param {Object} messages - Messages object
     */
    DataGridClipboard.addLocale = function(locale, messages) {
        if (typeof locale !== 'string' || typeof messages !== 'object') {
            throw new Error('Invalid locale or messages');
        }
        window.DataGridClipboardLocales[locale] = messages;
    };

    // Add to global scope
    window.DataGridClipboard = DataGridClipboard;
})(window);
