'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import SocketManager from 'modules/socket';
import * as EventManager from 'modules/events';
import * as storage from 'modules/storage';
import { Link } from 'react-router';
import Chart from 'components/chart/code';
import Icon from 'react-fa';
import * as _ from 'underscore';

import 'components/dashboard/style';

class Dashboard extends React.Component {
  state = {
    data: null,
    charts: [
      'users:remove',
      'posts:remove',
      'images:upload',
      'video:convert',
      'gif:convert',
      'audio:convert'
    ],
    waiting: false
  };
  getChannelName(channel) {
    return channel.replace('queue:hits:', '').replace(':', ' ');
  }
  getEntityName(channel) {
    return channel.replace('queue:hits:', '').split(':')[0];
  }
  getTotal(data) {
    var count = 0;
    _.each(data, function(item) {
      count += item[1];
    });
    return count;
  }
  chartClickHandler() {
    storage.set('entity', this.entity);
  }
  envChanged() {
    window.location.hash = '/';
  }
  onStats = (data) => {
    this.onSocketUpdate = true;
    this.setState({
      data: data,
      waiting: false
    });
  };
  onUpdate() {
    var curEnv = storage.get('env');
    SocketManager.emit('stats', {
      env: curEnv,
      type: 'stats'
    });
  };
  componentWillReceiveProps() {
    this.setState({
      waiting: true
    });
  };
  componentDidUpdate() {
    if (this.onSocketUpdate) {
      this.onSocketUpdate = false;
    } else {
      this.onUpdate();
    }
  };
  componentDidMount() {
    SocketManager.on('stats', this.onStats);
    EventManager.on('envChanged', this.envChanged);
    this.onUpdate();
  }
  componentWillUnmount() {
    SocketManager.off('stats', this.onStats);
    EventManager.off('envChanged', this.envChanged);
  }
  render() {
    var state = this.state,
      curEnv = storage.get('env'),
      result = {};

    for (let i = 0, l = Math.ceil(state.charts.length / 3); i < l; i += 1) {
      result[i] = [];
    }

    var activeCell = 0,
      itemsInCell = 0;

    _.each(state.data, function(channelValue, channelKey) {
      _.each(state.charts, function(chart) {
        if (channelKey.indexOf(chart) !== -1) {
          itemsInCell += 1;
          result[activeCell].push({
            channel: channelKey,
            gran: 'last_hour',
            value: channelValue.last_hour.success
          });
          if (itemsInCell > 2) {
            itemsInCell = 0;
            activeCell += 1;
          }
        }
      });
    });

    return (
      <div className={state.waiting ? 'waiting' : ''}>
        {state.data ? _.map(result, (row, roId) => {
          return (
            <div key={roId} className="chartsWrap">
              {_.map(row, (chart, chartId) => {
                return (
                  <div key={chartId}>
                    <div className="dashboard-chart-name">
                      {this.getChannelName(chart.channel)} ({this.getTotal(chart.value)})
                    </div>
                    <div className="relative">
                      <Chart data={chart.value} gran={chart.gran} type="success" />
                      <Link to={`/${curEnv}/logs/${this.getEntityName(chart.channel)}/success/${chart.gran}`} onClick={this.chartClickHandler} entity={this.getEntityName(chart.channel)} className="blocker_waiting">
                        <Icon spin name="circle-o-notch" className="blocker_loader" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }) : <Icon spin name="circle-o-notch" className="statsLoading" />}
      </div>
    );
  }
}

export default Dashboard;
