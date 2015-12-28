'use strict';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Link } from 'react-router';
import * as _ from 'underscore';

import 'components/pager/style';

class Pager extends React.Component {
  render() {
    var props = this.props,
      data = props.data,
      location = window.location.hash,
      href = location.replace(/^#(\/[^?]+)\?.+$/, '$1'),
      pagesLength,
      curPage,
      start, finish,
      maxPages = 10,
      pages = [];

    if (data) {
      pagesLength = Math.ceil(data.total / data.per_page);
      curPage = data.page;
      start = curPage - 5;
      if (start < 1) {
        start = 1;
      }
      finish = curPage + 5;
      if (finish > pagesLength) {
        finish = pagesLength;
      }
      for (var i = start, l = finish; i <= l; i++) {
        pages.push(i);
      }
      while (pages.length < maxPages + 1 && start > 1) {
        pages.unshift(--start);
      }
      while (pages.length < maxPages + 1 && finish < pagesLength) {
        pages.push(++finish);
      }
    }

    return (
      data ?
        <ul className="pager">
          {curPage > maxPages / 2 + 1 ?
            <li>
              <Link to={href + '?page=1'} className="first">First</Link>
            </li>
            : null
          }
          {_.map(pages, page => {
            return (
              <li key={page} className={curPage === page ? 'current' : ''}>
                <Link to={href + '?page=' + page}>{page}</Link>
              </li>
            );
          })}
          {pagesLength > maxPages && pagesLength - curPage > maxPages / 2 ?
            <li>
              <Link to={href + '?page=' + pagesLength} className="last">Last</Link>
            </li>
            : null
          }
        </ul> : null
    );
  }
}

export default Pager;
