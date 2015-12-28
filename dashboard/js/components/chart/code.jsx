'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Chartist from 'chartist';

import 'components/chart/style';
import 'chartistCSS/chartist.scss';

class Chart extends React.Component {
  static propTypes = {
    gran: React.PropTypes.string,
    data: React.PropTypes.array
  };
  normalizeTime(time) {
    if (time < 10) {
      time = `0${time}`;
    }
    return time;
  }
  getLabelText = (date) => {
    date = new Date(date);
    var gran = this.props.gran,
      text;

    if (gran.indexOf('hour') !== -1 || gran.indexOf('day') !== -1) {
      text = `${this.normalizeTime(date.getHours())}:${this.normalizeTime(date.getMinutes())}`;
    } else if (gran.indexOf('week') !== -1) {
      text = date.toUTCString().slice(0, 3);
    }
    return text;
  };
  update() {
    var data = this.props.data,
      chartData = {
        labels: [],
        series: [[]]
      };

    for (let i = 0, l = data.length; i < l; i++) {
      let label = '';
      if (i === 0 || i === Math.floor(l / 2) || i === l - 1) {
        label = this.getLabelText(data[i][0]);
      }
      chartData.labels.push(label);
      chartData.series[0].push(data[i][1]);
    }

    new Chartist.Line(ReactDOM.findDOMNode(this), chartData, {
      low: 0,
      height: 200,
      showArea: true,
      showPoint: false,
      fullWidth: true,
      lineSmooth: Chartist.Interpolation.cardinal({
        tension: 0
      }),
      axisX: {
        labelOffset: {
          x: -13,
          y: 0
        }
      },
      axisY: {
        onlyInteger: true
      },
      chartPadding: {
        top: 15,
        right: 15,
        bottom: 5,
        left: 0
      }
    });
  }
  componentDidUpdate = this.update;
  componentDidMount = this.update;
  render() {
    var props = this.props,
      cl = 'ct-chart chart ' + props.type;

    return (
      <div className={cl}></div>
    );
  }
}

export default Chart;
