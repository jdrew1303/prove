#encoding "utf-8"

Words -> Word<h-reg1>+;

Quoted -> Words<quoted>;
English -> Words<lat>;

Phrase -> Quoted | English;
S -> Phrase interp (Companies.Field1::not_norm);