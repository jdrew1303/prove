'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Link } from 'react-router';
import * as storage from 'modules/storage';
import * as EventManager from 'modules/events';
import * as _ from 'underscore';

import 'components/navbar/style';

class Navbar extends React.Component {
  state = {
    env: storage.get('env') || 'dev',
    envs: [
      'dev',
      'prod'
    ],
    entities: [
      'users',
      'posts',
      'video',
      'images',
      'tags',
      'comments'
    ]
  };
  entitySelectHandler() {
    storage.set('entity', this.children);
  }
  envSelectHandler = (e) => {
    var target = e.target;
    if (target.tagName === 'LI') {
      storage.set('env', target.innerHTML);
      this.setState({
        env: target.innerHTML
      });
      EventManager.emit('envChanged');
    }
  };
  componentDidMount() {
    var curEnv = storage.get('env');
    if (!curEnv) {
      storage.set('env', 'dev');
    }
  }
  render() {
    var state = this.state,
      location = window.location.hash,
      curEntity = storage.get('entity'),
      curEnv = state.env,
      isIndexPage = /^#\/\?.+$/.test(location);

    return (
      <nav className="navbar">
        <ul id="navbar-env" onClick={this.envSelectHandler}>
          {_.map(state.envs, (env) => {
            return (
              <li key={env} className={env === curEnv ? 'selected' : ''}>{env}</li>
            );
          })}
        </ul>
        <Link to="/" className="navbar-logo">Rabadaba Dashboard</Link>
        <ul className="navbar-menu">
          <li className="navbar-menu-item-wrap">
            <div className="navbar-menu-item">
              {isIndexPage ? 'entity' : curEntity}
              <i className="caret"></i>
            </div>
            <ul className="navbar-submenu">
              {_.map(state.entities, value => {
                return (
                  <li key={value}>
                    <Link to={`/${curEnv}/stats/${value}`} onClick={this.entitySelectHandler}>{value}</Link>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </nav>
    );
  }
}

export default Navbar;
