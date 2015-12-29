'use strict';

exports = module.exports = [
  `CREATE TABLE keywords (
    id serial NOT NULL,
    article_id smallserial NOT NULL,
    phrase character varying(512),
    cdate timestamp without time zone DEFAULT now(),
    type character varying(30),
    CONSTRAINT keywords_pkey PRIMARY KEY (id),
    CONSTRAINT article_id FOREIGN KEY (article_id)
        REFERENCES articles (id) MATCH SIMPLE
        ON UPDATE NO ACTION ON DELETE NO ACTION
  ) WITH (
    OIDS=FALSE
  );`,

  `ALTER TABLE keywords OWNER TO postgres;`,

  `CREATE INDEX keywords_phrase_idx ON keywords USING btree (phrase COLLATE pg_catalog."default");`
];