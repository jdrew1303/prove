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
      entity: splat,
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
    this.onUpdate();
  }
  componentWillUnmount() {
    SocketManager.off('stats', this.onStats);
  }
  render() {
    var state = this.state,
      splat = this.props.params.splat,
      entity = splat;

    return (
      <div className={state.waiting ? 'waiting' : ''}>
        {state.data ? _.map(state.data, (channel, channelKey) => {
          var entityAction = channelKey.match(/[^:]+$/)[0];
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
                              <Link to={`/logs/${entity}/${entityAction}/${key}/${granKey}`} className="blocker_waiting">
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
