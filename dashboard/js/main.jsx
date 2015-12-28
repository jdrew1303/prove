'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Router, Route } from 'react-router';
import Navbar from 'components/navbar/code';
import Stats from 'components/stats/code';
import Logs from 'components/logs/code';
import Dashboard from 'components/dashboard/code';

import 'css/basic';

class App extends React.Component {
  static propTypes = {
    children: React.PropTypes.node
  };
  render() {
    return (
      <div>
        <Navbar />
        <div id="content">
          {this.props.children ? this.props.children : <Dashboard />}
        </div>
      </div>
    );
  }
}

document.addEventListener('DOMContentLoaded', function() {
  ReactDOM.render(
    <Router>
      <Route path="/" component={App}>
        <Route path="/*/stats/*" component={Stats} /> {/* /prod/stats/users */}
        <Route path="/*/logs/*/*/*" component={Logs} /> {/* /prod/logs/users/progress/last_hour */}
      </Route>
    </Router>,
    document.getElementById('wrap')
  );
});
