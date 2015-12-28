'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import SocketManager from 'modules/socket';
import * as EventManager from 'modules/events';
import * as storage from 'modules/storage';
import Pager from 'components/pager/code';
import * as _ from 'underscore';

import 'components/logs/style';

class Logs extends React.Component {
  static propTypes = {
    params: React.PropTypes.object
  };
  state = {
    data: null
  };
  normalizeTime(time) {
    if (time < 10) {
      time = `0${time}`;
    }
    return time;
  }
  getLogTime(d) {
    d = new Date(d);
    var normalize = this.normalizeTime,
      day = normalize(d.getUTCDate()),
      month = normalize(d.getUTCMonth()),
      year = normalize(d.getUTCFullYear()),
      hour = normalize(d.getUTCHours()),
      minutes = normalize(d.getUTCMinutes()),
      seconds = normalize(d.getUTCSeconds());

    return `${day}-${month}-${year} ${hour}:${minutes}:${seconds}`;
  }
  onUpdate = () => {
    var splat = this.props.params.splat,
      page = window.location.hash.replace(/^.+page=(\d+).+$/, '$1');

    SocketManager.emit('logs', {
      env: splat[0],
      entity: splat[1],
      stage: splat[2],
      gran: splat[3],
      page: Number(page) || 1
    });
  };
  onLogs = (data) => {
    this.onSocketUpdate = true;
    this.setState({
      data: data
    });
  };
  envChanged = () => {
    var splat = this.props.params.splat,
      curEnv = storage.get('env'),
      curEntity = storage.get('entity');

    window.location.hash = `${curEnv}/logs/${curEntity}/${splat[2]}/${splat[3]}`;
  };
  componentDidUpdate = () => {
    if (this.onSocketUpdate) {
      this.onSocketUpdate = false;
    } else {
      this.onUpdate();
    }
  };
  componentDidMount() {
    SocketManager.on('logs', this.onLogs);
    EventManager.on('envChanged', this.envChanged);
    this.onUpdate();
  }
  componentWillUnmount() {
    SocketManager.off('logs', this.onLogs);
    EventManager.off('envChanged', this.envChanged);
  }
  render() {
    var state = this.state,
      items = state.data && state.data.items;

    return (
      <div>
        <h1>Logs</h1>
        <table className="logs_list">
          <thead>
          <tr>
            <th className="left">Type</th>
            <th className="left">Entity ID</th>
            <th className="left">Message</th>
            <th className="left">Worker</th>
            <th className="right">Date</th>
          </tr>
          </thead>
          {items ? _.map(items, (item, key) => {
            return (
              <tbody key={key} className={item.type}>
              <tr>
                <td>{item.type}</td>
                <td>{item.entity_id}</td>
                <td>{item.message}</td>
                <td>{item.worker}</td>
                <td className="right">{this.getLogTime(item.cdate)}</td>
              </tr>
              </tbody>
            );
          }) : null}
        </table>
        <Pager data={state.data}  />
      </div>
    );
  }
}

export default Logs;
