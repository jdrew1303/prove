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

import 'components/stats/style';

class Stats extends React.Component {
  static propTypes = {
    params: React.PropTypes.object
  };
  state = {
    data: null,
    waiting: false
  };
  onUpdate() {
    var splat = this.props.params.splat;
    SocketManager.emit('stats', {
      env: splat[0],
      entity: splat[1],
      type: 'stats'
    });
  };
  onStats = (data) => {
    this.onSocketUpdate = true;
    this.setState({
      data: data,
      waiting: false
    });
  };
  envChanged() {
    var curEnv = storage.get('env'),
      curEntity = storage.get('entity');

    window.location.hash = `${curEnv}/stats/${curEntity}`;
  }
  getChannelName(channel) {
    return channel.replace('queue:hits:', '').replace(':', ' ');
  }
  getGranName(gran) {
    return gran.replace('_', ' ');
  }
  getTotal(data) {
    var count = 0;
    _.each(data, function(item) {
      count += item[1];
    });
    return count;
  }
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
      splat = this.props.params.splat,
      env = splat[0],
      entity = splat[1];

    return (
      <div className={state.waiting ? 'waiting' : ''}>
        {state.data ? _.map(state.data, (channel, channelKey) => {
          return (
            <div key={channelKey}>
              <h2 className="charts_channel">
                {this.getChannelName(channelKey)}
              </h2>
              {_.map(channel, (gran, granKey) => {
                return (
                  <div key={granKey}>
                    <h3 className="charts_gran">
                      {this.getGranName(granKey)}
                    </h3>
                    <div className="chartsWrap">
                      {_.map(gran, (data, key) => {
                        return (
                          <div key={key}>
                            <div className="center">
                              {key}&nbsp;
                              ({this.getTotal(data)})
                            </div>
                            <div className="relative">
                              <Chart data={data} gran={granKey} type={key} />
                              <Link to={`/${env}/logs/${entity}/${key}/${granKey}`} className="blocker_waiting">
                                <Icon spin name="circle-o-notch" className="blocker_loader" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
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

export default Stats;
