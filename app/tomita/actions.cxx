#encoding "utf-8"

Pred -> Prep | Adj;

ProperName -> Word<h-reg1> (Word<h-reg1>) (Word<h-reg1>);

NounOrName -> Noun | ProperName;

FullPhrase -> (Pred) NounOrName (Word) Verb Word* NounOrName;

S -> FullPhrase interp (Action.Field1::not_norm);