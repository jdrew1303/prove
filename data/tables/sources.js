'use strict';

exports = module.exports = [
  `CREATE TABLE sources (
    id serial NOT NULL,
    name character varying(20),
    trust_index smallserial NOT NULL,
    website character varying(30),
    cdate timestamp without time zone DEFAULT now(),
    CONSTRAINT sources_pkey PRIMARY KEY (id),
    CONSTRAINT sources_name_key UNIQUE (name)
  ) WITH (
    OIDS=FALSE
  );`,

  `ALTER TABLE sources OWNER TO postgres;`
];