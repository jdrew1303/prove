'use strict';

exports = module.exports = [
  `CREATE TABLE sources (
    id serial NOT NULL,
    name character varying(50),
    trust_index smallserial NOT NULL,
    website character varying(50),
    cdate timestamp without time zone DEFAULT now(),
    CONSTRAINT sources_pkey PRIMARY KEY (id),
    CONSTRAINT sources_name_key UNIQUE (name)
  ) WITH (
    OIDS=FALSE
  );`,

  `ALTER TABLE sources OWNER TO postgres;`,

  `INSERT INTO sources (name, trust_index, website) VALUES ('meduza', 100, 'https://meduza.io/');`,
  `INSERT INTO sources (name, trust_index, website) VALUES ('chaskor', 100, 'http://www.chaskor.ru/');`
];