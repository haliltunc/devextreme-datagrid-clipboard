const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'dx-datagrid-clipboard.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'DataGridClipboard',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this'
  },
  externals: {
    'devextreme': {
      commonjs: 'devextreme',
      commonjs2: 'devextreme',
      amd: 'devextreme',
      root: 'DevExpress'
    }
  }
};
