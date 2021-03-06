'use strict';

var Insteon = require('../').Insteon;
var should = require('should');
var Plan = require('../lib/Test/Plan');
var mockHub = require('../lib/Test/mockHub');

var host = '127.0.0.1';
var port = 9761;

describe('Garage Door opener', function () {
  this.timeout(5000);

  before(function (done) {
    mockHub.listen(port, host, function () {
      done();
    });
  });

  it('gets status', function (done) {
    var gw = new Insteon();

    mockHub.mockData = {
      '0262aabbcc0f1901':
      [
        '0262aabbcc0f190106',
        '0250aabbcc1122332b0201'
      ]
    };

    gw.connect(host, function () {
      gw.garage('aabbcc')
        .status()
        .then(function (status) {
          should.exist(status);
          status.should.equal('closed');
          done();
        });
    });
  });

  it('fails to get status', function (done) {
    var gw = new Insteon();

    mockHub.mockData = {
      '0262aabbcc0f1901': '0262aabbcc0f190115'
    };

    gw.connect(host, function () {
      gw.garage('aabbcc')
        .status()
        .then(function (status) {
          should.not.exist(status);
          done();
        });
    });
  });

  it('tests lockout period', function (done) {
    this.slow(5000);

    var gw = new Insteon();
    var plan = new Plan(3, done);

    mockHub.mockData = [
      {
        '0262aabbcc0f1901': ['0262aabbcc0f190106', '0250aabbcc1122332b0201']
      },
      {
        '0262aabbcc0f11ff': ['0262aabbcc0f11ff06', '0250aabbcc1122332b11ff']
      },
      {
        '0262aabbcc0f1901': ['0262aabbcc0f190106', '0250aabbcc1122332b0200']
      },
      {
        '0262aabbcc0f11ff': ['0262aabbcc0f11ff06', '0250aabbcc1122332b11ff']
      }
    ];

    gw.connect(host, function () {
      var g = gw.garage('aabbcc');

      // for this test's purposes reduce lockout time
      g.LOCKOUT_TIME = 2000;

      g.open()
        .then(function (status) {
          should.exist(status);
          status.should.equal(true);
          plan.ok();

          setTimeout(function () {
            g.close()
              .then(function (status) {
                should.exist(status);
                status.should.equal(true);
                plan.ok();
              });
          }, 2500);
        });

      g.open()
        .then(function (status) {
          should.exist(status);
          status.should.equal(false);
          plan.ok();
        });
    });
  });

  it('tests wrong state/action combination', function (done) {
    var gw = new Insteon();

    mockHub.mockData = [
      {
        '0262aabbcc0f1901': ['0262aabbcc0f190106', '0250aabbcc1122332b0201']
      },
      {
        '0262aabbcc0f11ff': ['0262aabbcc0f11ff06', '0250aabbcc1122332b11ff']
      }
    ];

    gw.connect(host, function () {
      var g = gw.garage('aabbcc');

      g.close()
        .then(function (status) {
          should.exist(status);
          status.should.equal(false);
          done();
        });
    });
  });

  it('cancels pending', function (done) {
    var gw = new Insteon();

    gw.connect(host, function () {
      var g = gw.garage('aabbcc');
      var plan = new Plan(2, done);

      mockHub.mockData = { '0262aabbcc0f1901': '' };

      g.status()
        .then(function (status) {
          should.exist(status);
          status.should.equal('closed');
          plan.ok();
        });

      g.close()
        .then(function () {
          throw new Error('This command should have been canceled.');
        });

      g.cancelPending();

      setTimeout(function () {
        mockHub.send(['0262aabbcc0f190106', '0250aabbcc1122332b0201'], function () {
          plan.ok();
        });
      }, 10);
    });
  });
});

