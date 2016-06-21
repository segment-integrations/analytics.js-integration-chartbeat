'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var extend = require('@ndhoule/extend');
var integration = require('@segment/analytics.js-integration');
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var Chartbeat = require('../lib/');

describe('Chartbeat', function() {
  var analytics;
  var chartbeat;
  var options = {
    uid: 'x',
    domain: 'example.com',
    video: false
  };

  beforeEach(function() {
    analytics = new Analytics();
    chartbeat = new Chartbeat(options);
    analytics.use(Chartbeat);
    analytics.use(tester);
    analytics.add(chartbeat);
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    chartbeat.reset();
    sandbox();
  });

  it('should have the right settings', function() {
    analytics.compare(Chartbeat, integration('Chartbeat')
      .assumesPageview()
      .global('_sf_async_config')
      .global('_sf_endpt')
      .global('pSUPERFLY')
      .option('domain', '')
      .option('uid', null));
  });

  describe('before loading', function() {
    beforeEach(function() {
      analytics.stub(chartbeat, 'load');
    });

    afterEach(function() {
      chartbeat.reset();
    });

    describe('#initialize', function() {
      it('should create window._sf_async_config', function() {
        var expected = extend({}, {
          uid: options.uid,
          domain: options.domain
        }, {
          useCanonical: true
        });
        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._sf_async_config, expected);
      });

      it('should inherit global window._sf_async_config defaults', function() {
        window._sf_async_config = { setting: true };
        var expected = extend({}, { uid: options.uid, domain: options.domain }, {
          setting: true,
          useCanonical: true
        });

        analytics.initialize();
        analytics.page();
        analytics.deepEqual(window._sf_async_config, expected);
      });

      it('should create window._sf_endpt', function() {
        analytics.assert(!window._sf_endpt);
        analytics.initialize();
        analytics.page();
        analytics.equal('number', typeof window._sf_endpt);
      });

      it('should call #load', function() {
        analytics.initialize();
        analytics.page();
        analytics.called(chartbeat.load);
      });
    });
  });

  describe('loading', function() {
    it('should load', function(done) {
      analytics.load(chartbeat, done);
    });

    it('should load regular lib when video is false', function() {
      analytics.spy(chartbeat, 'load');
      analytics.initialize();
      analytics.page();
      analytics.loaded('<script src="http://static.chartbeat.com/js/chartbeat.js">');
    });

    it('should load video lib when selected', function() {
      chartbeat.options.video = true;
      analytics.spy(chartbeat, 'load');
      analytics.initialize();
      analytics.page();
      analytics.loaded('<script src="http://static.chartbeat.com/js/chartbeat_video.js">');
    });
  });

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
      analytics.page();
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window.pSUPERFLY, 'virtualPage');
      });

      it('should send a path and title', function() {
        analytics.page({ path: '/path', title: 'title' });
        analytics.called(window.pSUPERFLY.virtualPage, '/path', 'title');
      });

      it('should prefer a name', function() {
        analytics.page('Name', { path: '/path', title: 'title' });
        analytics.called(window.pSUPERFLY.virtualPage, '/path', 'Name');
      });

      it('should prefer a name and category', function() {
        analytics.page('Category', 'Name', { path: '/path', title: 'title' });
        analytics.called(window.pSUPERFLY.virtualPage, '/path', 'Category Name');
      });

      it('should set the sections on the config', function() {
        analytics.page('Category', 'Name', { path: '/path', title: 'title', author: 'Apple Potamus' });
        analytics.equal('Category', window._sf_async_config.sections);
        analytics.equal('Apple Potamus', window._sf_async_config.authors);
        analytics.called(window.pSUPERFLY.virtualPage, '/path', 'Category Name');
      });
    });
  });
});
