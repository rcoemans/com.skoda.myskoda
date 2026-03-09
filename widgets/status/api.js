'use strict';

module.exports = {
  async getStatus({ homey, query }) {
    return {
      message: 'MySkoda widget is working!',
      timestamp: new Date().toLocaleString(),
    };
  },
};
