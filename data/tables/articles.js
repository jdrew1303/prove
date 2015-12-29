'use strict';

exports = module.exports = [
  `CREATE TABLE articles (
    id serial NOT NULL,
    source_id smallserial NOT NULL,
    url character varying(512),
    text text,
    title character varying(512),
    published timestamp without time zone,
    cdate timestamp without time zone DEFAULT now(),
    CONSTRAINT articles_pkey PRIMARY KEY (id),
    CONSTRAINT source_id FOREIGN KEY (source_id)
    REFERENCES sources (id) MATCH SIMPLE
    ON UPDATE NO ACTION ON DELETE NO ACTION
  ) WITH (
    OIDS=FALSE
  );`,

  `ALTER TABLE articles OWNER TO postgres;`
];