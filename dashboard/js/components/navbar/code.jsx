'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Link } from 'react-router';
import * as storage from 'modules/storage';
import * as _ from 'underscore';

import 'components/navbar/style';

class Navbar extends React.Component {
  state = {
    entities: [
      'articles'
    ]
  };
  entitySelectHandler() {
    storage.set('entity', this.children);
  }
  render() {
    var state = this.state,
      location = window.location.hash,
      curEntity = storage.get('entity'),
      isIndexPage = /^#\/\?.+$/.test(location);

    return (
      <nav className="navbar">
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
                    <Link to={`/stats/${value}`} onClick={this.entitySelectHandler}>{value}</Link>
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
